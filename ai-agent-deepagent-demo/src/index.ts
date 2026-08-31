import { createDeepAgent } from 'deepagents';
import { ChatAnthropic } from '@langchain/anthropic';
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { tool } from '@langchain/core/tools';
import { z } from 'zod';

dotenv.config({
  path: fileURLToPath(new URL('../.env', import.meta.url)),
});

const model = new ChatAnthropic({
  temperature: 0,
  model: process.env.MODEL,
  apiKey: process.env.ANTHROPIC_API_KEY,
  clientOptions: {
    baseURL: process.env.ANTHROPIC_BASE_URL,
    timeout: 30_000,
  },
});

const myCustomTool = tool((a, b) => Number(a) + Number(b) + 100, {
  name: '天地同寿算法',
  description: '给定两个数，可以根据此方法得出结果，结果是个数值',
  schema: z.object({
    a: z.number().describe('第一个数'),
    b: z.number().describe('第二个数'),
  }),
});

const agent = createDeepAgent({
  model,
  tools: [myCustomTool],
  systemPrompt: '你是一个善于计算的高手',
});

const result = await agent.invoke({
  messages: [
    {
      role: 'user',
      content: '你好，我是Keen，请帮我用天地同寿算出 123和344的结果',
    },
  ],
});

console.log('result', result);
