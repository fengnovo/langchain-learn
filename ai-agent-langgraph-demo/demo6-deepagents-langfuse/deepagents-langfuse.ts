/**
 * Langfuse 追踪适配器(实现层)。
 *
 * 本文件只负责运行时实现:注册 OpenTelemetry provider、构造
 * CallbackHandler、把 agent 调用包成一次 trace。所有对外类型(契约)
 * 都移到了 `./types.ts`,方便复用而无需引入 OTel 运行时依赖。
 *
 * 三件事:
 *  1. 构造函数注册全局 OTel provider(LangfuseSpanProcessor + NodeSDK)
 *  2. invoke() 把 agent 调用包成一次 trace,返回结果 + traceId
 *  3. flush() / shutdown() 管理 trace 发送与 SDK 生命周期
 *
 * 进程级单例,通过 `initLangfuseTracing()` 获取,避免重复注册 OTel provider。
 */

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

import type {
  InvokableAgent,
  LangfuseTracing,
  TraceRunOptions,
  TracedResult,
} from './types.js';

export type {
  InvokableAgent,
  LangfuseTracing,
  TraceRunOptions,
  TracedResult,
} from './types.js';

/**
 * `LangfuseTracing` 的默认实现。
 *
 * 为什么不直接 export class 而走 `initLangfuseTracing()` 单例工厂:
 * - OTel 的 NodeSDK 全局 provider 只能注册一次,多次 `new` 会触发
 *   "Another config detector already registered" 警告,且 provider 被覆盖后
 *   旧 spanProcessor 会失效。
 * - 单例工厂让所有调用方共享同一个 SDK / processor,便于统一 flush / shutdown。
 */
class LangfuseTracingRuntime implements LangfuseTracing {
  /** Langfuse OTel span processor,负责把 span 发到 Langfuse 后端。 */
  private readonly processor: LangfuseSpanProcessor;

  /** OTel Node SDK,持有 provider 注册,shutdown 时统一关停。 */
  private readonly sdk: NodeSDK;

  /**
   * shutdown 的 in-flight Promise,保证幂等。
   * 第一次调用时赋值,后续直接返回同一个 Promise,避免并发 shutdown。
   */
  private shutdownPromise: Promise<void> | undefined;

  /**
   * @param options 直接透传给 `LangfuseSpanProcessor`,支持 publicKey / secretKey /
   * baseUrl / environment / release / exportMode 等字段。
   * 未提供的字段会回退到对应环境变量。
   */
  constructor(options: LangfuseSpanProcessorParams) {
    // 环境变量兜底,允许调用方不传 key 而依赖 .env。
    const publicKey = options.publicKey ?? process.env.LANGFUSE_PUBLIC_KEY;
    const secretKey = options.secretKey ?? process.env.LANGFUSE_SECRET_KEY;

    // 早期失败:缺 key 时直接抛错,避免后面静默不产 trace。
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
      // 长驻服务使用批量发送,降低每请求开销;
      // 单次调用可通过 invoke 的 flushAfterInvoke 立即 forceFlush()。
      exportMode: options.exportMode ?? 'batched',
    });

    this.sdk = new NodeSDK({
      spanProcessors: [this.processor],
    });
    // 必须在创建任何 LangChain / LangGraph 对象前 start(),
    // 否则 provider 还没就位,早期 span 会丢。instrumentation.ts 保证了这个顺序。
    this.sdk.start();
  }

  /**
   * 用 tracing 配置包裹一次 agent 调用。
   *
   * 流程:
   *  1. 新建 `CallbackHandler`,接收 Langfuse 字段(userId/sessionId/tags/...)
   *  2. 拼 tracing `RunnableConfig`:callbacks / runName / tags / metadata / configurable.thread_id
   *  3. `mergeConfigs(用户原 config, tracingConfig)` 合并,不丢用户已有 callbacks
   *  4. `agent.invoke(input, config)`
   *  5. 取 `handler.last_trace_id` 一起返回
   *  6. (可选) flushAfterInvoke 立即推送
   const { output: result, traceId } = await langfuseTracing.invoke(
       graph,
       { messages: [{ role: 'user', content: prompt }] },
       {
         traceName: 'demo6-langgraph-agent',
         userId,
         sessionId,
         tags: ['demo6', 'langgraph', 'langfuse'],
         metadata: {
           example: 'calculator-agent',
         },
         config: {
           recursionLimit: 10,
         },
         flushAfterInvoke: true,
       },
     );
   */
  async invoke<Input, Output>(
    agent: InvokableAgent<Input, Output>,
    input: Input,
    options: TraceRunOptions,
  ): Promise<TracedResult<Output>> {
    // 已 shutdown 后拒绝新 trace,避免 dangling span。
    if (this.shutdownPromise) {
      throw new Error('Langfuse tracing 已关闭,不能继续创建 trace。');
    }

    // CallbackHandler 是 @langfuse/langchain 提供的 LangChain callback,
    // 挂到 RunnableConfig.callbacks 上后,LangChain / LangGraph 会在每个 run 触发它,
    // 进而把 LLM generation / tool call / graph node 都记录成 Langfuse span。
    const handler = new CallbackHandler({
      userId: options.userId,
      sessionId: options.sessionId,
      tags: options.tags,
      version: options.version,
      traceMetadata: options.metadata,
    });

    // thread_id 优先用显式指定的,否则用 sessionId,方便单 session 复用同一 checkpoint 链。
    const threadId = options.threadId ?? options.sessionId;

    const tracingConfig: RunnableConfig = {
      // 把 handler 挂到 callbacks,LangChain 会向所有子 run 传播。
      callbacks: [handler],
      // runName 会成为 Langfuse 根 trace 的显示名。
      runName: options.traceName,
      tags: options.tags,
      metadata: {
        ...options.metadata,
        // Langfuse 动态身份字段:TS 版通过 metadata 注入,
        // 用于在 Langfuse UI 里按 user/session 筛选(与 Python 版一致)。
        ...(options.userId ? { langfuseUserId: options.userId } : {}),
        ...(options.sessionId
          ? { langfuseSessionId: options.sessionId }
          : {}),
      },
      // thread_id 走 configurable,LangGraph checkpointer 用它隔离不同会话的状态。
      ...(threadId
        ? {
            configurable: {
              thread_id: threadId,
            },
          }
        : {}),
    };

    // mergeConfigs 会正确合并数组化的 callbacks、合并 tags/metadata、
    // 深合并 configurable,从而保留用户原 config 中的 recursionLimit 等。
    const config = mergeConfigs(options.config, tracingConfig) as RunnableConfig;

    try {
      const output = await agent.invoke(input, config);
      return {
        output,
        // last_trace_id 是 CallbackHandler 在 LLM run 结束后写入的根 trace ID;
        // 若调用链未触发任何 LLM run(纯工具),可能为 undefined。
        traceId: handler.last_trace_id,
      };
    } finally {
      // finally 保证即使 agent 抛错也能 flush,避免 trace 丢失。
      if (options.flushAfterInvoke) {
        await this.flush();
      }
    }
  }

  /** 立即把已生成但未发送的 span 推送到 Langfuse,但不关闭 SDK。 */
  async flush(): Promise<void> {
    // 已 shutdown 后不再 flush,避免对已关停的 processor 调用。
    if (!this.shutdownPromise) {
      await this.processor.forceFlush();
    }
  }

  /**
   * 关闭 OTel SDK(幂等)。
   *
   * 第一次调用会真正执行 `sdk.shutdown()`,内部会 forceFlush + 注销 provider;
   * 后续调用直接返回同一个 Promise,保证并发调用安全。
   *
   * 进程退出前必须调用一次(见 instrumentation.ts 的 shutdownLangfuse),
   * 否则 batched 模式下未发送的 trace 会丢失。
   */
  shutdown(): Promise<void> {
    this.shutdownPromise ??= this.sdk.shutdown();
    return this.shutdownPromise;
  }
}

/** 进程级单例,延迟初始化。 */
let singleton: LangfuseTracing | undefined;

/**
 * 初始化 Langfuse 追踪,返回进程级单例。
 *
 * 重复调用返回同一个实例,避免重复注册 OTel provider。
 *
 * 注意:如果项目已经有自己的 NodeSDK,不要调用此函数;
 * 应把 `LangfuseSpanProcessor` 直接加到现有 NodeSDK 的 spanProcessors,
 * 再单独使用 `CallbackHandler`。
 *
 * @param options 直接透传给 `LangfuseSpanProcessor`,缺省字段走环境变量。
 */
export function initLangfuseTracing(
  options: LangfuseSpanProcessorParams = {},
): LangfuseTracing {
  singleton ??= new LangfuseTracingRuntime(options);
  return singleton;
}
