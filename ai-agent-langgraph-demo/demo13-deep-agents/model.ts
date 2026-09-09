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
 * demo13 专用模型：
 *
 * DeepAgent 的 write_file / edit_file 调用会把整份文件内容放进工具参数，
 * 输出长度明显大于普通问答。根目录 model.ts 的 maxTokens=1000 会导致参数
 * 生成到一半被截断（工具调用丢失、回复为空），因此这里放宽到 4000。
 *
 * 性能注意：DeepAgent 一次任务包含大量模型调用（规划 todo_list、搜索、
 * write_file/edit_file、摘要等），且系统提示与上下文都很长。qwen3.8 默认
 * 开启思考模式（thinking），每次调用都先生成长推理，叠加长上下文 / 长工具
 * 参数生成时单次很容易超过 60s 而「Request timed out」，再经 maxRetries
 * 重试会成倍放大耗时（十几分钟后超时退出）。这里与 demo12 的 demo4/demo10
 * 一致，用 modelKwargs 显式关闭思考模式以大幅降低延迟与 token；同时把
 * timeout 放宽到 5 分钟，容忍偶发的长 write_file 生成。
 */
export const model = await initChatModel(requiredEnv('MODEL'), {
  modelProvider: 'openai',
  apiKey: requiredEnv('OPENAI_API_KEY'),
  configuration: {
    baseURL: requiredEnv('OPENAI_BASE_URL'),
  },
  temperature: 0.7,
  maxTokens: 4_000,
  timeout: 300_000,
  maxRetries: 2,
  // qwen3.8：关闭思考模式，显著提速（思考模式下长任务易超时）
  modelKwargs: { enable_thinking: false },
  configurableFields: ['temperature', 'maxTokens'],
});
