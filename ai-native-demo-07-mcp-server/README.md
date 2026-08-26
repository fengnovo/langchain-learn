# AI Native Demo 07：MCP Server 开发
目标：
理解 MCP（Model Context Protocol）如何让 AI Agent 连接外部工具。
学习：
- MCP Client
- MCP Server
- Tool暴露
- Resource概念
- Agent发现工具
- 企业内部MCP设计
架构：
```
AI Agent
   |
MCP Client
   |
MCP Server
   |
-----------------
文件系统
数据库
Git
飞书
内部API
-----------------
```
本Demo实现：
一个企业代码查询 MCP Server。
提供工具：
1. search_code
2. read_document
Agent可以调用这些工具获取外部信息。
