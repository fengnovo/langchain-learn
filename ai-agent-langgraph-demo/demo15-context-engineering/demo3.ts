import type { BaseMessage } from '@langchain/core/messages';
import { AIMessage, HumanMessage, ToolMessage } from '@langchain/core/messages';
import { tool } from '@langchain/core/tools';
import { createDeepAgent } from 'deepagents';
import { createMiddleware, summarizationMiddleware } from 'langchain';
import { z } from 'zod';
import { model } from './model.js';

/**
 * 上下文工程策略③：压缩（Compress）（对应 Python 课件内容）：
 *
 * 核心理念：只保留后续任务所需上下文信息，减轻 token 压力；
 * 需要在「信息保留度」和「token 效率」之间找到最佳平衡点。
 *
 * 两种典型实现在 DeepAgents 中落地：
 *
 * 1. 总结（Summarization）：把旧的上下文内容精炼为总结性文本，减少知识
 *    交接时的 token 数量。要点：冗余识别与去重、对话轨迹总结、决策点保留。
 *    LangChain 预制 summarizationMiddleware 属于 before_model 钩子——每次
 *    模型调用前检查触发条件（trigger），达标时自动把较旧消息替换为一条
 *    "Here is a summary of the conversation so far..." 的摘要消息，
 *    只保留最近 keep 条消息继续任务。
 *
 * 2. 修剪（Trimming）：直接删除低价值信息，保留任务相关信息。典型实现：
 *    - 时间衰减策略：越旧的信息保留优先级越低（本例按消息位置线性衰减）；
 *    - 重要性评分：关键决策/结论高分保留，冗长工具输出低分删除
 *      （生产中可用模型评估每条信息的重要性，本例用规则化评分演示）。
 *    注意：修剪必须成组删除——AIMessage(tool_calls) 与其对应 ToolMessage
 *    必须同删同留，否则 OpenAI 接口会因 tool_call 配对残缺而报错。
 */

// ---------- 模拟工具：返回冗长结果（制造上下文压力） ----------
const internetSearch = tool(
  ({ query }) =>
    `（模拟搜索·完整网页）关于「${query}」的检索结果页：\n` +
    `DeepAgents 内置规划、文件系统、子代理、摘要等中间件，构建在 LangGraph 之上。`.repeat(
      8,
    ) +
    `\n……（此处省略数千字网页正文、广告与导航栏）`,
  {
    name: 'internet_search',
    description: '联网搜索资讯，返回完整检索页面。',
    schema: z.object({ query: z.string().describe('搜索关键词') }),
  },
);

// =====================================================================
// 场景一：总结（Summarization）—— 达到阈值自动把旧消息压缩为摘要
// =====================================================================
const summarizeAgent = createDeepAgent({
  model,
  tools: [internetSearch],
  middleware: [
    summarizationMiddleware({
      model, // 负责生成摘要的模型
      trigger: { messages: 6 }, // 消息数达到 6 条触发摘要
      keep: { messages: 3 }, // 摘要后保留最近 3 条消息
    }),
  ],
});

// =====================================================================
// 场景二：修剪（Trimming）—— 自定义中间件：时间衰减 + 重要性评分
// =====================================================================

/** 修剪参数：最近 N 条消息始终保留（越新越重要）；首条用户任务始终保留。 */
const KEEP_RECENT = 2;

/** 一「组」消息：AIMessage(tool_calls) 及其随后的配对 ToolMessage，或单条独立消息。 */
interface MessageGroup {
  start: number;
  end: number;
  messages: BaseMessage[];
}

/** 把消息列表按 tool_call 配对关系分组，保证删除不会拆散配对。 */
function buildGroups(messages: BaseMessage[]): MessageGroup[] {
  const groups: MessageGroup[] = [];
  let i = 0;
  while (i < messages.length) {
    const current = messages[i]!;
    const toolCalls =
      'tool_calls' in current ? ((current as AIMessage).tool_calls ?? []) : [];
    if (toolCalls.length > 0) {
      const pendingIds = new Set(
        toolCalls.map((c) => c.id).filter((id): id is string => !!id),
      );
      let j = i + 1;
      while (
        j < messages.length &&
        ToolMessage.isInstance(messages[j]!) &&
        pendingIds.has((messages[j] as ToolMessage).tool_call_id)
      ) {
        pendingIds.delete((messages[j] as ToolMessage).tool_call_id);
        j += 1;
      }
      groups.push({ start: i, end: j - 1, messages: messages.slice(i, j) });
      i = j;
    } else {
      groups.push({ start: i, end: i, messages: [current] });
      i += 1;
    }
  }
  return groups;
}

/** 重要性评分：决策点/用户任务高分，冗长工具输出低分。 */
function groupImportance(group: MessageGroup): number {
  let score = 0;
  for (const message of group.messages) {
    const text = typeof message.content === 'string' ? message.content : '';
    if (ToolMessage.isInstance(message) && text.length > 150) {
      score -= 2; // 冗长工具输出：低价值（可按需重新获取）
    }
    if (AIMessage.isInstance(message) && /关键|决定|结论|总结/.test(text)) {
      score += 3; // 决策点保留：关键结论/决策是后续任务的上下文线索
    }
    if (HumanMessage.isInstance(message)) {
      score += 4; // 用户任务本身：最高优先级
    }
  }
  return score;
}

const trimmingMiddleware = createMiddleware({
  name: 'TrimmingMiddleware',
  wrapModelCall: (request, handler) => {
    const messages = request.messages;
    const groups = buildGroups(messages);

    const kept: BaseMessage[] = [];
    const removed: string[] = [];
    let savedChars = 0;

    groups.forEach((group, index) => {
      const inRecentWindow = group.end >= messages.length - KEEP_RECENT;
      const isTaskAnchor = index === 0; // 首条用户任务始终保留
      // 时间衰减：消息越旧衰减越多（线性），越新越不容易被删
      const recencyBonus = (group.end / Math.max(1, messages.length - 1)) * 3 - 1.5;
      const score = groupImportance(group) + recencyBonus;

      if (inRecentWindow || isTaskAnchor || score >= 0) {
        kept.push(...group.messages);
      } else {
        const preview =
          (typeof group.messages[0]!.content === 'string'
            ? group.messages[0]!.content
            : ''
          ).slice(0, 30).replace(/\s+/g, ' ');
        removed.push(`[${index}] ${preview}…`);
        savedChars += group.messages.reduce(
          (sum, m) => sum + (typeof m.content === 'string' ? m.content.length : 0),
          0,
        );
      }
    });

    console.log(
      `[修剪] 模型可见消息 ${messages.length} 条 → ${kept.length} 条` +
        (removed.length
          ? `，删除低价值组：${removed.join('；')}，节省约 ${savedChars} 字符`
          : '（无需删除）'),
    );
    return handler({ ...request, messages: kept });
  },
});

const trimmingAgent = createDeepAgent({
  model,
  middleware: [trimmingMiddleware],
  systemPrompt: '你是简洁的助理，只依据上下文回答，不要调用文件工具。',
});

/** 打印消息列表概览。 */
function printMessages(label: string, messages: BaseMessage[]): void {
  console.log(`${label}（共 ${messages.length} 条）`);
  for (const [index, message] of messages.entries()) {
    const text = message.text.replace(/\s+/g, ' ').slice(0, 70);
    console.log(
      `  [${index}] [${message.type}] ${text}${message.text.length > 70 ? '…' : ''}`,
    );
  }
}

/** 构造带冗长工具输出的预置历史（6 条，触发 Summarization 阈值）。 */
function buildSummarizationHistory(): BaseMessage[] {
  return [
    new HumanMessage('帮我调研 DeepAgents 的核心能力，之后我会让你基于调研写总结。'),
    new AIMessage({
      content: '',
      tool_calls: [
        {
          name: 'internet_search',
          args: { query: 'DeepAgents 核心能力' },
          id: 'call_1',
          type: 'tool_call',
        },
      ],
    }),
    new ToolMessage({
      content:
        `（模拟搜索·完整网页）DeepAgents 核心能力：规划、文件系统、子代理、摘要。`.repeat(
          8,
        ) + '\n……（省略数千字网页正文）',
      tool_call_id: 'call_1',
    }),
    new AIMessage({
      content: '',
      tool_calls: [
        {
          name: 'internet_search',
          args: { query: 'DeepAgents 与 LangChain 关系' },
          id: 'call_2',
          type: 'tool_call',
        },
      ],
    }),
    new ToolMessage({
      content:
        `（模拟搜索·完整网页）DeepAgents 构建在 LangGraph 之上，以状态图编排，通过中间件扩展。`.repeat(
          8,
        ) + '\n……（省略数千字网页正文）',
      tool_call_id: 'call_2',
    }),
    new HumanMessage('基于以上调研，用一句话写出结论。'),
  ];
}

async function main(): Promise<void> {
  // ----- 场景一：总结（Summarization）-----
  console.log('===== 策略③压缩：总结（Summarization，trigger=6 / keep=3）=====');
  const history = buildSummarizationHistory();
  printMessages('调用前消息列表', history);

  const result = await summarizeAgent.invoke({ messages: history });
  printMessages('\n调用后消息列表', result.messages);
  const summarized = result.messages[0]!.text.toLowerCase().includes('summary');
  console.log(
    `\n较旧消息已压缩为摘要消息：${summarized ? '是（列表以 "Here is a summary..." 开头，冗长的工具输出被摘要替代）' : '否'}`,
  );

  // ----- 场景二：修剪（Trimming，时间衰减 + 重要性评分）-----
  console.log('\n===== 策略③压缩：修剪（Trimming，时间衰减 + 重要性评分）=====');
  const trimmingHistory: BaseMessage[] = [
    new HumanMessage('任务：为定价功能选型支付服务商。'),
    new AIMessage({
      content: '',
      tool_calls: [
        {
          name: 'internet_search',
          args: { query: '支付服务商对比' },
          id: 'call_t1',
          type: 'tool_call',
        },
      ],
    }),
    new ToolMessage({
      content:
        `（模拟搜索·完整网页）各支付服务商费率、结算周期、接口文档等详细信息。`.repeat(
          10,
        ) + '\n……（省略数千字对比表格）',
      tool_call_id: 'call_t1',
    }),
    new AIMessage('中间发现：服务商 B 的接口费率最低。关键决定：采用方案 B。'),
    new AIMessage({
      content: '',
      tool_calls: [
        {
          name: 'internet_search',
          args: { query: '方案 B 接入成本' },
          id: 'call_t2',
          type: 'tool_call',
        },
      ],
    }),
    new ToolMessage({
      content: '方案 B 一次性接入成本约 2 人日。',
      tool_call_id: 'call_t2',
    }),
    new HumanMessage('请基于上面的关键决定，一句话说明下一步。'),
  ];
  printMessages('调用前消息列表', trimmingHistory);
  console.log('（预期：冗长的搜索结果组被删除；"关键决定"组被保留）\n');

  const trimmingResult = await trimmingAgent.invoke({
    messages: trimmingHistory,
  });
  console.log(`\n最终回复：${trimmingResult.messages.at(-1)!.text}`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`\nDemo 执行失败：${message}`);
  process.exitCode = 1;
});
