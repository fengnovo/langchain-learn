import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { initChatModel } from 'langchain/chat_models/universal';

// 无论从项目根目录还是其他目录执行，都固定读取项目根目录的 .env。
dotenv.config({
  path: fileURLToPath(new URL('../.env', import.meta.url)),
  quiet: true,
});

function requiredEnv(
  name: 'MODEL' | 'OPENAI_API_KEY' | 'OPENAI_BASE_URL',
): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`缺少环境变量 ${name}，请先在项目根目录的 .env 中配置。`);
  }

  return value;
}

/**
 * demo10 专用模型：
 *
 * toolStrategy 生成结构化输出时会强制指定 tool_choice，而 qwen3.8 默认开启
 * 思考模式（thinking），思考模式下接口不接受 required/object 形式的
 * tool_choice（返回 400）。因此这里通过 modelKwargs 显式关闭思考模式。
 */
export const model = await initChatModel(requiredEnv('MODEL'), {
  modelProvider: 'openai',
  apiKey: requiredEnv('OPENAI_API_KEY'),
  configuration: {
    baseURL: requiredEnv('OPENAI_BASE_URL'),
  },
  temperature: 0.7,
  maxTokens: 1_000,
  timeout: 30_000,
  maxRetries: 2,
  configurableFields: ['temperature', 'maxTokens'],
  modelKwargs: { enable_thinking: false },
});
