import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { initChatModel } from 'langchain/chat_models/universal';

// 无论从项目根目录还是其他目录执行，都固定读取项目根目录的 .env。
dotenv.config({
  path: fileURLToPath(new URL('./.env', import.meta.url)),
  quiet: true,
});

function requiredEnv(
  name:
    | 'MODEL'
    | 'OPENAI_API_KEY'
    | 'OPENAI_BASE_URL'
    | 'TT_MODEL'
    | 'TT_OPENAI_API_KEY'
    | 'TT_OPENAI_BASE_URL'
    | 'TX_MODEL'
    | 'TX_OPENAI_API_KEY'
    | 'TX_OPENAI_BASE_URL',
): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`缺少环境变量 ${name}，请先在项目根目录的 .env 中配置。`);
  }

  return value;
}

const current = 'AL';
const CONFIG = {
  AL: {
    MODEL: requiredEnv('MODEL'),
    OPENAI_API_KEY: requiredEnv('OPENAI_API_KEY'),
    OPENAI_BASE_URL: requiredEnv('OPENAI_BASE_URL'),
  },
  TX: {
    MODEL: requiredEnv('TX_MODEL'),
    OPENAI_API_KEY: requiredEnv('TX_OPENAI_API_KEY'),
    OPENAI_BASE_URL: requiredEnv('TX_OPENAI_BASE_URL'),
  },
  TT: {
    MODEL: requiredEnv('TT_MODEL'),
    OPENAI_API_KEY: requiredEnv('TT_OPENAI_API_KEY'),
    OPENAI_BASE_URL: requiredEnv('TT_OPENAI_BASE_URL'),
  },
};
/**
 * TypeScript 版 init_chat_model：
 *
 * - 这里的参数是每次调用都会使用的静态默认参数；
 * - configurableFields 只开放 temperature 和 maxTokens，避免调用方在运行时
 *   修改 apiKey、baseURL 等敏感连接配置；
 * - OPENAI_BASE_URL 是可选的，既支持 OpenAI，也支持 OpenAI 兼容服务。
 */
export const model = await initChatModel(CONFIG[current].MODEL, {
  modelProvider: 'openai',
  apiKey: CONFIG[current].OPENAI_API_KEY,
  configuration: {
    baseURL: CONFIG[current].OPENAI_BASE_URL?.trim() || undefined,
  },
  temperature: 0.7,
  maxTokens: 1_000,
  timeout: 30_000,
  maxRetries: 2,
  configurableFields: ['temperature', 'maxTokens'],
});
