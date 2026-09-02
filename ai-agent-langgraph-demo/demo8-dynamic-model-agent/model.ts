import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { initChatModel } from 'langchain/chat_models/universal';

// 无论从项目根目录还是其他目录执行，都固定读取项目根目录的 .env。
dotenv.config({
  path: fileURLToPath(new URL('../.env', import.meta.url)),
  quiet: true,
});

function requiredEnv(
  name: 'MODEL' | 'OPENAI_API_KEY' | 'TX_MODEL' | 'TX_OPENAI_API_KEY',
): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`缺少环境变量 ${name}，请先在项目根目录的 .env 中配置。`);
  }

  return value;
}

function optionalEnv(
  name: 'OPENAI_BASE_URL' | 'TX_OPENAI_BASE_URL',
): string | undefined {
  return process.env[name]?.trim() || undefined;
}

/**
 * 定义两个备选模型（对应 Python 示例中的 init_chat_model）：
 *
 * - basicModel：默认模型，快且便宜，相当于示例里的 openai:gpt-4o-mini；
 * - advancedModel：能力更强但更贵的模型，相当于示例里的 openai:gpt-4o。
 *
 * 这里复用 .env 中已有的两组渠道配置：基础模型用默认渠道（MODEL），
 * 高级模型用 TX 渠道（TX_MODEL）。
 */
export const basicModel = await initChatModel(requiredEnv('MODEL'), {
  modelProvider: 'openai',
  apiKey: requiredEnv('OPENAI_API_KEY'),
  configuration: {
    baseURL: optionalEnv('OPENAI_BASE_URL'),
  },
  temperature: 0.7,
  maxTokens: 1_000,
  timeout: 30_000,
  maxRetries: 2,
  configurableFields: ['temperature', 'maxTokens'],
});

export const advancedModel = await initChatModel(requiredEnv('TX_MODEL'), {
  modelProvider: 'openai',
  apiKey: requiredEnv('TX_OPENAI_API_KEY'),
  configuration: {
    baseURL: optionalEnv('TX_OPENAI_BASE_URL'),
  },
  temperature: 0.7,
  maxTokens: 1_000,
  timeout: 30_000,
  maxRetries: 2,
  configurableFields: ['temperature', 'maxTokens'],
});
