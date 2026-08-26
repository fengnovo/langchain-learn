/**
 * MCP Client模拟
 * 负责调用外部工具
 */
export function callTool(name:string){
 return {
  tool:name,
  result:"mock result"
 };
}
