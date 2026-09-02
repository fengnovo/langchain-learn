import { HumanMessage } from '@langchain/core/messages';
import { tool } from '@langchain/core/tools';
import { createDeepAgent, type SubAgent } from 'deepagents';
import { z } from 'zod';
import { model } from './model.js';

/**
 * SubAgent 的概念与 Dictionary-based 基本创建（对应 Python 课件四页内容）：
 *
 * 1. 概念与逻辑：为子代理来委派工作——在子代理参数中指定子代理的责任与工具。
 *    子代理可以实现上下文隔离，保持主代理上下文的干净；同时子代理也可以更
 *    专注于某一方面任务执行，以提升子任务执行效率与成功率。典型分工（见
 *    课件示意图）：Deep Agent（模型 + 其他工具）通过 task 工具调用——
 *    - 网络搜索 Subagent：发出「查找信息」，只收回「关键信息」
 *      （完整网页留在子代理上下文里）；
 *    - 数据库查询 Subagent：发出「查询数据」，只收回「单一数据」
 *      （完整表单留在子代理上下文里）；
 *    - 数值计算 Subagent：发出「算式」，只收回「计算结果」
 *      （计算过程留在子代理上下文里）。
 *
 * 2. 两种创建方法：子代理应为字典（对象）列表或 CompiledSubAgent 对象——
 *    1) Dictionary-based 基本创建（本文件）；
 *    2) CompiledSubAgent 自定义创建（见 demo2.ts）。
 *
 * 3. 字典形式配置 SubAgent 的参数：
 *    - Required：name（str）、description（str）、systemPrompt（str）、tools（列表）；
 *    - Optional：model（str | BaseChatModel，可给子代理配更廉价/更强的模型）、
 *      middleware（中间件列表）、interruptOn（Record<string, boolean>，
 *      人工中断配置，需要 checkpointer）。
 *
 * 4. 创建步骤：1.创建模型与工具对象 → 2.字典形式配置 SubAgent →
 *    3.传入 createDeepAgent 的 subagents 参数。主代理随后可自主通过内置
 *    task 工具按 name/description 委派子任务。
 */

// ---------- 第 1 步：创建模型与工具对象 ----------
// 网络搜索工具（模拟实现）：完整网页内容只在子代理上下文中处理
const internetSearch = tool(
  ({ query }) =>
    `（模拟搜索·完整网页）关于「${query}」的检索结果页：\n` +
    `……（此处省略数千字网页正文、广告与导航栏）……\n` +
    `关键信息：LangChain（JS 版）当前最新版本为 v1.5.10。`,
  {
    name: 'internet_search',
    description: '针对特定查询执行互联网搜索，返回检索页面内容。',
    schema: z.object({ query: z.string().describe('搜索关键词') }),
  },
);

// 数据库查询工具（模拟实现）：完整表单只在子代理上下文中处理
const queryDatabase = tool(
  ({ sql }) =>
    `（模拟数据库·完整表单）执行 ${sql} 的结果集：\n` +
    `id | name  | points | level | created_at\n` +
    `7  | 小虎  | 8640   | gold  | 2026-01-01\n` +
    `……（共 200 行，略）……`,
  {
    name: 'query_database',
    description: '执行只读 SQL 查询，返回查询结果表。',
    schema: z.object({ sql: z.string().describe('要执行的只读 SQL 语句') }),
  },
);

// 数值计算工具：计算过程只在子代理上下文中处理
const calculator = tool(
  ({ expression }) => {
    // 仅允许数字与四则运算符，避免任意代码执行
    if (!/^[0-9+\-*/().\s]+$/.test(expression)) {
      return `不支持的表达式：${expression}`;
    }
    const value = Function(`return (${expression})`)() as number;
    return `计算过程：${expression} = ${value}`;
  },
  {
    name: 'calculator',
    description: '计算四则运算表达式，返回计算结果。',
    schema: z.object({ expression: z.string().describe('四则运算表达式') }),
  },
);

// ---------- 第 2 步：字典（对象）形式配置 SubAgent ----------
// Required 字段：name / description / systemPrompt / tools
// Optional 字段演示：为计算子代理单独指定 model（与主代理可不同）
const internetSubagent: SubAgent = {
  name: 'internet-agent',
  description: 'Utilise online tools to search for information on the internet',
  systemPrompt: 'You are a great Internet searcher',
  tools: [internetSearch],
};

const dbSubagent: SubAgent = {
  name: 'db-agent',
  description: '执行只读数据库查询，返回单一关键数据',
  systemPrompt: '你是一名数据库专员。执行用户交给你的只读 SQL，只回复单一关键结果。',
  tools: [queryDatabase],
};

const calcSubagent: SubAgent = {
  name: 'calc-agent',
  description: '计算四则运算表达式，返回精确计算结果',
  systemPrompt: '你是一名计算专员。用 calculator 工具计算用户给你的算式，只回复计算结果。',
  tools: [calculator],
  model, // Optional：子代理可拥有独立的模型配置
};

// ---------- 第 3 步：传入 SubAgent 创建 DeepAgent ----------
// 主代理不持有任何领域工具——只能通过内置 task 工具委派子任务（上下文隔离）
const agent = createDeepAgent({
  model,
  subagents: [internetSubagent, dbSubagent, calcSubagent],
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
  console.log('===== SubAgent Dictionary-based 创建：三类子任务委派专职子代理 =====');
  console.log(
    '问：1) 查询 LangChain（JS 版）最新版本号；2) 查询用户表中 id 为 7 的用户积分；3) 计算 (128 + 72) × 15。最后汇总三个结果。\n',
  );

  const result = await agent.invoke({
    messages: [
      new HumanMessage(
        '请帮我完成三件事：1) 查询 LangChain（JS 版）框架的最新版本号；' +
          '2) 查询用户表中 id 为 7 的用户的积分；' +
          '3) 计算 (128 + 72) * 15 的结果。完成后把三个结果汇总告诉我。',
      ),
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
