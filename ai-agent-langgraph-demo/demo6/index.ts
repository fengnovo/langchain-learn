// 必须是第一个 import：先注册 OpenTelemetry，再加载 LangChain/LangGraph。
import { shutdownLangfuse } from './instrumentation.js';

import { tool } from '@langchain/core/tools';
import {
  END,
  MessagesAnnotation,
  START,
  StateGraph,
} from '@langchain/langgraph';
import { ToolNode, toolsCondition } from '@langchain/langgraph/prebuilt';
import { CallbackHandler } from '@langfuse/langchain';
import { z } from 'zod';
import { model } from '../model.js';

const calculator = tool(
  ({ a, b, operation }) => {
    switch (operation) {
      case 'add':
        return String(a + b);
      case 'subtract':
        return String(a - b);
      case 'multiply':
        return String(a * b);
      case 'divide':
        if (b === 0) {
          throw new Error('除数不能为 0');
        }
        return String(a / b);
    }
  },
  {
    name: 'calculator',
    description: '对两个数字执行加、减、乘、除运算。涉及算术时必须调用此工具。',
    schema: z.object({
      a: z.number().describe('第一个数字'),
      b: z.number().describe('第二个数字'),
      operation: z
        .enum(['add', 'subtract', 'multiply', 'divide'])
        .describe('要执行的运算'),
    }),
  },
);

const tools = [calculator];
const modelWithTools = model.bindTools(tools);

async function callModel(state: typeof MessagesAnnotation.State) {
  const response = await modelWithTools.invoke(state.messages);
  return { messages: [response] };
}

/**
 * toolsCondition 是LangGraph预置的“条件路由函数”，它只判断下一步去哪，不负责执行工具。
 * 最后一条 AIMessage 有 tool_calls
          │
          ├── 有 → 返回 "tools" → 进入 ToolNode
          │
          └── 无 → 返回 END → 图执行结束
 */

const graph = new StateGraph(MessagesAnnotation)
  .addNode('agent', callModel)
  .addNode('tools', new ToolNode(tools))

  .addEdge(START, 'agent')
  .addConditionalEdges('agent', toolsCondition, ['tools', END])
  .addEdge('tools', 'agent')
  .compile();

/**
START
  ↓
agent（模型判断是否调用工具）
  ↓
toolsCondition
  ├─ tool_calls 存在 → tools 执行 calculator
  │                       ↓
  │                    回到 agent
  │
  └─ 没有 tool_calls → END
 */

async function main(): Promise<void> {
  const prompt =
    process.argv.slice(2).join(' ').trim() ||
    '请调用 calculator 工具计算 23 × 47，再用一句中文解释结果。';
  const userId = process.env.LANGFUSE_DEMO_USER_ID?.trim() || 'demo-user-001';
  const sessionId =
    process.env.LANGFUSE_DEMO_SESSION_ID?.trim() || 'demo-session-001';

  const langfuseHandler = new CallbackHandler();
  const result = await graph.invoke(
    { messages: [{ role: 'user', content: prompt }] },
    {
      callbacks: [langfuseHandler],
      runName: 'demo6-langgraph-agent',
      tags: ['demo6', 'langgraph', 'langfuse'],
      metadata: {
        langfuseUserId: userId,
        langfuseSessionId: sessionId,
        example: 'calculator-agent',
      },
      configurable: {
        thread_id: sessionId,
      },
      recursionLimit: 10,
    },
  );

  const lastMessage = result.messages.at(-1);
  console.log(`\n问题：${prompt}`);
  console.log(
    `回答：${lastMessage?.text || String(lastMessage?.content ?? '')}`,
  );
  console.log(
    `Langfuse trace ID：${langfuseHandler.last_trace_id ?? '未获取到'}`,
  );
  console.log(
    `Langfuse 地址：${process.env.LANGFUSE_BASE_URL || 'https://cloud.langfuse.com'}`,
  );
}

try {
  await main();
} catch (error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`\nDemo 执行失败：${message}`);
  process.exitCode = 1;
} finally {
  try {
    await shutdownLangfuse();
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Langfuse trace 发送失败：${message}`);
    process.exitCode = 1;
  }
}
