import type { BaseMessage } from '@langchain/core/messages';
import { HumanMessage } from '@langchain/core/messages';
import { tool } from '@langchain/core/tools';
import { MemorySaver } from '@langchain/langgraph';
import { createAgent } from 'langchain';
import { z } from 'zod';
import { model } from '../model.js';

/**
 * LangGraph 记忆①：短期记忆（short-term memory）（对应 Python 课件内容）：
 *
 * 记忆是维持历史交互信息的系统。用户交互记录（Agent state：human message /
 * AI message / tool message ...）是最常见的记忆形式。
 *
 * LangChain 构建了持久化层，通过检查点管理器（checkpointer）实现：
 * 检查点管理器会在每个超级步（super-step）保存图的状态快照（checkpoint），
 * 这些检查点被保存到一个线程（thread）中，可以在图执行后访问。
 *
 * 构建与使用：
 * - createAgent 传入 checkpointer=MemorySaver()（配置 checkpointer）；
 * - invoke 时通过 configurable.thread_id 配置线程（thread）；
 * - 同一线程内：后续调用自动携带历史交互 → Agent「记住」之前的内容；
 * - 不同线程之间：状态互不可见 → 记忆按线程隔离。
 *
 * 由于线程允许在图执行后访问其状态，因此可以实现多种强大功能：
 * 本示例用检查点管理器的 getTuple / list 方法读取最新状态快照与检查点清单
 * （对应课件「checkpointer 常用方法：get_tuple / list」）。
 */

// 简单计算工具：让一轮对话产生 human → AI(tool_calls) → tool → AI 消息序列，
// 对应课件「Agent state」图示中的消息形式
const calculate = tool(
  ({ expression }) => {
    if (!/^[0-9+\-*/().\s]+$/.test(expression)) {
      throw new Error(`不支持的表达式：${expression}`);
    }
    return String(Function(`"use strict"; return (${expression});`)());
  },
  {
    name: 'calculate',
    description: '执行四则运算并返回结果。',
    schema: z.object({ expression: z.string().describe('四则运算表达式') }),
  },
);

// 配置 checkpointer：每个超级步（super-step）保存一次状态快照（checkpoint）
const memorySaver = new MemorySaver();

const agent = createAgent({
  model,
  tools: [calculate],
  checkpointer: memorySaver,
});

/** 打印消息列表概览。 */
function printMessages(label: string, messages: BaseMessage[]): void {
  console.log(`${label}（共 ${messages.length} 条）`);
  for (const [index, message] of messages.entries()) {
    const text = message.text.replace(/\s+/g, ' ').slice(0, 60);
    console.log(
      `  [${index}] [${message.type}] ${text}${message.text.length > 60 ? '…' : ''}`,
    );
  }
}

async function main(): Promise<void> {
  // ----- 线程 1：同一线程内的两轮对话（短期记忆生效） -----
  console.log('===== 短期记忆：线程 1（thread_id="1"）第一轮 =====');
  const res1 = await agent.invoke(
    {
      messages: [
        new HumanMessage('我叫李雷。请帮我计算 (3 + 4) * 2 的结果。'),
      ],
    },
    { configurable: { thread_id: '1' } },
  );
  console.log(`回复：${res1.messages.at(-1)!.text}`);

  console.log('\n===== 短期记忆：线程 1 第二轮（不重复自我介绍）=====');
  const res2 = await agent.invoke(
    {
      messages: [
        new HumanMessage('还记得我叫什么吗？请把刚才的计算结果再乘以 10。'),
      ],
    },
    { configurable: { thread_id: '1' } },
  );
  console.log(`回复：${res2.messages.at(-1)!.text}`);

  // ----- 线程 2：新线程（记忆按线程隔离，访问不到线程 1 的状态） -----
  console.log('\n===== 短期记忆：线程 2（thread_id="2"，验证隔离）=====');
  const res3 = await agent.invoke(
    { messages: [new HumanMessage('我叫什么名字？')] },
    { configurable: { thread_id: '2' } },
  );
  console.log(`回复：${res3.messages.at(-1)!.text}`);

  // ----- 图执行后访问检查点：getTuple / list（检查点管理器常用方法） -----
  console.log('\n===== 图执行后访问状态：getTuple / list =====');
  const threadConfig = { configurable: { thread_id: '1' } };

  // get_tuple：获取检查点元组（最新快照）
  const tuple = await memorySaver.getTuple(threadConfig);
  if (tuple) {
    const messages =
      (tuple.checkpoint.channel_values as { messages?: BaseMessage[] })
        .messages ?? [];
    printMessages(
      `线程 1 最新检查点（id=${tuple.checkpoint.id.slice(0, 8)}…，super-step=${tuple.metadata?.step}）的完整 State 快照`,
      messages,
    );
  }

  // list：检查点清单——每个超级步（super-step）各存一次快照
  let checkpointCount = 0;
  for await (const entry of memorySaver.list(threadConfig)) {
    checkpointCount += 1;
    console.log(
      `Checkpoint_${checkpointCount}：id=${entry.checkpoint.id.slice(0, 8)}…，super-step=${entry.metadata?.step}，` +
        `快照通道：${Object.keys(entry.checkpoint.channel_values).join(', ')}`,
    );
  }
  console.log(
    `\n检查点管理器为线程 1 保存了 ${checkpointCount} 个检查点——每个超级步各存一次快照。`,
  );
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`\nDemo 执行失败：${message}`);
  process.exitCode = 1;
});
