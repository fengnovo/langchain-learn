import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { tool } from '@langchain/core/tools';
import { createDeepAgent } from 'deepagents';
import { createMiddleware, llmToolSelectorMiddleware } from 'langchain';
import { z } from 'zod';
import { model, selectorModel } from './model.js';

/**
 * 上下文工程策略②：选择（Select）（对应 Python 课件四象限内容）：
 *
 * 核心理念：在海量信息中精准定位最相关的内容，将最具价值信息加入上下文窗口。
 *
 * 在 DeepAgents / LangChain 中落地四个象限：
 *
 * 1. 草稿的选择（Scratchpads select）：文件工具实现——Agent 通过 ls /
 *    read_file / grep 工具按需选择调用；状态对象实现——开发者用中间件精细
 *    控制向 Agent 暴露哪些内容（本例：截断超长工具结果，只保留头部摘要）。
 *
 * 2. 记忆的选择（memory select）：选择任务相关记忆，确保高相关性——
 *    instruction 作为程序记忆。DeepAgents 内置 memory 参数（AGENTS.md），
 *    启动时加载进系统提示（本例注入"中文回复 + 表格呈现"的偏好）。
 *
 * 3. 工具选择（tool select）：工具过多时只获取与任务相关的工具——用
 *    LangChain 的 llmToolSelectorMiddleware 基于模型选择工具（maxTools 限定
 *    数量，避免工具描述撑爆上下文）。
 *
 * 4. 知识的选择（Knowledge select）：结合多种技术（嵌入搜索、知识图谱检索、
 *    重排序等）更准确高效地运用 RAG 辅助任务完成。本例用关键词检索的
 *    极简 RAG 中间件演示"检索 → 注入上下文"的 select 流水线。
 */

// ---------- 知识的选择：极简关键词 RAG（检索相关知识并注入） ----------
const knowledgeBase: Record<string, string> = {
  langgraph:
    'LangGraph 是 LangChain 的底层编排框架，以「状态图（StateGraph）」为核心：节点执行逻辑、边定义流转，支持循环、分支与人机协同，适合需要精细控制流程的场景。',
  deepagents:
    'DeepAgents 构建在 LangGraph 之上，通过内置中间件（规划、文件系统、子代理、摘要）提供开箱即用的深度代理能力，适合复杂长程任务，不必手写编排。',
};

const knowledgeSelectMiddleware = createMiddleware({
  name: 'KnowledgeSelectMiddleware',
  wrapModelCall: (request, handler) => {
    // 仅检索与最新用户问题相关的知识（相关性 select）
    const lastUser = [...request.messages]
      .reverse()
      .find((m) => HumanMessage.isInstance(m));
    const query = typeof lastUser?.content === 'string' ? lastUser.content : '';
    const hits = Object.entries(knowledgeBase).filter(([key]) =>
      query.toLowerCase().includes(key),
    );
    if (hits.length === 0) return handler(request);

    console.log(
      `[知识选择] 命中 ${hits.length} 篇知识（${hits.map(([k]) => k).join(', ')}），注入上下文`,
    );
    const injected = new SystemMessage(
      `以下是检索到的相关知识，请优先依据其作答：\n${hits.map(([, v]) => `- ${v}`).join('\n')}`,
    );
    return handler({ ...request, messages: [injected, ...request.messages] });
  },
});

// ---------- 草稿的选择（状态对象精细控制）：截断超长工具结果 ----------
const TRUNCATE_AT = 120;

const scratchpadSelectMiddleware = createMiddleware({
  name: 'ScratchpadSelectMiddleware',
  wrapModelCall: (request, handler) => {
    let saved = 0;
    const messages = request.messages.map((m) => {
      // 只压缩 ToolMessage（工具产出的"草稿"），其余消息原样保留
      const isTool = 'tool_call_id' in m;
      const text = typeof m.content === 'string' ? m.content : '';
      if (isTool && text.length > TRUNCATE_AT) {
        saved += text.length - TRUNCATE_AT;
        return new (Object.getPrototypeOf(m).constructor)({
          ...m,
          content:
            text.slice(0, TRUNCATE_AT) +
            `\n…[已按 select 策略截断，完整内容可用 read_file 按需读取]`,
        });
      }
      return m;
    });
    if (saved > 0) {
      console.log(
        `[草稿选择] 压缩超长工具结果，上下文减少约 ${saved} 字符（下次可按需读取全文）`,
      );
    }
    return handler({ ...request, messages });
  },
});

// ---------- 工具池（6 个工具，其中只有 2 个与问题相关） ----------
const getFrameworkInfo = tool(
  () =>
    'LangGraph StateGraph 详解（长文档）：StateGraph 通过 addNode 注册节点、addEdge 定义流转、compile 编译执行；' +
    '支持条件边实现分支、循环边实现迭代、interrupt 实现人机协同；状态通过 Channel 在节点间传递，' +
    'reducer 决定合并策略；……（此处省略 600 字 API 细节、示例代码与FAQ）……',
  {
    name: 'get_framework_info',
    description: '查询 LangChain/LangGraph/DeepAgents 框架的详细文档。',
    schema: z.object({ topic: z.string().describe('文档主题') }),
  },
);

const getWeather = tool(
  ({ city }) => `${city}：晴，26°C（模拟数据）`,
  {
    name: 'get_weather',
    description: '查询城市天气。',
    schema: z.object({ city: z.string() }),
  },
);

const sendEmail = tool(
  ({ to }) => `已发送邮件到 ${to}（模拟）`,
  {
    name: 'send_email',
    description: '发送电子邮件。',
    schema: z.object({ to: z.string().describe('收件人') }),
  },
);

const writeNote = tool(
  ({ text }) => `已记录：${text}`,
  {
    name: 'write_note',
    description: '把一段文字记录到笔记。',
    schema: z.object({ text: z.string() }),
  },
);

const convertCurrency = tool(
  ({ amount }) => `≈ $${(amount / 7.2).toFixed(2)}（模拟汇率）`,
  {
    name: 'convert_currency',
    description: '人民币换算美元。',
    schema: z.object({ amount: z.number() }),
  },
);

const rollDice = tool(
  () => `骰子点数：${1 + Math.floor(Math.random() * 6)}`,
  {
    name: 'roll_dice',
    description: '掷一个六面骰。',
    schema: z.object({}),
  },
);

// ---------- 组装 DeepAgent：四个 select 象限一次装配 ----------
const agent = createDeepAgent({
  model,
  tools: [
    getFrameworkInfo,
    getWeather,
    sendEmail,
    writeNote,
    convertCurrency,
    rollDice,
  ],
  // 记忆的选择：内置 memory 参数——启动时加载 AGENTS.md 注入系统提示
  // （instruction 作为程序记忆；配合 StateBackend，AGENTS.md 由 invoke 时
  // 的 files 状态提供）
  memory: ['/AGENTS.md'],
  middleware: [
    knowledgeSelectMiddleware, // 知识的选择（RAG select）
    scratchpadSelectMiddleware, // 草稿的选择（状态对象精细控制）
    llmToolSelectorMiddleware({
      model: selectorModel, // 工具选择：基于模型挑选相关工具
      maxTools: 2, // 只保留最多 2 个相关工具
    }),
  ],
});

/** 读取 Agent 最终回复文本。 */
function finalText(result: unknown): string {
  const messages = (result as { messages?: Array<{ text?: string }> })
    .messages;
  return messages?.at(-1)?.text ?? '(无回复)';
}

/** 打印本轮实际用到的工具名（验证工具选择效果）。 */
function printUsedTools(result: unknown): void {
  const messages = (result as {
    messages?: Array<{ tool_calls?: Array<{ name: string }> }>;
  }).messages;
  const used =
    messages?.flatMap((m) => (m.tool_calls ?? []).map((c) => c.name)) ?? [];
  console.log(`[工具选择] 实际调用的工具：${used.join(', ') || '(无)'}`);
}

async function main(): Promise<void> {
  console.log('===== 策略②选择：记忆选择 + 知识选择 + 草稿选择 + 工具选择 =====');
  console.log(
    '问：请介绍 LangGraph 中 StateGraph 的用法，并说明它和 DeepAgents 的关系；顺便查一下上海天气。\n',
  );

  // AGENTS.md：记忆的选择——instruction 作为程序记忆（偏好注入）
  const res = await agent.invoke({
    messages: [
      new HumanMessage(
        '请介绍 LangGraph 中 StateGraph 的用法，并说明它和 DeepAgents 的关系；顺便查一下上海今天的天气。',
      ),
    ],
    files: {
      '/AGENTS.md': {
        content: [
          '# 用户偏好（长期记忆 / 程序记忆）',
          '- 始终用中文回复',
          '- 结论优先用 Markdown 表格呈现',
        ],
        created_at: new Date().toISOString(),
        modified_at: new Date().toISOString(),
      },
    },
  });

  printUsedTools(res);
  console.log(`\n最终回复：${finalText(res)}`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`\nDemo 执行失败：${message}`);
  process.exitCode = 1;
});
