# MCP企业设计
## Tool设计原则
不要暴露：
万能接口。
应该：
一个工具一个职责。
例如：
search_code
read_file
query_doc
## 安全
MCP Server需要控制：
权限
参数校验
访问范围
日志审计
