/**
 * OpenTelemetry思想Demo
 * 真实项目：
 * SDK自动采集请求链路。
 * 这里模拟：
 * Agent -> LLM -> Tool
 * 每一步产生Span。
 */
function createSpan(name:string){
  return {
    name,
    start:Date.now()
  };
}
function endSpan(span:any){
  return {
    ...span,
    duration:Date.now()-span.start
  };
}
const llmSpan=createSpan("LLM Call");
// 模拟模型调用
console.log(endSpan(llmSpan));
const toolSpan=createSpan("MCP Tool");
// 模拟工具调用
console.log(endSpan(toolSpan));
