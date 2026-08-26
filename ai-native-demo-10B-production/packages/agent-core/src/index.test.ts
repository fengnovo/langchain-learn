import assert from "node:assert/strict";
process.env.MOCK_MODE = "true";
process.env.MCP_ENABLED = "false";
const { runDevAgent } = await import("./index.js");
const result = await runDevAgent("开发订单查询模块");
assert.equal(result.artifacts.length, 3);
assert.equal(result.harness.passed, true);
assert.ok(result.quality.score > 0.7);
console.log("agent-core test passed");
