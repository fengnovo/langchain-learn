# Demo 10：AI Native Dev Platform 综合实战
这是整个 AI Native 学习路线的综合项目。
目标：
把前面的能力组合成一个小型企业 AI 开发平台。
包含：
-   Monorepo架构
-   AI Console
-   Agent Orchestrator
-   Multi-Agent
-   MCP
-   RAG
-   Harness质量门禁
-   Observability
------------------------------------------------------------------------
# 一、整体架构图
                             用户
                              |
                        Web Console
                      React + TypeScript
                              |
                              |
                         API Gateway
                              |
                    Agent Orchestrator
                              |
            -----------------------------------
            |              |                 |
        Planner       Coder Agent       Reviewer
            |
            |
        Context Engineering
            |
     ------------------------------------------------
     |                 |                |            |
    RAG            MCP Client       Harness    Observability
     |                 |                |            |
    知识库          Tools            质量检查     Trace/Metric
                     |
            ----------------
            Git
            Feishu
            Sentry
            Figma
            ----------------
------------------------------------------------------------------------
# 二、为什么使用Monorepo？
企业AI平台通常包含：
前端：
apps/web
后端：
apps/api
公共能力：
packages/\*
结构：
    ai-native-platform
    ├── apps
    │   ├── web
    │   └── api
    ├── packages
    │   ├── agent-core
    │   ├── rag
    │   ├── mcp-client
    │   ├── harness
    │   └── observability
    └── docs
优势：
1.共享类型
2.统一依赖
3.统一发布
4.方便AI Agent理解整个工程
------------------------------------------------------------------------
# 三、核心流程图
## 用户开发需求
    用户：
    实现订单查询功能
            |
            v
    Planner Agent
    拆分任务
            |
            v
    Coder Agent
    生成代码
            |
            v
    MCP
    查询已有代码
            |
            v
    RAG
    查询业务规范
            |
            v
    Harness
    Lint/Test/Security
            |
            v
    Reviewer Agent
            |
            v
    提交结果
------------------------------------------------------------------------
# 四、目录职责
## agent-core
负责：
Agent生命周期。
包括：
-   Task
-   State
-   Workflow
------------------------------------------------------------------------
## mcp-client
负责：
连接外部工具。
例如：
-   Git
-   飞书
-   Sentry
------------------------------------------------------------------------
## rag
负责：
企业知识。
流程：
    Document
    ↓
    Embedding
    ↓
    Vector Search
    ↓
    Context
------------------------------------------------------------------------
## harness
负责：
AI代码质量控制。
流程：
    Generate
    ↓
    Validate
    ↓
    Fix
    ↓
    Commit
------------------------------------------------------------------------
## observability
负责：
记录：
-   Trace
-   Token
-   Error
-   Cost
------------------------------------------------------------------------
# 五、运行
环境：
Node \>=20
安装：
    pnpm install
启动：
    pnpm dev
访问：
    http://localhost:5173
------------------------------------------------------------------------
# 六、学习重点
完成后应该掌握：
1.  如何设计Agent Runtime
2.  如何组织AI工程Monorepo
3.  如何组合RAG/MCP/Agent
4.  如何保证AI输出质量
5.  如何运营生产级Agent
------------------------------------------------------------------------
# 七、后续企业升级
可以继续增加：
-   LangGraph
-   pgvector
-   Kubernetes
-   OpenTelemetry
-   Langfuse
-   CI/CD
-   GitHub Actions
