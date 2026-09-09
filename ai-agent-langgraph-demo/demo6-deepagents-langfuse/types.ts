/**
 * Langfuse 追踪适配器的类型定义。
 *
 * 这里只放纯类型(interface / type),不含运行时实现,
 * 方便其它模块在不想引入 OTel / Langfuse 运行时依赖的情况下复用契约。
 */

import type { RunnableConfig } from '@langchain/core/runnables';

/**
 * 适配器能包裹的最小 agent 契约。
 *
 * 只要一个对象有 `invoke(input, config)` 方法,就满足这个接口,
 * 因此同时支持:
 * - `createDeepAgent()` 返回的 DeepAgent
 * - `StateGraph.compile()` 返回的 CompiledStateGraph
 * - 任意 LangChain Runnable / 自定义 agent
 *
 * 之所以不直接用 LangChain 的 `Runnable` 类型,是为了避免强制依赖
 * `@langchain/core` 的完整类型,让适配器可以复用到非 LangChain 场景。
 */
export interface InvokableAgent<Input, Output> {
  invoke(input: Input, config?: RunnableConfig): Promise<Output>;
}

/**
 * 调用 `LangfuseTracing.invoke()` 时的运行参数。
 *
 * 这是一个**适配器自定义的混合配置**:
 * - `traceName / userId / sessionId / tags / version / metadata` → 喂给 Langfuse 的 `CallbackHandler`
 * - `threadId` → LangGraph checkpointer 的 `configurable.thread_id`
 * - `config` → 原始 LangChain `RunnableConfig`(如 `recursionLimit`、已有 callbacks),会与 tracing 配置合并
 * - `flushAfterInvoke` → 适配器本身的行为开关
 *
 * 详见 README 的字段归属表。
 */
export interface TraceRunOptions {
  /** Langfuse 中显示的根 trace 名称,映射为 LangChain 的 `runName`。 */
  traceName: string;

  /** Langfuse 用户 ID,用于按用户聚合 / 筛选 trace。 */
  userId?: string;

  /** Langfuse 会话 ID;未单独指定 `threadId` 时也作为 LangGraph 的 `thread_id`。 */
  sessionId?: string;

  /** LangGraph checkpointer 使用的线程 ID,可与 Langfuse session 分开设置。 */
  threadId?: string;

  /** Langfuse / LangChain 双端标签,会向子调用传播。 */
  tags?: string[];

  /** Langfuse 中标记的 Agent / Prompt 版本,便于做 A/B 对比。 */
  version?: string;

  /** 自定义 JSON 元数据,会同时写入 Langfuse trace metadata 和 LangChain metadata。 */
  metadata?: Record<string, unknown>;

  /** 已有的 `RunnableConfig`,会与 tracing 配置合并,不丢原有 callbacks / configurable。 */
  config?: RunnableConfig;

  /**
   * 调用结束后是否立即 `forceFlush()` 把 trace 发出去。
   * - CLI / Serverless:建议开启,避免进程退出时数据还没发完。
   * - 长驻服务:通常依赖批量发送,收到停机信号时统一 `shutdown()`。
   */
  flushAfterInvoke?: boolean;
}

/**
 * `LangfuseTracing.invoke()` 的返回值。
 *
 * `traceId` 可能为 `null`:例如回调尚未生成 trace,或 Langfuse SDK 未返回 last_trace_id。
 */
export interface TracedResult<Output> {
  /** agent 的原始输出。 */
  output: Output;
  /** Langfuse trace ID,可能为 null。 */
  traceId: string | null;
}

/**
 * Langfuse 追踪运行时的对外接口。
 *
 * 由 `LangfuseTracingRuntime` class 实现,通过 `initLangfuseTracing()` 单例获取。
 * 抽成 interface 是为了:
 * - 业务侧可以 mock / 替换实现做单测
 * - 后续可以接入其它 OTel 收集器而不改调用方
 */
export interface LangfuseTracing {
  /** 用 tracing 配置包裹一次 agent 调用,返回结果 + traceId。 */
  invoke<Input, Output>(
    agent: InvokableAgent<Input, Output>,
    input: Input,
    options: TraceRunOptions,
  ): Promise<TracedResult<Output>>;

  /** 立即把已生成但未发送的 span 推送到 Langfuse,不关闭 SDK。 */
  flush(): Promise<void>;

  /** 关闭 OTel SDK(幂等),进程退出前调用一次以确保数据完整落库。 */
  shutdown(): Promise<void>;
}
