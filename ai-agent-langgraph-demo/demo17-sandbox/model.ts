import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { initChatModel } from 'langchain/chat_models/universal';

// 无论从项目根目录还是其他目录执行，都固定读取项目根目录的 .env。
dotenv.config({
  path: fileURLToPath(new URL('../.env', import.meta.url)),
  quiet: true,
});

function requiredEnv(
  name: 'OPENAI_API_KEY' | 'OPENAI_BASE_URL' | 'MODEL',
): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`缺少环境变量 ${name}，请先在项目根目录的 .env 中配置。`);
  }

  return value;
}

/**
 * demo17 沙箱专用模型：
 *
 * 沙箱 Agent 需要生成 write_file / edit_file 的长参数和 execute 命令，
 * maxTokens 过小（如根目录的 1000）会把工具参数截断（工具调用丢失、
 * 回复为空），与 demo13 的教训一致，这里放宽到 4000。
 */
export const model = await initChatModel(requiredEnv('MODEL'), {
  modelProvider: 'openai',
  apiKey: requiredEnv('OPENAI_API_KEY'),
  configuration: {
    baseURL: requiredEnv('OPENAI_BASE_URL'),
  },
  timeout: 60_000,
  maxRetries: 2,
  configurableFields: ['temperature', 'maxTokens'],
});
