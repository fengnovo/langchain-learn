/**
 * 最小MCP Server思想Demo
 * 实际项目会使用MCP SDK。
 * 这里先模拟：
 * Server暴露工具
 */
/**
 * 模拟代码库
 */
const codeRepository: Record<string, string> = {
 "login.ts":
 `
 export function login(){
 }
 `,
 "order.ts":
 `
 export function createOrder(){
 }
 `
};
/**
 * Tool 1:
 * 搜索代码
 */
function searchCode(keyword:string){
 return Object.entries(codeRepository)
 .filter(([file,content])=>
    content.includes(keyword)
 )
 .map(([file])=>file);
}
/**
 * Tool 2:
 * 读取文件
 */
function readDocument(file:string){
 return codeRepository[file]
 ||
 "not found";
}
/**
 * MCP Server提供能力
 */
const tools = {
 search_code:searchCode,
 read_document:readDocument
};
console.log(
 "MCP Server tools:",
 Object.keys(tools)
);
/**
 * 实际MCP Server：
 * 会通过协议：
 * 接收Client请求
 * 调用对应tool
 * 返回结果
 */
