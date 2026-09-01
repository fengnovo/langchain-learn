import {
  mergeConfigs,
  type RunnableConfig,
} from '@langchain/core/runnables';
import { CallbackHandler } from '@langfuse/langchain';
import {
  LangfuseSpanProcessor,
  type LangfuseSpanProcessorParams,
} from '@langfuse/otel';
import { NodeSDK } from '@opentelemetry/sdk-node';

/** Deep Agent 和 CompiledStateGraph 都满足这个最小接口。 */
export interface InvokableAgent<Input, Output> {
  invoke(input: Input, config?: RunnableConfig): Promise<Output>;
}

export interface TraceRunOptions {
  /** Langfuse 中显示的根 trace 名称。 */
  traceName: string;
  userId?: string;
  sessionId?: string;
  /** 默认使用 sessionId，同时也是 LangGraph checkpointer 的 thread_id。 */
  threadId?: string;
  tags?: string[];
  version?: string;
  metadata?: Record<string, unknown>;
  /** 现有 RunnableConfig 会和 Langfuse config 合并，不会丢掉原 callbacks。 */
  config?: RunnableConfig;
  /** CLI、Serverless 建议开启；长驻服务通常依赖批量发送并在停机时 shutdown。 */
  flushAfterInvoke?: boolean;
}

export interface TracedResult<Output> {
  output: Output;
  traceId: string | null;
}

export interface LangfuseTracing {
  invoke<Input, Output>(
    agent: InvokableAgent<Input, Output>,
    input: Input,
    options: TraceRunOptions,
  ): Promise<TracedResult<Output>>;
  flush(): Promise<void>;
  shutdown(): Promise<void>;
}

class LangfuseTracingRuntime implements LangfuseTracing {
  private readonly processor: LangfuseSpanProcessor;
  private readonly sdk: NodeSDK;
  private shutdownPromise: Promise<void> | undefined;

  constructor(options: LangfuseSpanProcessorParams) {
    const publicKey = options.publicKey ?? process.env.LANGFUSE_PUBLIC_KEY;
    const secretKey = options.secretKey ?? process.env.LANGFUSE_SECRET_KEY;

    if (!publicKey?.trim()) {
      throw new Error('缺少 LANGFUSE_PUBLIC_KEY。');
    }
    if (!secretKey?.trim()) {
      throw new Error('缺少 LANGFUSE_SECRET_KEY。');
    }

    this.processor = new LangfuseSpanProcessor({
      ...options,
      publicKey,
      secretKey,
      baseUrl: options.baseUrl ?? process.env.LANGFUSE_BASE_URL,
      environment:
        options.environment ??
        process.env.LANGFUSE_TRACING_ENVIRONMENT ??
        'development',
      release: options.release ?? process.env.LANGFUSE_RELEASE,
      // 长驻服务使用批量发送；单次调用可通过 flushAfterInvoke 立即落库。
      exportMode: options.exportMode ?? 'batched',
    });

    this.sdk = new NodeSDK({
      spanProcessors: [this.processor],
    });
    this.sdk.start();
  }

  async invoke<Input, Output>(
    agent: InvokableAgent<Input, Output>,
    input: Input,
    options: TraceRunOptions,
  ): Promise<TracedResult<Output>> {
    if (this.shutdownPromise) {
      throw new Error('Langfuse tracing 已关闭，不能继续创建 trace。');
    }

    const handler = new CallbackHandler({
      userId: options.userId,
      sessionId: options.sessionId,
      tags: options.tags,
      version: options.version,
      traceMetadata: options.metadata,
    });
    const threadId = options.threadId ?? options.sessionId;
    const tracingConfig: RunnableConfig = {
      callbacks: [handler],
      runName: options.traceName,
      tags: options.tags,
      metadata: {
        ...options.metadata,
        ...(options.userId ? { langfuseUserId: options.userId } : {}),
        ...(options.sessionId
          ? { langfuseSessionId: options.sessionId }
          : {}),
      },
      ...(threadId
        ? {
            configurable: {
              thread_id: threadId,
            },
          }
        : {}),
    };

    // 正确合并数组或 CallbackManager，以及 tags/metadata/configurable。
    const config = mergeConfigs(options.config, tracingConfig) as RunnableConfig;

    try {
      const output = await agent.invoke(input, config);
      return {
        output,
        traceId: handler.last_trace_id,
      };
    } finally {
      if (options.flushAfterInvoke) {
        await this.flush();
      }
    }
  }

  async flush(): Promise<void> {
    if (!this.shutdownPromise) {
      await this.processor.forceFlush();
    }
  }

  shutdown(): Promise<void> {
    this.shutdownPromise ??= this.sdk.shutdown();
    return this.shutdownPromise;
  }
}

let singleton: LangfuseTracing | undefined;

/**
 * 每个 Node.js 进程调用一次。重复调用会返回同一个实例，避免重复注册
 * OpenTelemetry provider。
 *
 * 如果项目已经有自己的 NodeSDK，请不要调用此函数；应把
 * LangfuseSpanProcessor 加到现有 NodeSDK，再单独使用 CallbackHandler。
 */
export function initLangfuseTracing(
  options: LangfuseSpanProcessorParams = {},
): LangfuseTracing {
  singleton ??= new LangfuseTracingRuntime(options);
  return singleton;
}
