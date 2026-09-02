import type { AIMessage, BaseMessage } from '@langchain/core/messages';
import { HumanMessage } from '@langchain/core/messages';
import { tool } from '@langchain/core/tools';
import { createAgent, createMiddleware } from 'langchain';
import { z } from 'zod';
import { advancedModel, basicModel } from './model.js';

// 简单的计算器工具，让 Agent 具备真实的工具调用能力（对应 Python 示例里的 tools）。
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

/**
 * 利用中间件定义动态模型 Agent（对应 Python 示例的 @wrap_model_call）：
 *
 * - wrapModelCall 在每次请求模型前执行，可以改写请求后再交给 handler；
 * - request.messages 是本次要发送的完整消息列表（等价于 Python 的
 *   request.state["messages"]）；
 * - 用 handler({ ...request, model }) 替换模型后继续执行，
 *   等价于 Python 的 request.model = model; return handler(request)。
 */
const dynamicModelSelection = createMiddleware({
  name: 'dynamicModelSelection',
  wrapModelCall: async (request, handler) => {
    // 定义模型选择逻辑：根据对话复杂度选择模型，消息超过 5 条视为长对话。
    const messageCount = request.messages.length;

    if (messageCount > 5) {
      // 使用高级模型进行更长时间的对话
      console.log(`[middleware] 消息数 ${messageCount} -> advancedModel`);
      return handler({ ...request, model: advancedModel });
    }

    console.log(`[middleware] 消息数 ${messageCount} -> basicModel`);
    return handler({ ...request, model: basicModel });
  },
});

// 创建 Agent：model 传默认模型，等价于 Python 示例的 model=basic_model。
const agent = createAgent({
  model: basicModel,
  tools: [calculator],
  middleware: [dynamicModelSelection],
});

/** 打印最后一条 AI 回复及其真实使用的模型名（从 response_metadata 读取）。 */
function printReply(messages: BaseMessage[]): void {
  const last = messages.at(-1) as AIMessage;
  const modelName =
    last.response_metadata?.model_name ?? last.response_metadata?.model;

  console.log(`model_name: ${modelName ?? '未知'}`);
  console.log(last.text);
}

async function main(): Promise<void> {
  // 短消息列表调用：只有 1 条消息 -> basicModel。
  let res = await agent.invoke({
    messages: [new HumanMessage('你好')],
  });
  printReply(res.messages);

  // 长消息列表调用：持续把上一轮的 messages 追加新问题，
  // 消息数超过 5 条后中间件会自动切换到 advancedModel。
  const followUps = [
    '用一句话介绍你自己。',
    '再分享一个有趣的冷知识。',
    '你认为接下来deepseek的发展前景会如何？',
  ];

  for (const content of followUps) {
    res = await agent.invoke({
      messages: [...res.messages, new HumanMessage(content)],
    });
    printReply(res.messages);
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`\nDemo 执行失败：${message}`);
  process.exitCode = 1;
});
