import express from "express";
import cors from "cors";
import { runDevAgent } from "@demo/agent-core";
import {
  registry,
  reportAgentError,
  requestCounter,
  requestDuration
} from "@demo/observability";
/**
 * 注意：
 * Sentry + OpenTelemetry 已由 package.json 的 --import
 * 提前加载 apps/api/src/instrumentation.ts。
 */
const app = express();
app.use(
  cors({
    origin: process.env.WEB_ORIGIN ?? "http://localhost:5173"
  })
);
app.use(express.json({ limit: "1mb" }));
app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    mockMode: process.env.MOCK_MODE !== "false"
  });
});
/**
 * Prometheus scrape endpoint。
 */
app.get("/metrics", async (_req, res) => {
  res.setHeader("Content-Type", registry.contentType);
  res.end(await registry.metrics());
});
/**
 * 执行完整 Agent Workflow。
 */
app.post("/api/agent/run", async (req, res) => {
  const requirement =
    typeof req.body?.requirement === "string"
      ? req.body.requirement.trim()
      : "";
  if (!requirement) {
    res.status(400).json({
      error: "requirement is required"
    });
    return;
  }
  requestCounter.inc();
  const endTimer = requestDuration.startTimer();
  try {
    const result = await runDevAgent(requirement);
    res.json(result);
  } catch (error) {
    await reportAgentError(error, {
      requirement: requirement.slice(0, 300)
    });
    res.status(500).json({
      error:
        error instanceof Error
          ? error.message
          : "unknown error"
    });
  } finally {
    endTimer();
  }
});
const port = Number(process.env.API_PORT ?? 3000);
app.listen(port, () => {
  console.log(
    `AI Native API running: http://localhost:${port}`
  );
});
