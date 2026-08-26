import {
  initSentry,
  startTelemetry
} from "@demo/observability";
/**
 * 这个文件必须尽量早执行。
 * 为什么？
 * - Sentry 的 Node auto instrumentation 要在业务模块加载前初始化。
 * - OpenTelemetry 同理，越早启动越容易捕获完整链路。
 * package.json 通过 Node --import 在 index.ts 之前加载它。
 */
startTelemetry();
initSentry();
