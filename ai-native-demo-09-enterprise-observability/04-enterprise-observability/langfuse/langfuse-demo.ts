/**
 * Langfuse思想Demo
 * 记录LLM调用：
 * Prompt
 * Model
 * Token
 * Cost
 */
const trace={
 id:"trace-001",
 prompt:"分析订单问题",
 model: 'qwen3.7-plus-2026-05-26',
 inputTokens:2000,
 outputTokens:500
};
console.log(
 "Langfuse Trace:",
 trace
);
