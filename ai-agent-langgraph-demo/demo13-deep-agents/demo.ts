import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { HumanMessage } from '@langchain/core/messages';
import { tool } from '@langchain/core/tools';
import { FilesystemBackend, createDeepAgent } from 'deepagents';
import { z } from 'zod';
import { model } from './model.js';

/**
 * DeepAgents 的创建与内部细节（对应 Python 课件四页内容）：
 *
 * 1. 核心能力：为了让 Agent 能够更深入探讨话题，需要 Agent 能够规划更复杂的
 *    任务，并在更长时间范围内逐步完成各个目标最终完成整体任务。DeepAgent
 *    的核心在于合理运用四个基本概念：详尽的提示词、规划工具、子代理
 *    （subagent）和文件系统，对应四大核心能力：
 *    - 规划与任务分解（Planning and task decomposition）：内置 todo list
 *      工具，将复杂任务拆解为离散步骤，跟踪进展并根据新信息调整计划；
 *    - 上下文管理（Context management）：文件系统工具（ls、read_file、
 *      write_file、edit_file）允许把复杂上下文卸载到内存，防止上下文窗口
 *      溢出，并支持可变长度工具结果的处理；
 *    - 子代理生成（Subagent spawning）：内置 "task" 工具，针对性生成子代理
 *      实现上下文隔离——主代理上下文保持干净，同时又能深入处理子任务
 *      （见 demo2.ts）；
 *    - 长期记忆（Long-term memory）：利用不同类型的 Backend 进行信息存储，
 *      把具有持久内存的 Agent 扩展到线程之间（见 demo12 的 demo5）。
 *
 * 2. 创建与内部细节：使用 deepagents 包中的 createDeepAgent 方法创建。该方法
 *    实际上是对 createAgent 函数额外配备了一些复杂任务常用的相关配置。
 *    内部结构 = 模型 + 用户赋予的额外工具 + 四个内置中间件
 *    （To-do-list、Summarization（trigger=fraction 0.9 / keep=fraction 0.15）、
 *    PatchToolCalls、file system）+ task（子代理调用）等内置工具。
 *
 * 3. 常用参数配置：与 createAgent 相同，createDeepAgent 依然返回一个 compiled
 *    graph 对象，调用方法与传统 Agent 完全相同：
 *    - systemPrompt：用户拟定的额外系统提示（会追加在基本系统提示
 *      BASE_AGENT_PROMPT —— "In order to complete the objective that the
 *      user asks of you, you have access to a number of standard tools." —— 中）；
 *    - tools：用户赋予的额外的工具列表；
 *    - backend：与配置 file system 时相同（本例用 FilesystemBackend）；
 *    - interruptOn：用户中断配置，默认为 None（见 demo12 的 demo2）。
 *
 * 4. 常见使用场景：complex and multi-step（复杂多步骤任务）、large amounts
 *    of context（大量上下文管理）、Delegate work（委托子代理）、Persist
 *    memory（跨线程持久记忆）。本示例演示前两类：研究型任务 = 先用 todo
 *    list 规划拆解，再搜索资料，最后把报告写入文件系统（卸载上下文）。
 */

// 可访问的根目录：demo13-deep-agents/workspace
// FilesystemBackend 的文件真实落盘、跨运行保留，因此每次运行先重置，
// 避免上一次运行的 todo_list.md / report.md 残留影响演示。
const workspace = fileURLToPath(new URL('./workspace', import.meta.url));
rmSync(workspace, { recursive: true, force: true });
mkdirSync(workspace, { recursive: true });

// 详尽的提示词（对应课件 research_instructions）：
// DeepAgent 的关键实践之一——在系统提示中明确职责、工具用法与工作流程。
const researchInstructions = `你是一位专业研究员。你的职责是开展全面研究，并撰写精炼的报告。你主要通过 internet_search 获取信息。对于相对复杂的任务你要首先编写 todo_list 以记录任务过程。

## \`internet_search\`

使用此功能可针对特定查询执行互联网搜索。你可指定返回结果的最大数量、主题范围，以及是否包含原始内容。`;

// 用户赋予的额外工具：联网搜索（模拟实现，避免真实联网依赖）
const internetSearch = tool(
  ({ query }) =>
    `（模拟搜索结果）关于「${query}」：\n` +
    `1. DeepAgents 是基于 LangChain/LangGraph 的深度代理框架，通过内置规划、` +
    `子代理与文件系统支撑长程复杂任务；\n` +
    `2. 其四大核心能力为规划与任务分解、上下文管理、子代理生成、长期记忆；\n` +
    `3. 适用场景包括复杂多步骤任务、大量上下文管理、任务委托与持久记忆。`,
  {
    name: 'internet_search',
    description:
      '针对特定查询执行互联网搜索。可指定返回结果的最大数量、主题范围，以及是否包含原始内容。',
    schema: z.object({
      query: z.string().describe('搜索关键词'),
      maxResults: z.number().optional().describe('返回结果的最大数量'),
      topic: z.string().optional().describe('主题范围'),
      includeRawContent: z.boolean().optional().describe('是否包含原始内容'),
    }),
  },
);

/**
 * DeepAgent 的基本创建（对应课件示例）：
 * - model：模型；
 * - tools：用户赋予的额外工具列表（internet_search）；
 * - systemPrompt：详尽的系统提示（追加在 BASE_AGENT_PROMPT 之后）；
 * - backend：与配置 file system 相同——FilesystemBackend + virtualMode
 *   把读写范围锁死在 workspace 根目录。
 */
const agent = createDeepAgent({
  model,
  tools: [internetSearch],
  systemPrompt: researchInstructions,
  backend: new FilesystemBackend({ rootDir: workspace, virtualMode: true }),
});

/** 读取 Agent 最终回复文本。 */
function finalText(result: unknown): string {
  const messages = (result as { messages?: Array<{ text?: string }> })
    .messages;
  return messages?.at(-1)?.text ?? '(无回复)';
}

async function main(): Promise<void> {
  console.log('===== DeepAgent 基本创建：研究型任务（规划 + 搜索 + 报告落盘）=====');
  console.log('问：请研究 DeepAgents 框架的核心能力，并撰写一份精炼的研究报告。\n');

  // 调用方法与传统 Agent 完全相同（返回 compiled graph 对象）
  const result = await agent.invoke({
    messages: [
      new HumanMessage(
        '请研究 DeepAgents 框架的核心能力，撰写一份精炼的研究报告，并保存为文件 report.md。',
      ),
    ],
  });
  console.log(`最终回复：${finalText(result)}`);

  // 验证报告真实写入本地文件系统（FilesystemBackend + virtualMode 生效）
  const reportPath = `${workspace}/report.md`;
  console.log(
    `\n磁盘验证：${reportPath} ${existsSync(reportPath) ? '已创建，内容如下 ↓\n' + readFileSync(reportPath, 'utf-8') : '未创建'}`,
  );
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`\nDemo 执行失败：${message}`);
  process.exitCode = 1;
});
