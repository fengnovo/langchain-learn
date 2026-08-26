# AI Native Demo 09：Agent Observability
目标：
理解企业级 AI Agent 为什么需要可观测体系。
学习：
-   Agent Trace
-   LLM调用记录
-   Token统计
-   Latency分析
-   Tool调用链
-   Error记录
-   AI成本分析
架构：
    User Request
          |
    Agent Runtime
          |
    --------------------
    LLM Call
    Tool Call
    Memory
    RAG
    --------------------
          |
    Trace Collector
          |
    Dashboard
类似传统系统：
Prometheus + Grafana
但 AI 系统关注：
Prompt
Token
Model
Tool
Reasoning流程
