import { HumanMessage } from '@langchain/core/messages';
import { tool } from '@langchain/core/tools';
import { createDeepAgent, type SubAgent } from 'deepagents';
import { initChatModel } from 'langchain/chat_models/universal';
import { z } from 'zod';
// 导入主模型的同时，model.js 顶层已 dotenv.config() 加载项目根目录 .env
import { model } from './model.js';

/**
 * 这demo是为了演示 DeepAgent 性能 / 资源控制 3个优化手段
 * DeepAgent 性能 / 资源控制三手段（多子代理、调用数增多时）：
 *
 * 1. recursionLimit（递归 / 超步上限）：LangGraph 图执行的「超步
 *    （super-step）」总数上限，默认 25。主代理 + 嵌套子代理的每一次节点
 *    执行（模型调用、工具调用）都消耗超步，子代理一多、链一长，默认值
 *    可能不够（任务没跑完就被截断）；反过来它也是「保险丝」——设得很小
 *    能在子代理陷入异常循环 / 失控时快速失败，避免无限烧钱。
 *    用法：invoke 的第二个参数 config 里传 { recursionLimit: N }。
 *
 * 2. 精简 systemPrompt：DeepAgent 自带的 BASE_AGENT_PROMPT 已经很长，且
 *    每次模型调用都会带上。主代理 / 子代理的额外 systemPrompt 只写「分工
 *    + 关键流程」，去掉冗余说明，可显著降低每次调用的输入 token 与延迟。
 *
 * 3. 子代理单独配更快的小模型：SubAgent.model 可与主代理不同。检索、
 *    写要点这类相对机械的子任务不必用最强模型——给子代理配一个关思考、
 *    低 maxTokens 的快模型（生产中也可直接传更便宜的模型名字符串，如
 *    'openai:gpt-4o-mini'），主代理仍用全功能模型做统筹，兼顾质量与成本。
 */

function env(name: 'MODEL' | 'OPENAI_API_KEY' | 'OPENAI_BASE_URL'): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`缺少环境变量 ${name}，请先在项目根目录的 .env 中配置。`);
  }
  return value;
}

/**
 * 子代理专用「快模型」：与主模型同源，但关闭思考、压低 maxTokens /
 * timeout / retries——面向检索、写要点等机械子任务，追求快与省。
 * 生产中可直接换成更便宜的模型：model: 'openai:gpt-4o-mini'。
 */
const fastSubModel = await initChatModel(env('MODEL'), {
  modelProvider: 'openai',
  apiKey: env('OPENAI_API_KEY'),
  configuration: { baseURL: env('OPENAI_BASE_URL') },
  temperature: 0.2,
  maxTokens: 800,
  timeout: 60_000,
  maxRetries: 1,
  modelKwargs: { enable_thinking: false },
});

// 用户赋予的额外工具：联网搜索（模拟实现）
const internetSearch = tool(
  ({ query }) =>
    `（模拟搜索结果）关于「${query}」：\n` +
    `1. 要点 A；\n2. 要点 B；\n3. 要点 C。`,
  {
    name: 'internet_search',
    description: '针对特定查询执行互联网搜索。',
    schema: z.object({ query: z.string().describe('搜索关键词') }),
  },
);

// 子代理一：研究员——精简 prompt + 快模型
const researcher: SubAgent = {
  name: 'researcher',
  description: '联网调研给定主题，输出关键要点。',
  model: fastSubModel, // ← 手段 3：子代理用更快的小模型
  // ← 手段 2：systemPrompt 只写职责与产出，不堆冗余说明
  systemPrompt:
    '你是研究员。用 internet_search 检索主题，把 3 条要点写入 findings.md，' +
    '并在回复中给出要点。',
  tools: [internetSearch],
};

// 子代理二：撰稿人——精简 prompt + 快模型
const writer: SubAgent = {
  name: 'writer',
  description: '根据调研要点撰写精炼报告。',
  model: fastSubModel, // ← 手段 3：子代理用更快的小模型
  systemPrompt:
    '你是撰稿人。先 read_file 读 findings.md，据此写 200 字内报告到 report.md，' +
    '并在回复中给出报告全文。',
};

const agent = createDeepAgent({
  model, // 主代理（主编）用全功能模型做统筹
  // ← 手段 2：主代理 prompt 同样精简为「分工 + 流程」一句话
  systemPrompt:
    '你是研究主编。调研任务先用 task 委托 researcher，再委托 writer，' +
    '不要亲自检索或写作。',
  subagents: [researcher, writer],
});

/** 读取 Agent 最终回复文本。 */
function finalText(result: unknown): string {
  const messages = (result as { messages?: Array<{ text?: string }> }).messages;
  return messages?.at(-1)?.text ?? '(无回复)';
}

/** 打印本轮 task 委托链（每次委托的子代理名 + 任务）。 */
function printDelegations(result: unknown): void {
  const messages = (result as {
    messages?: Array<{
      tool_calls?: Array<{ name?: string; args?: Record<string, unknown> }>;
    }>;
  }).messages;
  for (const m of messages ?? []) {
    for (const call of m.tool_calls ?? []) {
      if (call.name === 'task') {
        console.log(
          `  委托 → ${call.args?.subagent_type}：${String(call.args?.description ?? '')}`,
        );
      }
    }
  }
}

function ask(): { messages: HumanMessage[] } {
  return { messages: [new HumanMessage('调研下美国经济并产出一份精炼报告。')] };
}

async function main(): Promise<void> {
  // ===== 场景一：recursionLimit 设得过小 → 触发超步上限（熔断 / 快速失败）=====
  console.log('===== 场景一：recursionLimit = 6（过小，演示递归上限保护）=====');
  try {
    await agent.invoke(ask(), { recursionLimit: 6 });
    console.log('（未触发上限——步数预算内跑完了）');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    // LangGraph 超步耗尽时抛 GraphRecursionError，提示可调大 recursion_limit
    console.log(`已触发超步上限保护（防止子代理链失控）：\n  ${message.split('\n')[0]}`);
  }

  // ===== 场景二：合理 recursionLimit + 子代理快模型 + 精简 prompt，正常跑通 =====
  console.log('\n===== 场景二：recursionLimit = 50 + 子代理快模型 + 精简 prompt =====');
  const result = await agent.invoke(ask(), { recursionLimit: 50 });
  console.log('委托链：');
  printDelegations(result);
  console.log(`\n最终回复：${finalText(result)}`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`\nDemo 执行失败：${message}`);
  process.exitCode = 1;
});
