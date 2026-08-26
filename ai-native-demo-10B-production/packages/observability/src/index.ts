import { trace, SpanStatusCode } from "@opentelemetry/api";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { ConsoleSpanExporter } from "@opentelemetry/sdk-trace-node";
import { LangfuseSpanProcessor } from "@langfuse/otel";
import * as Sentry from "@sentry/node";
import {
  Registry,
  Counter,
  Histogram,
  Gauge,
  collectDefaultMetrics
} from "prom-client";
/**
 * -----------------------------
 * Prometheus Metrics
 * -----------------------------
 */
export const registry = new Registry();
collectDefaultMetrics({ register: registry });
export const requestCounter = new Counter({
  name: "agent_requests_total",
  help: "Total Agent requests",
  registers: [registry]
});
export const failureCounter = new Counter({
  name: "agent_failures_total",
  help: "Total failed Agent requests",
  registers: [registry]
});
export const requestDuration = new Histogram({
  name: "agent_request_duration_seconds",
  help: "Agent request duration",
  buckets: [0.1, 0.3, 0.5, 1, 2, 5, 10, 30],
  registers: [registry]
});
export const qualityGauge = new Gauge({
  name: "agent_quality_score",
  help: "Latest Agent quality score between 0 and 1",
  registers: [registry]
});
/**
 * -----------------------------
 * OpenTelemetry + Langfuse
 * -----------------------------
 * Langfuse v5 基于 OTel。
 * 有 Key 时增加 LangfuseSpanProcessor。
 * 没 Key 时用 ConsoleSpanExporter，Demo 仍可观察 span。
 */
let sdk: NodeSDK | undefined;
export function startTelemetry(): void {
  if (sdk) return;
  const hasLangfuse =
    Boolean(process.env.LANGFUSE_PUBLIC_KEY) &&
    Boolean(process.env.LANGFUSE_SECRET_KEY);
  const spanProcessors = hasLangfuse
    ? [
        new LangfuseSpanProcessor({
          /**
           * Langfuse v5 默认会做 smart span filtering。
           * 本 Demo 的 agent.* 是我们手工创建的 OTel span，
           * 为了教学时能完整看到整棵 Agent Trace，显式全部导出。
           * 真正生产可以改成只导出：
           * - agent.*
           * - gen_ai.*
           * - 关键 tool / rag span
           */
          shouldExportSpan: () => true
        })
      ]
    : undefined;
  sdk = new NodeSDK(
    spanProcessors
      ? { spanProcessors }
      : { traceExporter: new ConsoleSpanExporter() }
  );
  sdk.start();
}
/**
 * 用一个统一 helper 包裹 Agent 节点。
 * 未来换 exporter 时业务代码不需要变。
 */
export async function withSpan<T>(
  name: string,
  fn: () => Promise<T>
): Promise<T> {
  const tracer = trace.getTracer("ai-native-demo");
  return tracer.startActiveSpan(name, async (span) => {
    try {
      const result = await fn();
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.recordException(error as Error);
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : String(error)
      });
      throw error;
    } finally {
      span.end();
    }
  });
}
/**
 * -----------------------------
 * Sentry
 * -----------------------------
 */
export function initSentry(): void {
  if (!process.env.SENTRY_DSN) return;
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: 0.1
  });
}
export async function reportAgentError(
  error: unknown,
  context: Record<string, unknown>
): Promise<void> {
  if (process.env.SENTRY_DSN) {
    Sentry.withScope((scope) => {
      scope.setContext("agent", context);
      Sentry.captureException(error);
    });
  }
  failureCounter.inc();
  await sendFeishuAlert(error, context);
}
/**
 * -----------------------------
 * 飞书告警
 * -----------------------------
 * 仅作为 notification channel。
 * Webhook 未配置时直接跳过。
 */
async function sendFeishuAlert(
  error: unknown,
  context: Record<string, unknown>
): Promise<void> {
  const url = process.env.FEISHU_WEBHOOK_URL;
  if (!url) return;
  const message =
    error instanceof Error ? error.message : String(error);
  await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      msg_type: "text",
      content: {
        text:
          `[AI Agent Alert]\n` +
          `error: ${message}\n` +
          `context: ${JSON.stringify(context)}`
      }
    })
  });
}
