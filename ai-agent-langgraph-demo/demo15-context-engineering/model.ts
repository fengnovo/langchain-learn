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

function buildModel(extraKwargs?: Record<string, unknown>) {
  return initChatModel(requiredEnv('MODEL'), {
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
    modelKwargs: extraKwargs,
  });
}

/**
 * demo15 专用模型：
 *
 * - maxTokens 放宽到 4000：DeepAgent 的 write_file / edit_file 会把整份文件
 *   内容放进工具参数，根目录 model.ts 的 1000 会导致参数被截断；
 * - selectorModel：供 llmToolSelectorMiddleware（工具选择）使用，内部走
 *   withStructuredOutput（强制 tool_choice），qwen3.8 思考模式下接口不接受
 *   该参数，因此显式关闭思考模式（同 demo10 / demo12-demo4 的处理）。
 */
export const model = await buildModel();
export const selectorModel = await buildModel({ enable_thinking: false });
