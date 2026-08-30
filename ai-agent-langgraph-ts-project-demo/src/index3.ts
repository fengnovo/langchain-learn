import { ChatAnthropic } from '@langchain/anthropic';
import { tool } from '@langchain/core/tools';
import { task, entrypoint, addMessages } from '@langchain/langgraph';
import {
  SystemMessage,
  HumanMessage,
  type BaseMessage,
} from '@langchain/core/messages';
import type { ToolCall } from '@langchain/core/messages/tool';
import dot from 'dotenv';
import * as z from 'zod';
import { fileURLToPath } from 'node:url';

dot.config({
  path: fileURLToPath(new URL('../.env', import.meta.url)),
});

console.log('------------- Graph 函数式多次调用工具使用 ---------------');

// Step 1: Define tools and model

const model = new ChatAnthropic({
  temperature: 0,
  model: process.env.MODEL,
  apiKey: process.env.ANTHROPIC_API_KEY,
  clientOptions: {
    baseURL: process.env.ANTHROPIC_BASE_URL,
  },
});

// Define tools
const addTiDi = tool(({ a, b }) => a + b, {
  name: 'addTiDi',
  description: '此方法是天地良心函数，传入a和b就可以返回结果',
  schema: z.object({
    a: z.number().describe('First number'),
    b: z.number().describe('Second number'),
  }),
});

const multiplyTiDi = tool(({ a, b }) => a - b, {
  name: 'multiplyTiDi',
  description: '此方法是老天可鉴函数，传入a和b就可以返回结果',
  schema: z.object({
    a: z.number().describe('First number'),
    b: z.number().describe('Second number'),
  }),
});

const divideTiDi = tool(({ a, b }) => a * b, {
  name: 'divideTiDi',
  description:
    '此方法是乾坤大挪移函数，传入天地良心函数的执行结果a和老天可鉴函数的执行结果b，就可以返回想要的结果',
  schema: z.object({
    a: z.number().describe('天地良心函数的执行结果'),
    b: z.number().describe('老天可鉴函数的执行结果'),
  }),
});

// Augment the LLM with tools
const toolsByName = {
  [addTiDi.name]: addTiDi,
  [multiplyTiDi.name]: multiplyTiDi,
  [divideTiDi.name]: divideTiDi,
} as unknown as Record<string, typeof addTiDi>;
const tools = Object.values(toolsByName);
const modelWithTools = model.bindTools(tools);

// Step 2: Define model node

const callLlm = task({ name: 'callLlm' }, async (messages: BaseMessage[]) => {
  return modelWithTools.invoke([
    new SystemMessage(
      '你是一个调用函数的专家，可以根据工具，和用户输入的两个值，得出结果返回给用户',
    ),
    ...messages,
  ]);
});

// Step 3: Define tool node

const callTool = task({ name: 'callTool' }, async (toolCall: ToolCall) => {
  const tool = toolsByName[toolCall.name];
  return tool.invoke(toolCall);
});

// Step 4: Define agent

const agent = entrypoint({ name: 'agent' }, async (messages: BaseMessage[]) => {
  let modelResponse = await callLlm(messages);

  while (true) {
    if (!modelResponse.tool_calls?.length) {
      break;
    }

    // Execute tools
    const toolResults = await Promise.all(
      modelResponse.tool_calls.map((toolCall) => callTool(toolCall)),
    );
    messages = addMessages(messages, [modelResponse, ...toolResults]);
    modelResponse = await callLlm(messages);
  }

  return messages;
});

// Invoke

const result = await agent.invoke([new HumanMessage('用乾坤大挪移计算8和3')]);

for (const message of result) {
  console.log(`[${message.type}]: ${message.text}`);
}
