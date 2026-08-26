# 04 MCP 生产化
## 本 Demo 为什么是真 MCP
Server：
```text
@modelcontextprotocol/server
McpServer
serveStdio
```
Client：
```text
@modelcontextprotocol/client
StdioClientTransport
```
它们之间走 stdio JSON-RPC。
不是普通函数模拟。
---
## Server Tool
提供：
```text
search_code(keyword)
read_company_doc(path)
```
Tool 要有：
- 明确职责
- Zod input schema
- 参数边界
- readOnlyHint
- 错误返回
---
## stdout 为什么不能 console.log？
stdio MCP：
```text
stdout = 协议通道
```
如果 Server 打：
```ts
console.log("hello")
```
就会把 JSON-RPC 流污染。
所以 MCP Server 日志必须：
```ts
console.error()
```
---
## 生产部署
本地代码工具：
```text
stdio
```
远程共享工具：
```text
Streamable HTTP
```
远程模式还应该增加：
- OAuth / machine auth
- tenant isolation
- audit log
- rate limit
- timeout
- retry
- destructive tool approval
