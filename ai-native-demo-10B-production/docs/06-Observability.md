# 06 Agent Observability
传统服务关注：
```text
QPS / P95 / P99 / Error Rate
```
Agent 还要增加：
```text
Model
Prompt
Token
Tool
RAG Context
Agent Node
Quality Score
Cost
```
---
## Prometheus
Demo 中：
```text
agent_requests_total
agent_failures_total
agent_request_duration_seconds
agent_quality_score
```
Prometheus 负责指标趋势。
---
## OpenTelemetry
API 启动时初始化 NodeSDK。
Agent 节点用 span 表示：
```text
agent.workflow
agent.rag
agent.mcp
agent.planner
agent.frontend
...
```
---
## Langfuse
Langfuse JS/TS 当前 tracing 建立在 OpenTelemetry 上。
配置 Key 后：
```text
OTel Span
 ↓
LangfuseSpanProcessor
 ↓
Langfuse
```
适合分析：
- Agent Trace
- LLM generation
- Prompt
- token / cost
- evaluation
---
## Sentry
负责代码异常：
```text
uncaught error
tool exception
database failure
```
它和 Langfuse 的职责不同：
```text
Sentry   → 软件错误
Langfuse → AI调用和Agent行为
```
---
## 飞书
飞书不是 Observability 数据库。
它是：
```text
Notification Channel
```
只有真正需要人处理时才发告警。
---
## Agent Quality Score
Demo 中做教学评分：
```text
contextCoverage
artifactCoverage
reviewPassed
harnessPassed
```
生产可以升级：
- LLM-as-a-Judge
- golden dataset
- task success
- tool accuracy
- faithfulness
- user feedback
