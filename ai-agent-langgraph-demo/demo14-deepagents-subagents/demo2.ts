import { HumanMessage } from '@langchain/core/messages';
import { tool } from '@langchain/core/tools';
import { CompiledSubAgent, createDeepAgent } from 'deepagents';
import { createAgent } from 'langchain';
import { z } from 'zod';
import { model } from './model.js';

/**
 * SubAgent 的自定义创建（CompiledSubAgent）与调用观察（对应 Python 课件两页内容）：
 *
 * 1. 除了基本的字典形式创建之外，还可以通过 createAgent 函数，外部创建独立
 *    子代理后，通过 CompiledSubAgent 传入主代理中，以此实现更灵活、针对性
 *    配置的子代理功能——例如为子代理单独配置中间件、checkpointer、
 *    responseFormat 等任何 createAgent 支持的参数。
 *
 * 2. 创建步骤：
 *    1. 创建子代理：createAgent({ model, tools, systemPrompt }) 得到独立
 *       compiled graph；
 *    2. 配置子代理：包一层 CompiledSubAgent——name（task 工具中的选择标识）、
 *       description（展示给模型的选取说明）、runnable（第 1 步的 graph）；
 *    3. 传入子代理：createDeepAgent({ subagents: [customSubagent] })。
 *
 * 3. mode 选项：`"handoff"`（默认）完全上下文隔离；`"fork"` 继承父代理的
 *    对话历史（但 system prompt 以 runnable 内置的为准）。
 *
 * 4. 调用与观察：调用方法与传统 Agent 完全相同。观察主代理发出的 tool_call：
 *    { name: 'task', args: { description: ..., subagent_type: 'internet-agent' } }
 *    —— subagent_type 即 CompiledSubAgent 的 name。
 *
 * 5. general-purpose SubAgent：任何 DeepAgent 创建时会自动配备的 SubAgent
 *    （描述为"研究复杂问题、搜索文件与内容、执行多步任务"的通用代理），
 *    即使不声明 subagents 也可以通过 task 工具调用。
 */

// 联网搜索工具（模拟实现）
const internetSearch = tool(
  ({ query }) =>
    `（模拟搜索结果）关于「${query}」：LangChain（JS 版）当前最新版本为 v1.5.10。`,
  {
    name: 'internet_search',
    description: '针对特定查询执行互联网搜索。',
    schema: z.object({ query: z.string().describe('搜索关键词') }),
  },
);

// ---------- 第 1 步：创建子代理（createAgent 外部独立创建） ----------
const customGraph = createAgent({
  model,
  tools: [internetSearch],
  systemPrompt: 'You are a great Internet searcher.',
});

// ---------- 第 2 步：配置子代理（CompiledSubAgent 包装） ----------
const customSubagent: CompiledSubAgent = {
  name: 'internet-agent',
  description: 'A specialised agent for gathering information via web searches',
  runnable: customGraph,
};

// ---------- 第 3 步：传入子代理 ----------
// 主代理不持有 internet_search（课件中主代理也可以持有同名工具由模型自主
// 决定是否亲自搜索；此处刻意不给，以便强制观察 task 委派行为）。
const agent = createDeepAgent({
  model,
  subagents: [customSubagent],
});

/** 读取 Agent 最终回复文本。 */
function finalText(result: unknown): string {
  const messages = (result as { messages?: Array<{ text?: string }> })
    .messages;
  return messages?.at(-1)?.text ?? '(无回复)';
}

/** 打印本轮所有 task（子代理调用）的委派参数，观察 subagent_type。 */
function printTaskCalls(result: unknown): void {
  const messages = (result as {
    messages?: Array<{ tool_calls?: Array<{ name: string; args: unknown }> }>;
  }).messages;
  const calls = messages?.flatMap((m) => m.tool_calls ?? []) ?? [];
  const taskCalls = calls.filter((c) => c.name === 'task');
  console.log(`\n--- task（子代理调用）共 ${taskCalls.length} 次 ---`);
  for (const c of taskCalls) {
    console.log(JSON.stringify(c.args));
  }
}

async function main(): Promise<void> {
  console.log('===== SubAgent CompiledSubAgent 自定义创建与调用观察 =====');
  console.log('问：进行网络搜索获取 LangChain（JS 版）框架的最新版本号。\n');

  const result = await agent.invoke({
    messages: [
      new HumanMessage('进行网络搜索获取 LangChain（JS 版）框架的最新版本号。'),
    ],
  });

  printTaskCalls(result);
  console.log(`\n最终回复：${finalText(result)}`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`\nDemo 执行失败：${message}`);
  process.exitCode = 1;
});
