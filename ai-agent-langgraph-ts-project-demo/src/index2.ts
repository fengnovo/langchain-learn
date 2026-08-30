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

console.log('---------------- Graph 函数式方式使用 -----------------------');

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
const add = tool(({ a, b }) => a + b, {
  name: 'add',
  description: 'Add two numbers',
  schema: z.object({
    a: z.number().describe('First number'),
    b: z.number().describe('Second number'),
  }),
});

const multiply = tool(({ a, b }) => a * b, {
  name: 'multiply',
  description: 'Multiply two numbers',
  schema: z.object({
    a: z.number().describe('First number'),
    b: z.number().describe('Second number'),
  }),
});

const divide = tool(({ a, b }) => a / b, {
  name: 'divide',
  description: 'Divide two numbers',
  schema: z.object({
    a: z.number().describe('First number'),
    b: z.number().describe('Second number'),
  }),
});

// Augment the LLM with tools
const toolsByName = {
  [add.name]: add,
  [multiply.name]: multiply,
  [divide.name]: divide,
} as unknown as Record<string, typeof add>;
const tools = Object.values(toolsByName);
const modelWithTools = model.bindTools(tools);

// Step 2: Define model node

const callLlm = task({ name: 'callLlm' }, async (messages: BaseMessage[]) => {
  return modelWithTools.invoke([
    new SystemMessage(
      'You are a helpful assistant tasked with performing arithmetic on a set of inputs.',
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

const result = await agent.invoke([new HumanMessage('Add 3 and 4.')]);

for (const message of result) {
  console.log(`[${message.type}]: ${message.text}`);
}
