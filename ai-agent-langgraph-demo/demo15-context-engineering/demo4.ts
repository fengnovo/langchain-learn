import { HumanMessage } from '@langchain/core/messages';
import { tool } from '@langchain/core/tools';
import { createDeepAgent, type SubAgent } from 'deepagents';
import { z } from 'zod';
import { model } from './model.js';

/**
 * 上下文工程策略④：隔离（Isolating）（对应 Python 课件内容）：
 *
 * 核心理念：将上下文拆分并分配，让职责与上下文内容相符；
 * 解决的是「信息交叉污染」和「目标漂移」问题。
 *
 * 两个方向在 DeepAgents 中落地：
 *
 * 1. 多智能体（Multi-agent）：隔离上下文最常用的方法之一——把上下文分散到
 *    各个 subagent 之间，为总体进程的推进打造整洁的上下文。主代理通过内置
 *    task 工具委派子任务（Context 1 / Context 2），子代理在自己的独立上下文
 *    里消化完整过程（数千字网页、200 行表单），主上下文只收回关键结果。
 *
 * 2. 环境隔离（Environments Isolation）：通过状态对象、沙箱等架构方法，
 *    让特定步骤在独立环境中执行：
 *    - 沙箱执行：代码在隔离环境中运行，只返回结果到主上下文（本例 run_code
 *      工具——执行过程发生在工具内部，主上下文只拿到最终结果）；
 *    - 状态管理：复杂状态变量在沙箱内维护，不污染主上下文（本例把中间状态
 *      写入文件系统 /sandbox/ 目录，而不是在对话消息里展开）；
 *    - 资源隔离：token 密集型对象（图像/音频）在环境中处理（本例
 *      analyze_image 工具——巨大的图像载荷在"环境"内消化，只回一行结论）。
 */

// ---------- 子代理工具：完整过程只在子代理上下文中 ----------
const internetSearch = tool(
  ({ query }) =>
    `（模拟搜索·完整网页）关于「${query}」的检索结果页：\n` +
    `……（此处省略数千字网页正文、广告与导航栏）……\n` +
    `关键信息：DeepAgents 当前版本为 v1.13.2。`,
  {
    name: 'internet_search',
    description: '针对特定查询执行互联网搜索，返回检索页面内容。',
    schema: z.object({ query: z.string().describe('搜索关键词') }),
  },
);

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

// ---------- 环境隔离工具：沙箱执行 + 资源隔离（主代理直接持有） ----------
const runCode = tool(
  ({ code }) => {
    // 沙箱执行：白名单校验后运行，执行过程留在沙箱内，只返回最终结果
    if (!/^[0-9+\-*/().\s]+$/.test(code)) {
      return JSON.stringify({ ok: false, error: '沙箱仅支持四则运算表达式' });
    }
    const value = Function(`"use strict"; return (${code});`)() as number;
    return JSON.stringify({ ok: true, result: value });
  },
  {
    name: 'run_code',
    description: '在隔离沙箱中执行代码，只把最终结果返回主上下文。',
    schema: z.object({ code: z.string().describe('要执行的四则运算表达式') }),
  },
);

const analyzeImage = tool(
  ({ chartName }) => {
    // 资源隔离：token 密集型对象（真实场景为巨大 base64 图像/音频载荷）
    // 在环境中处理，主上下文只收回一行结论
    return `图像分析结论：${chartName} 显示 Q3 营收环比增长 23%（图像原始数据未进入主上下文）`;
  },
  {
    name: 'analyze_image',
    description: '在隔离环境中分析图表图像，只返回文字结论。',
    schema: z.object({ chartName: z.string().describe('图表名称') }),
  },
);

// ---------- 多智能体：字典形式配置专职子代理（Context 1 / Context 2） ----------
const researchSubagent: SubAgent = {
  name: 'research-agent',
  description: '联网检索资讯，只返回关键信息',
  systemPrompt: '你是搜索专员。用 internet_search 检索，只回复关键信息（一两句话）。',
  tools: [internetSearch],
};

const dataSubagent: SubAgent = {
  name: 'data-agent',
  description: '执行只读数据库查询，只返回单一关键数据',
  systemPrompt: '你是数据专员。用 query_database 查询，只回复单一关键结果。',
  tools: [queryDatabase],
};

// ---------- 组装 DeepAgent：多智能体隔离 + 环境隔离一次装配 ----------
const agent = createDeepAgent({
  model,
  // 环境隔离工具由主代理直接持有：沙箱执行 + 资源隔离
  tools: [runCode, analyzeImage],
  subagents: [researchSubagent, dataSubagent],
  systemPrompt:
    '你是团队协调员。框架版本信息委派 research-agent，用户数据委派 data-agent；' +
    '所有计算必须用 run_code 在沙箱执行；图表分析用 analyze_image。' +
    '执行中的复杂中间状态写入 /sandbox/ 目录文件维护，不要在对话里展开完整过程。',
});

/** 读取 Agent 最终回复文本。 */
function finalText(result: unknown): string {
  const messages = (result as { messages?: Array<{ text?: string }> })
    .messages;
  return messages?.at(-1)?.text ?? '(无回复)';
}

/** 检查主上下文消息中是否混入了冗长过程内容（验证隔离效果）。 */
function contextContains(result: unknown, marker: string): boolean {
  const messages = (result as {
    messages?: Array<{ content?: unknown }>;
  }).messages;
  return (
    messages?.some((m) =>
      typeof m.content === 'string' ? m.content.includes(marker) : false,
    ) ?? false
  );
}

/** 打印本轮所有 task（子代理调用）的委派参数。 */
function printTaskCalls(result: unknown): void {
  const messages = (result as {
    messages?: Array<{ tool_calls?: Array<{ name: string; args: unknown }> }>;
  }).messages;
  const taskCalls =
    messages?.flatMap((m) => m.tool_calls ?? []).filter((c) => c.name === 'task') ??
    [];
  console.log(`\n--- task（子代理调用）共 ${taskCalls.length} 次 ---`);
  for (const c of taskCalls) {
    console.log(JSON.stringify(c.args));
  }
}

/** 打印文件系统中的沙箱状态文件（验证状态隔离在环境中维护）。 */
function printFiles(result: unknown, label: string): void {
  const files = (result as { files?: Record<string, unknown> }).files ?? {};
  console.log(
    `[${label}] 文件系统（环境内状态）：${Object.keys(files).join(', ') || '(空)'}`,
  );
}

async function main(): Promise<void> {
  // ----- 场景一：多智能体隔离（Multi-agent）-----
  console.log('===== 策略④隔离：多智能体（子代理分散上下文，主上下文只收关键结果）=====');
  console.log('问：1) 查 DeepAgents 最新版本号；2) 查用户表中 id 为 7 的用户积分。\n');

  const res1 = await agent.invoke({
    messages: [
      new HumanMessage(
        '请帮我完成两件事：1) 查询 DeepAgents 框架的最新版本号；' +
          '2) 查询用户表中 id 为 7 的用户的积分。完成后把两个结果汇总告诉我。',
      ),
    ],
  });

  printTaskCalls(res1);
  console.log(
    `\n[验证] 主上下文混入完整网页正文：${contextContains(res1, '此处省略数千字') ? '是（未隔离）' : '否（已隔离）'}`,
  );
  console.log(
    `[验证] 主上下文混入 200 行完整表单：${contextContains(res1, '共 200 行') ? '是（未隔离）' : '否（已隔离）'}`,
  );
  console.log(`主上下文消息条数：${(res1 as { messages?: unknown[] }).messages?.length}`);
  console.log(`最终回复：${finalText(res1)}`);

  // ----- 场景二：环境隔离（沙箱执行 + 状态管理 + 资源隔离）-----
  console.log('\n===== 策略④隔离：环境隔离（沙箱执行 / 状态管理 / 资源隔离）=====');
  console.log(
    '问：用沙箱计算 (384 * 27 + 1156) / 12；分析"Q3营收图"；把中间状态记到 /sandbox/state.md。\n',
  );

  const res2 = await agent.invoke({
    messages: [
      new HumanMessage(
        '请完成三件事：1) 用沙箱计算 (384 * 27 + 1156) / 12 的结果；' +
          '2) 分析「Q3营收图」给出结论；' +
          '3) 把以上两项中间状态写入 /sandbox/state.md 保存。最后简要汇报。',
      ),
    ],
  });

  printFiles(res2, '环境隔离');
  console.log(
    `[验证] 沙箱执行只回传结果：${contextContains(res2, '执行过程') ? '过程进入主上下文（未隔离）' : '是（主上下文只见最终数值）'}`,
  );
  console.log(`最终回复：${finalText(res2)}`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`\nDemo 执行失败：${message}`);
  process.exitCode = 1;
});
