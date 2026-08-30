import { createDeepAgent } from 'deepagents';
import { ChatAnthropic } from '@langchain/anthropic';
import { z } from 'zod/v4';
import dot from 'dotenv';
import { fileURLToPath } from 'node:url';

dot.config({
  path: fileURLToPath(new URL('../.env', import.meta.url)),
});

// 配置了"exactOptionalPropertyTypes": true 所以要加这个
const env = z
  .object({
    MODEL: z.string().min(1),
    ANTHROPIC_API_KEY: z.string().min(1),
    ANTHROPIC_BASE_URL: z.url(),
  })
  .parse(process.env);

const llm = new ChatAnthropic({
  temperature: 0,
  model: env.MODEL,
  apiKey: env.ANTHROPIC_API_KEY,
  clientOptions: {
    baseURL: env.ANTHROPIC_BASE_URL,
    timeout: 30_000,
  },
});

const agent = createDeepAgent({ model: llm });
const result = await agent.invoke({
  messages: [{ role: 'user', content: '什么是 LangSmith?' }],
});
