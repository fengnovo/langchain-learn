import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { initLangfuseTracing } from './deepagents-langfuse.js';

// instrumentation 必须先于 LangChain/LangGraph 初始化，并固定读取项目根目录的 .env。
dotenv.config({
  path: fileURLToPath(new URL('../.env', import.meta.url)),
  quiet: true,
});

export const langfuseTracing = initLangfuseTracing();

/** 等待所有 trace 发完，再关闭 OpenTelemetry。只会执行一次。 */
export function shutdownLangfuse(): Promise<void> {
  return langfuseTracing.shutdown();
}
