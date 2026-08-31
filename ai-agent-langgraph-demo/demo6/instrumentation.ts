import dotenv from 'dotenv';
import { LangfuseSpanProcessor } from '@langfuse/otel';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { fileURLToPath } from 'node:url';

// instrumentation 必须先于 LangChain/LangGraph 初始化，并固定读取项目根目录的 .env。
dotenv.config({
  path: fileURLToPath(new URL('../.env', import.meta.url)),
  quiet: true,
});

for (const name of ['LANGFUSE_PUBLIC_KEY', 'LANGFUSE_SECRET_KEY'] as const) {
  if (!process.env[name]?.trim()) {
    throw new Error(`缺少环境变量 ${name}，请先在项目根目录的 .env 中配置。`);
  }
}

export const langfuseSpanProcessor = new LangfuseSpanProcessor({
  // 短命令行示例使用 immediate，避免进程退出前批量队列尚未发送。
  exportMode: 'immediate',
  environment: process.env.LANGFUSE_TRACING_ENVIRONMENT?.trim() || 'development',
});

const sdk = new NodeSDK({
  spanProcessors: [langfuseSpanProcessor],
});

sdk.start();

let shutdownPromise: Promise<void> | undefined;

/** 等待所有 trace 发完，再关闭 OpenTelemetry。只会执行一次。 */
export function shutdownLangfuse(): Promise<void> {
  shutdownPromise ??= sdk.shutdown();
  return shutdownPromise;
}
