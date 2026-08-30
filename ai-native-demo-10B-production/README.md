# Demo 10-B：AI Native Dev Platform 生产增强版
> 一个可运行、可拆解学习的 TypeScript / Node.js / React Monorepo。  
> **第一次运行不需要 API Key：默认 `MOCK_MODE=true`。**
这个 Demo 的目标不是堆框架，而是把前面 Demo 01～09 的能力真正串成一条生产链路：
- React AI Console
- Node.js API
- LangGraph `StateGraph`
- fan-out / fan-in 多 Agent
- MCP TypeScript SDK v2
- RAG + qwen3.7-text-embedding + PostgreSQL/pgvector
- AI Coding Harness
- OpenTelemetry
- Langfuse
- Prometheus / Grafana
- Sentry / 飞书告警
- Agent Quality Evaluation
---
## 1. 先看图：系统到底长什么样
![总体架构](./docs/images/architecture.svg)
### 图怎么理解
最上面是用户和 Web UI；API 收到需求后进入 LangGraph。
LangGraph 不是“一个大 Agent”，而是一个**有状态的执行图**：
1. `retrieve_context`：先查企业知识。
2. `mcp_context`：通过 MCP 查代码/文档。
3. `planner`：形成结构化执行计划。
4. `frontend / backend / qa`：三个节点并行执行，也就是 fan-out。
5. `reviewer`：等待三个并行分支全部结束，再 fan-in 聚合。
6. `harness`：做质量门禁。
7. 输出最终结果。
RAG、MCP、Harness、Observability 都不是“Agent 本身”，而是 Agent Runtime 周围的生产能力。
---
## 2. 一次请求的执行链
![请求调用链](./docs/images/request-flow.svg)
这里最值得掌握的是：
```text
用户需求
  ↓
RAG 找知识
  ↓
MCP 找代码/工具
  ↓
Planner
  ↓
Frontend ─┐
Backend  ─┼─ 并行 fan-out
QA       ─┘
  ↓
Reviewer         ← fan-in
  ↓
Harness
  ↓
最终结果
```
这就是你之前看到的高级 AI Native 简历里：
- 任务拆分
- Subagent
- fan-out
- fan-in
- 上下文交接
- 质量门禁
在代码里的对应实现。
---
# 3. Monorepo 目录
```text
ai-native-demo-10B-production
│
├── apps
│   ├── web                 # React AI Console
│   ├── api                 # Express API / metrics
│   └── mcp-server          # 真正 MCP v2 stdio server
│
├── packages
│   ├── shared              # 公共类型
│   ├── llm                 # 模型抽象，Mock / OpenAI-Compatible
│   ├── rag                 # qwen3.7-text-embedding + pgvector
│   ├── mcp-client          # MCP v2 Client
│   ├── harness             # 质量门禁
│   ├── observability       # OTel / Langfuse / Prometheus / Sentry
│   └── agent-core          # LangGraph workflow
│
├── mock-company
│   ├── api-docs
│   ├── engineering-rules
│   ├── business
│   ├── code
│   └── product
│
├── infra
│   ├── postgres
│   ├── prometheus
│   └── grafana
│
├── docs
│   ├── 01-实操手册.md
│   ├── 02-LangGraph原理.md
│   ├── 03-RAG生产化.md
│   ├── 04-MCP生产化.md
│   ├── 05-Harness质量门禁.md
│   └── 06-Observability.md
│
├── docker-compose.yml
├── .env.example
├── package.json
└── pnpm-workspace.yaml
```
---
# 4. 两种运行模式
## 模式 A：Mock 模式——第一次一定先跑这个
`.env`：
```env
MOCK_MODE=true
```
特点：
- 不需要 LLM Key
- 不需要 qwen3.7-text-embedding
- RAG 有内置 mock fallback
- MCP 仍然使用真实 MCP v2 协议
- LangGraph 是真实执行
- Harness 是真实执行
- Prometheus metrics 是真实执行
这样你能先把“架构和调用链”跑通。
---
## 模式 B：Production-like 模式
`.env`：
```env
MOCK_MODE=false
```
再配置：
```env
LLM_API_KEY=...
LLM_BASE_URL=...
LLM_MODEL=qwen3.8-flashEMBEDDING_BASE_URL=http://localhost:11434/v1
EMBEDDING_API_KEY=ollama
EMBEDDING_MODEL=qwen3.7-text-embedding
DATABASE_URL=postgresql://ai_native:ai_native@localhost:5432/ai_native
```
然后：
```bash
ollama pull qwen3.7-text-embedding
docker compose up -d postgres
pnpm rag:seed
pnpm dev
```
此时 RAG 会变成：
```text
Query
 ↓
qwen3.7-text-embedding Embedding
 ↓
pgvector cosine distance
 ↓
TopK
 ↓
Agent Context
```
---
# 5. 第一次运行：最短路径
要求：
```text
Node.js >= 22.12
pnpm
```
复制环境变量：
```bash
cp .env.example .env
```
保持：
```env
MOCK_MODE=true
```
安装：
```bash
pnpm install
```
启动：
```bash
pnpm dev
```
访问：
```text
Web: http://localhost:5173
API: http://localhost:3000
```
在页面输入：
```text
根据公司的订单规范，设计并实现一个订单查询模块。
```
你会看到：
- RAG context
- MCP context
- Plan
- Frontend Agent 输出
- Backend Agent 输出
- QA Agent 输出
- Reviewer
- Harness Gate
- Quality Score
---
# 6. 启动监控基础设施
```bash
pnpm dev:infra
```
打开：
```text
Prometheus: http://localhost:9090
Grafana:    http://localhost:3001
```
Grafana：
```text
用户名：admin
密码：admin
```
API 暴露：
```text
GET http://localhost:3000/metrics
```
可以看到：
```text
agent_requests_total
agent_request_duration_seconds
agent_failures_total
agent_quality_score
```
---
# 7. MCP 单独练习
本项目不是“模拟 MCP 函数”。
`apps/mcp-server` 使用真正的 MCP TypeScript SDK v2：
```text
@modelcontextprotocol/server 2.x
```
运行 Inspector：
```bash
pnpm mcp:inspect
```
你可以直接测试：
```text
search_code
read_company_doc
```
Agent 内部则通过：
```text
@modelcontextprotocol/client
+
StdioClientTransport
```
启动这个 Server 并调用 Tool。
---
# 8. 为什么这才更接近生产
基础 Demo 往往只有：
```text
Prompt → LLM → Answer
```
生产 Agent 需要的是：
```text
             ┌──────── RAG / Context
             │
Request → Runtime → Agent Graph → Tool/MCP
             │               │
             │               └→ Harness
             │
             └──────── Observability
```
重点不再是“模型会不会回答”，而是：
- 能不能稳定执行
- 上下文是否正确
- 工具是否安全
- 多节点能否恢复
- 输出是否经过验证
- 成本和延迟是否可观测
- 出错后能不能定位
---
# 9. 各 Demo 和本项目的映射
| 之前 Demo | 10-B 中的位置 |
|---|---|
| Demo01 Streaming | Web / API |
| Demo02 Tool Calling | MCP Client |
| Demo03 RAG | packages/rag |
| Demo04 Context Engineering | retrieve_context / mcp_context |
| Demo05 Workflow | LangGraph StateGraph |
| Demo06 Multi-Agent | frontend/backend/qa fan-out |
| Demo07 MCP | apps/mcp-server + packages/mcp-client |
| Demo08 Harness | packages/harness |
| Demo09 Observability | packages/observability |
---
# 10. 推荐学习顺序
不要一次看完所有代码。
按下面顺序：
```text
1. apps/api
2. packages/agent-core
3. packages/llm
4. packages/rag
5. apps/mcp-server
6. packages/mcp-client
7. packages/harness
8. packages/observability
9. apps/web
```
每一块对应 `docs/` 里一个实操文档。
---
# 11. 关键版本说明
本 Demo 按 2026-08 的当前稳定技术线设计：
- Node.js：22+
- React：19
- Vite：8
- LangGraph JS：1.4
- MCP TypeScript SDK：2.0 stable line
- OpenAI JS SDK：7
- pgvector-node：0.3
- Langfuse JS/TS：5
- Sentry Node：10
- prom-client：15
重点不是死记版本，而是掌握这些模块之间的职责边界。
---
# 12. 面试时怎么介绍这个项目
可以概括成：
> 基于 TypeScript Monorepo 构建 AI Native Dev Platform，通过 LangGraph StateGraph 实现多 Agent fan-out/fan-in 编排；以 MCP v2 标准接入代码与企业文档工具；使用 qwen3.7-text-embedding + pgvector 构建企业 RAG；通过 Harness 在 Agent 输出后执行安全及质量门禁；通过 OpenTelemetry、Langfuse、Prometheus、Grafana 与 Sentry 建立 Agent Trace、Token、延迟、错误和质量评分体系。系统支持 Mock/Production 双模式，方便本地开发和生产环境渐进接入。
这已经不是“会调 LLM API”的项目，而是一套小型 AI Engineering Platform。
---
# 13. 生产部署时还要补什么？
这个 Demo 已经把生产“形态”搭出来，但真正公司上线仍要继续做：
- Docker image 固定版本甚至 digest，不要长期使用 `latest`。
- Agent State 使用持久化 checkpointer。
- MCP Server 做 OAuth / machine auth / audit。
- RAG 增加文档 ACL 与 Rerank。
- LLM 增加 timeout / retry / fallback / budget。
- Harness 真正运行 ESLint / Typecheck / Unit / E2E。
- API 增加鉴权、限流、租户隔离。
- Secret 使用 Secret Manager，而不是 `.env` 明文部署。
- Grafana / Prometheus 增加长期存储与正式 Alertmanager。
