# ai-agent-langsmith-demo

LangGraph.js 官方项目模板（[new-langgraphjs-project](https://github.com/langchain-ai/new-langgraphjs-project)）改造版，用于学习 **LangGraph + LangSmith** 的可视化调试与追踪。

项目主体在子目录 [`new-langgraphjs-project-main/`](./new-langgraphjs-project-main) 中：一个最简单、可自行扩展的 LangGraph 聊天机器人。通过 `langgraph.json` 声明图入口后，可用 [LangGraph CLI](https://langchain-ai.github.io/langgraph/concepts/langgraph_cli/) 在本地启动 **LangGraph Server**，并用 **LangGraph Studio** 可视化地单步调试；配置好 `LANGSMITH_API_KEY` 后，图运行的每一步（节点、消息）都会记录到 LangSmith。

> 与 `ai-agent-langsmith`（一个 deepagents 的 invoke 调用，靠环境变量自动 trace）不同，这里的重点是用官方模板跑起 LangGraph 平台 + LangSmith 观测的完整本地开发闭环。

## 环境变量

模板的 `.env.example` 内容为：

```dotenv
LANGSMITH_API_KEY=lsv2_...
```

实际代码（`src/agent/graph.ts`）中的模型为 Anthropic 兼容接口，因此本地 `.env` 一般还需要：

```dotenv
LANGSMITH_API_KEY=lsv2_...

ANTHROPIC_API_KEY=你的密钥
ANTHROPIC_BASE_URL=https://api.anthropic.com   # 或你的代理/中转地址
MODEL=claude-sonnet-4-5                         # 填入实际使用的模型 ID
```

## 快速开始

进入项目子目录执行（模板使用 yarn）：

```bash
cd new-langgraphjs-project-main

# 1. 安装依赖
yarn install

# 2. 创建并填写 .env（含 LANGSMITH_API_KEY）
cp .env.example .env

# 3. 安装 LangGraph CLI 并启动本地 LangGraph Server
npx @langchain/langgraph-cli dev
```

启动后：

- LangGraph Server 提供图 API；打开控制台输出中的 Studio 地址即可进入 **LangGraph Studio**，输入消息单步执行并观察图状态流转。
- 若正确配置了 `LANGSMITH_API_KEY`，本次运行会产生 trace，在 LangSmith 的 **Tracing / Traces** 中按项目筛选查看。

## 项目结构

```
ai-agent-langsmith-demo
└── new-langgraphjs-project-main/   # LangGraph.js 官方模板改造版
    ├── langgraph.json              # 声明图入口 "./src/agent/graph.ts:graph" 与 .env
    ├── .env.example                # 环境变量模板
    ├── package.json / yarn.lock    # yarn 管理依赖
    ├── src
    │   └── agent
    │       ├── graph.ts            # 图定义：callModel 节点 + 条件路由，导出编译后的 graph
    │       └── state.ts            # StateAnnotation：messages 通道与归约器
    └── scripts/checkLanggraphPaths.js  # 校验 langgraph.json 路径的脚本
```

## 代码要点

- `src/agent/state.ts`：定义 `messages` 通道，使用 `messagesStateReducer` 归约器，使消息按 ID 合并/追加。
- `src/agent/graph.ts`：唯一节点 `callModel` 调用 `ChatAnthropic`（读 `.env` 中 `MODEL`/`ANTHROPIC_*`），通过条件边路由决定结束或继续调用模型。
- 由于本模板默认图结构较简单，可以以此为骨架添加新节点、工具（`tools`）、checkpointer 等。

## 更多

- 子目录自带的 `README.md` 保留了官方的模板说明（含 CI、Studio 截图），可直接阅读。
- 相关教程：[LangGraph Platform - LangGraph Server](https://langchain-ai.github.io/langgraph/concepts/langgraph_server/)、[LangGraph CLI](https://langchain-ai.github.io/langgraph/concepts/langgraph_cli/)、[LangGraph Studio](https://langchain-ai.github.io/langgraph/concepts/langgraph_studio/)。
