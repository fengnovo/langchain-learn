import { HumanMessage } from '@langchain/core/messages';
import { InMemoryStore } from '@langchain/langgraph';
import { StoreBackend, createDeepAgent } from 'deepagents';
import { model } from './model.js';

/**
 * 上下文工程策略①：写入（Write）（对应 Python 课件内容）：
 *
 * 核心理念：突破上下文窗口限制，将信息持久化到外部存储系统，实现
 * 「工作记忆」向「长期记忆」的转移。
 *
 * 在 DeepAgents 中落地三个层次：
 *
 * 1. 会话中写入（轻量级暂存 / Scratchpad）：DeepAgents 内置 To-do-list
 *    中间件，Agent 把任务拆解与中间思考写入会话内的草稿板（/todo_list.md），
 *    Step n → Step n+1 逐步推进。课件要点——需要设置容量限制，超过阈值时
 *    自动总结清理（DeepAgents 内置 Summarization 中间件在上下文达 90% 时
 *    自动压缩，即"超阈值自动清理"的内置实现）。
 *
 * 2. 持久化写入（长期记忆构建）：用 StoreBackend + InMemoryStore 把文件
 *    （记忆）持久化到外部存储对象，跨会话积累信息（对应"记忆系统架构"，
 *    生产中可替换为向量库/知识图谱支撑的 Store 实现）。
 *
 * 3. 反思机制（Reflexion）：任务执行完成后，再让 Agent 对本次执行生成自我
 *    总结和经验教训，并写入长期记忆（/memories/lessons.md），供后续会话
 *    复用——"工作记忆"向"长期记忆"转移的完整闭环。
 */

// 外部存储对象：跨会话的长期记忆载体（对应课件"记忆系统架构"）
const store = new InMemoryStore();

const agent = createDeepAgent({
  model,
  store, // 持久化写入：传入存储对象
  backend: new StoreBackend({ store }), // 文件全部落入外部存储（跨线程持久）
  systemPrompt:
    '你是一名严谨的研究员。接到复杂任务时，先用 todo list 拆解任务并跟踪进展，再逐步执行。',
});

/** 读取 Agent 最终回复文本。 */
function finalText(result: unknown): string {
  const messages = (result as { messages?: Array<{ text?: string }> })
    .messages;
  return messages?.at(-1)?.text ?? '(无回复)';
}

/** 打印本次调用结束后文件系统中的文件（观察写入位置）。 */
function printFiles(result: unknown, label: string): void {
  const files = (result as { files?: Record<string, unknown> }).files ?? {};
  console.log(`[${label}] 文件系统现有：${Object.keys(files).join(', ') || '(空)'}`);
}

async function main(): Promise<void> {
  // ----- 1. 会话中写入：todo list（Scratchpad）+ 任务产出写入文件系统 -----
  console.log('===== 策略①写入：会话中写入（todo list 草稿板）+ 持久化写入 =====');
  const res1 = await agent.invoke({
    messages: [
      new HumanMessage(
        '请调研 DeepAgents 的四大核心能力，先拆解任务写入 todo list，再撰写 150 字以内的简报保存为 report.md。',
      ),
    ],
  });
  console.log(`最终回复：${finalText(res1)}`);
  printFiles(res1, '会话一');

  // ----- 2+3. 反思机制：新会话读取上次产出 → 提炼经验教训写入长期记忆 -----
  console.log('\n===== 策略①写入：反思机制（Reflexion，经验写入长期记忆）=====');
  const res2 = await agent.invoke({
    messages: [
      new HumanMessage(
        '请读取 report.md，基于其内容提炼 3 条可复用的经验教训，并写入 /memories/lessons.md（没有则创建）。',
      ),
    ],
  });
  console.log(`最终回复：${finalText(res2)}`);
  printFiles(res2, '会话二');

  // ----- 验证长期记忆：再开一个新会话也能读取（跨会话信息积累） -----
  console.log('\n===== 策略①写入：验证长期记忆跨会话可读 =====');
  const res3 = await agent.invoke({
    messages: [new HumanMessage('请读取 /memories/lessons.md，逐条列出其中的经验教训。')],
  });
  console.log(`最终回复：${finalText(res3)}`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`\nDemo 执行失败：${message}`);
  process.exitCode = 1;
});
