import { HumanMessage } from '@langchain/core/messages';
import { tool } from '@langchain/core/tools';
import { createDeepAgent, type SubAgent } from 'deepagents';
import { z } from 'zod';
import { model } from './model.js';

/**
 * 子代理生成（Subagent spawning / Delegate work）—— DeepAgent 核心能力之三：
 *
 * 1. 概念：DeepAgent 内置的 "task" 工具，使代理能够针对性地生成子代理以实现
 *    上下文隔离。这样可以让主代理的上下文保持干净，同时又能深入处理子任务
 *    （子代理执行产生的海量中间过程只留在子代理自己的上下文中，只有最终
 *    结论以 ToolMessage 形式返回主代理）。
 *
 * 2. 创建：在 createDeepAgent 的 subagents 参数中传入子代理规格列表，每个
 *    子代理可配置：
 *    - name：task 工具中选择该子代理的标识符；
 *    - description：展示给模型、用于子代理选择的说明；
 *    - systemPrompt：子代理自己的系统提示（上下文隔离，默认看不到主代理对话）；
 *    - tools：子代理可用的工具（工具对象，不传则使用默认工具）；
 *    - model / middleware / interruptOn 等：均可与主代理不同。
 *    子代理自动获得默认中间件栈（file system、Summarization 等），
 *    因此子代理与主代理共享文件系统状态——上下文隔离但「记忆」互通。
 *
 * 3. 调用：主代理根据子代理的 name/description 自主决定把子任务通过 task
 *    工具委托给哪个子代理；本示例观察「主编 → 研究员/撰稿人」的委托流程：
 *    主代理不再亲自搜索和写作，而是分派任务并汇总结果。
 */

// 用户赋予的额外工具：联网搜索（模拟实现）
const internetSearch = tool(
  ({ query }) =>
    `（模拟搜索结果）关于「${query}」：\n` +
    `1. 上下文隔离：子代理的中间过程（多轮搜索、阅读）不会进入主代理上下文；\n` +
    `2. 文件系统共享：子代理写入的文件主代理可以直接读取；\n` +
    `3. 适用场景：需要大量中间探索步骤的研究、分析类子任务。`,
  {
    name: 'internet_search',
    description: '针对特定查询执行互联网搜索。',
    schema: z.object({ query: z.string().describe('搜索关键词') }),
  },
);

// 子代理一：研究员——只负责检索，产出要点清单
const researcher: SubAgent = {
  name: 'researcher',
  description: '负责针对给定主题开展联网调研，输出关键要点清单。',
  systemPrompt:
    '你是一名严谨的研究员。使用 internet_search 检索用户交给你的主题，' +
    '并把要点清单（3-5 条，每条一句话）写入文件 findings.md，' +
    '最后在回复中给出要点清单。',
  tools: [internetSearch],
};

// 子代理二：撰稿人——基于研究员的结论撰写报告（使用内置文件系统工具读取 findings.md）
const writer: SubAgent = {
  name: 'writer',
  description: '负责根据调研要点撰写精炼的正式报告。',
  systemPrompt:
    '你是一名技术撰稿人。先用 read_file 读取 findings.md 中的调研要点，' +
    '据此撰写一份 200 字以内的精炼报告，写入文件 report.md，' +
    '最后在回复中给出报告全文。',
};

/**
 * 创建带子代理的 DeepAgent：
 * - 主代理不直接持有 internet_search（检索能力下沉到 researcher 子代理）；
 * - subagents 列表中的子代理可通过内置 task 工具按 name 调用；
 * - 未传 backend 时使用默认 StateBackend，文件在主/子代理间共享。
 */
const agent = createDeepAgent({
  model,
  systemPrompt:
    '你是研究主编。遇到调研类需求时，先通过 task 工具委托 researcher 调研，' +
    '再委托 writer 撰写报告，不要亲自检索或撰写。',
  subagents: [researcher, writer],
});

/** 读取 Agent 最终回复文本。 */
function finalText(result: unknown): string {
  const messages = (result as { messages?: Array<{ text?: string }> })
    .messages;
  return messages?.at(-1)?.text ?? '(无回复)';
}

/** 统计本轮执行中 task 工具（子代理调用）被调用的次数。 */
function countTaskCalls(result: unknown): number {
  const messages = (result as { messages?: Array<{ tool_calls?: unknown[] }> })
    .messages;
  return (
    messages?.filter((m) => m.tool_calls?.some((c) => (c as { name?: string })?.name === 'task')).length ?? 0
  );
}

async function main(): Promise<void> {
  console.log('===== DeepAgent 子代理生成：主编委托 researcher / writer 协作 =====');
  console.log('问：请调研 DeepAgents 的子代理机制并产出报告。\n');

  const result = await agent.invoke({
    messages: [new HumanMessage('请调研 DeepAgents 的子代理机制并产出一份报告。')],
  });

  console.log(`task（子代理调用）次数：${countTaskCalls(result)}`);
  console.log(`最终回复：${finalText(result)}`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`\nDemo 执行失败：${message}`);
  process.exitCode = 1;
});
