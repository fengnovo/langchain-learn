/**
 * Demo09 Agent Observability
 * 模拟Agent执行过程产生Trace
 */
/**
 * Trace数据结构
 */
type Trace = {
  traceId: string;
  steps: any[];
};
const trace: Trace = {
  traceId: 'trace-001',
  steps: [],
};
/**
 * 记录LLM调用
 */
function recordLLM() {
  trace.steps.push({
    type: 'llm',
    model: 'qwen3.8-max-0902',
    inputTokens: 1200,
    outputTokens: 300,
    latency: 2500,
  });
}
/**
 * 记录Tool调用
 */
function recordTool() {
  trace.steps.push({
    type: 'tool',
    name: 'search_code',
    latency: 300,
    success: true,
  });
}
/**
 * 模拟Agent执行
 */
function runAgent() {
  console.log('Agent开始');
  recordLLM();
  recordTool();
  recordLLM();
  console.log('Trace:', JSON.stringify(trace, null, 2));
}
runAgent();
