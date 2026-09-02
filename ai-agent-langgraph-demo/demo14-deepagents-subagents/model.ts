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
 * demo14 专用模型：
 *
 * DeepAgent 的 write_file / edit_file 调用会把整份文件内容放进工具参数，
 * 输出长度明显大于普通问答。根目录 model.ts 的 maxTokens=1000 会导致参数
 * 生成到一半被截断（工具调用丢失、回复为空），因此这里放宽到 4000。
 */
export const model = await initChatModel(requiredEnv('MODEL'), {
  modelProvider: 'openai',
  apiKey: requiredEnv('OPENAI_API_KEY'),
  configuration: {
    baseURL: requiredEnv('OPENAI_BASE_URL'),
  },
  temperature: 0.7,
  maxTokens: 4_000,
  timeout: 60_000,
  maxRetries: 2,
  configurableFields: ['temperature', 'maxTokens'],
});
