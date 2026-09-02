import type { AIMessage, BaseMessage } from '@langchain/core/messages';
import { HumanMessage } from '@langchain/core/messages';
import { tool } from '@langchain/core/tools';
import { createAgent, createMiddleware } from 'langchain';
import { z } from 'zod';
import { model } from '../model.js';

// 简单的计算器工具（对应 Python 示例里的 tools）。
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
 * 定义上下文 Schema（对应 Python 的 class Context(TypedDict)）：
 * context 在每次调用时传入，不会像 state 那样被持久化；
 * default('user') 对应 Python 的 .get("user_role", "user")。
 */
const contextSchema = z.object({
  userRole: z.enum(['expert', 'beginner', 'user']).default('user'),
});

/**
 * 动态系统提示词（对应 Python 的 @dynamic_prompt）：
 * LangChain.js v1 没有 dynamic_prompt 装饰器，等价写法是在 wrapModelCall
 * 中间件里根据 runtime.context 生成 systemPrompt，再交给 handler 执行。
 */
const userRolePrompt = createMiddleware({
  name: 'userRolePrompt',
  contextSchema,
  wrapModelCall: (request, handler) => {
    // 根据用户角色生成系统提示词（对应 request.runtime.context.get("user_role", "user")）
    const { userRole } = request.runtime.context;
    const basePrompt = '你是我的得力助手。';

    if (userRole === 'expert') {
      return handler({
        ...request,
        systemPrompt: `${basePrompt} 提供详细的技术答复。`,
      });
    }

    if (userRole === 'beginner') {
      return handler({
        ...request,
        systemPrompt: `${basePrompt} 简单解释概念，避免行话。`,
      });
    }

    return handler({ ...request, systemPrompt: basePrompt });
  },
});

// 创建 Agent：系统提示将根据上下文动态设置（对应 context_schema=Context）。
const agent = createAgent({
  model,
  tools: [calculator],
  middleware: [userRolePrompt],
  contextSchema,
});

function printReply(messages: BaseMessage[]): void {
  const last = messages.at(-1) as AIMessage;
  console.log(last.text);
}

async function main(): Promise<void> {
  const question = '为我解释机器学习这个概念。';

  // 每次调用时明确指定 context（对应 context={"user_role": "expert"}）。
  const expert = await agent.invoke(
    { messages: [new HumanMessage(question)] },
    { context: { userRole: 'expert' } },
  );
  console.log('===== user_role=expert =====');
  printReply(expert.messages);

  const beginner = await agent.invoke(
    { messages: [new HumanMessage(question)] },
    { context: { userRole: 'beginner' } },
  );
  console.log('\n===== user_role=beginner =====');
  printReply(beginner.messages);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`\nDemo 执行失败：${message}`);
  process.exitCode = 1;
});
