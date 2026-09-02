# ai-agent-langgraph-demo

基于 [LangGraph.js](https://langchain-ai.github.io/langgraphjs/) 的 Agent 学习工程，包含两部分：

1. **`src/`：一个可运行的 HTTP Agent 服务** —— 用显式的"规划 → 选择工具 → 执行工具 → 总结"线性图，把用户问题走完一条固定流水线后返回答案（Express，端口 `3001`）。
2. **`demo1` ~ `demo7`：7 个渐进式学习目录** —— 从 LangGraph 基础、记忆、checkpoint 持久化、SSE 流式，到 LangChain 模型 API、Langfuse 追踪、LlamaIndex RAG，逐个叠加新能力。

> 各 `demoN` 目录下普遍自带一份更详细的 README（demo5/6/7 尤其完整），本节只做概述与索引。

## 项目结构

```
ai-agent-langgraph-demo
├── .env                           # 多套模型 Provider 配置（见下文）
├── package.json / tsconfig.json
├── model.ts                       # langchain/init_chat_model 版模型（供 demo5/6 复用）
├── src                            # ★ 根 HTTP Agent 服务
│   ├── index.ts                   # Express 入口，POST /chat
│   ├── agent
│   │   ├── graph.ts               # 编译 LangGraph：planner→toolSelector→executor→summarize
│   │   ├── state.ts               # AgentState：question/plan/selectedTool/toolResult/answer
│   │   └── nodes
│   │       ├── planner.ts         # 生成执行计划
│   │       ├── toolSelector.ts    # 按计划文本关键字选工具（calcualtor/weather/none）
│   │       ├── executor.ts        # 执行所选工具
│   │       └── summarize.ts       # 结合问题与工具结果生成最终回答
│   ├── tools
│   │   ├── index.ts               # calculator、weather
│   │   ├── calculator.ts          # 计算（演示用 eval，生产禁用）
│   │   └── weather.ts             # 模拟天气查询（固定返回）
│   ├── llm/model.ts               # 共享 ChatOpenAI 实例（读 OPENAI_* + MODEL）
│   └── types/index.ts
├── demo/                              # demo1：LangGraph 入门
├── demo2/                             # demo2：多轮对话记忆（手工文件）
├── demo3/                             # demo3：自定义 FileCheckpointSaver
├── demo4-langgraph-fileCheckpointSaver/  # demo4：checkpoint + SSE 流式
├── demo5-langchain-base/              # demo5：LangChain.js 模型 API
├── demo6-deepagents-langfuse/         # demo6：Langfuse 追踪
└── demo7-LlamaIndex/                  # demo7：LlamaIndex 本地知识库 RAG
```

## 一、根 HTTP Agent 服务（src/）

### 工作流

图是一个**无环线性管道**，四个节点依次执行：

```text
START → planner → toolSelector → executor → summarize → END
```

| 节点 | 职责 |
|---|---|
| `planner` | 把 `question` 交给 LLM，输出一段"需要哪些步骤 / 是否调工具"的计划 |
| `toolSelector` | 解析计划文本：含"计算"→`calculator`；含"天气"→`weather`；否则 `none`（规则选择，非 LLM 工具调用） |
| `executor` | 执行选中的工具，写回 `toolResult` |
| `summarize` | 把 `question` + `toolResult` 交给 LLM 生成最终 `answer` |

工具方面：`calculator` 直接 `eval` 表达式（**仅演示用，生产环境禁止，应换安全计算库**）；`weather` 固定返回一条模拟数据。

### 运行 HTTP 服务

```bash
pnpm install
pnpm dev          # 等价于 pnpm exec tsx src/index.ts，监听 http://localhost:3001
```

调用：

```bash
curl -X POST http://localhost:3001/chat \
  -H "Content-Type: application/json" \
  -d '{"question":"用天气工具查一下深圳天气"}'
```

返回：

```json
{
  "answer": "……（最终回答）",
  "plan": "……（planner 生成的计划）",
  "tool": "weather"
}
```

## 二、demo1 ~ demo7 一览

| 目录 | 演示重点 | 运行方式 |
|---|---|---|
| `demo/` | LangGraph 最基础用法：`Annotation` 状态 + `addNode/addEdge/addConditionalEdges` + `compile/invoke`；`demo2.ts` 进一步引入 `ChatOpenAI` + 自定义工具（zod schema）+ `ToolNode`，演示 ReAct 工具循环 | `npx tsx demo/demo1.ts`、`npx tsx demo/demo2.ts` |
| `demo2/` | 不用 checkpointer 的多轮记忆：Express 接口 + 把每轮消息 JSON 序列化存文件，下轮拼回 | `npx tsx demo2/demo.ts`（端口 3002） |
| `demo3/` | 自定义 `FileCheckpointSaver extends BaseCheckpointSaver` 持久化图状态，按 `thread_id` 恢复上下文 | `npx tsx demo3/demo.ts`（端口 3003） |
| `demo4-langgraph-fileCheckpointSaver/` | 在前者基础上加 **SSE 流式输出**：`app.stream(..., { streamMode: 'messages' })` + Express `text/event-stream` 逐块下发 | `npx tsx demo4-langgraph-fileCheckpointSaver/demo.ts`（端口 3004） |
| `demo5-langchain-base/` | LangChain.js 模型 API：`initChatModel` 静态/动态参数、`invoke`/`batch`/`stream`/并发 | `pnpm demo5 all` |
| `demo6-deepagents-langfuse/` | LangGraph Agent 接入 **Langfuse** 可观测性（OpenTelemetry + 回调） | `pnpm demo6` |
| `demo7-LlamaIndex/` | 用 **LlamaIndex** 读本地文件建向量索引，封装成 `knowledge_base_search` 工具交给 DeepAgent 检索回答 | `pnpm demo7` |

demo1–4 在 `package.json` 中没有对应 script，请用 `npx tsx <入口>` 直接运行；demo5–7 已配置 `pnpm demo5|demo6|demo7`（demo5 还可传 `invoke/dynamic/batch/stream/async/all` 子命令），并可用 `pnpm typecheck:demo5|demo6|demo7` 做类型检查。

## 环境变量

`src/` 服务、demo1–4、demo7 都读取根目录 `.env` 的 OpenAI 兼容配置：

```dotenv
OPENAI_API_KEY=你的密钥
OPENAI_BASE_URL=https://你的兼容接口/v1    # 直连 OpenAI 时可不填
MODEL=qwen3.8-max-0902                         # 填实际模型 ID
```

不同目录的补充变量：

| 使用方 | 需要额外配置 |
|---|---|
| `model.ts`（根，供 demo5/demo6） | 定义了三套 Provider：`OPENAI_*`（AL）、`TX_*`、`TT_*`；顶部 `const current = 'AL'` 决定当前使用哪一套，切换需确保对应变量已填 |
| `demo6-deepagents-langfuse` | `LANGFUSE_PUBLIC_KEY`、`LANGFUSE_SECRET_KEY`、`LANGFUSE_BASE_URL`（另可选 `LANGFUSE_TRACING_ENVIRONMENT` 等） |
| `demo7-LlamaIndex` | 额外需要 `EMBEDDING_MODEL`（Embedding 模型）；所用接口须同时支持 Chat/工具调用与 Embeddings |

## 提示

- 根目录 `model.ts`（`init_chat_model`）与 `src/llm/model.ts`（`ChatOpenAI`）是**两套不同的模型封装**：前者用于 demo5/6，后者用于 `src/` 服务与 demo1–4/7，注意不要混淆。
- `toolSelector` 用关键字做规则匹配，适合教学；真实项目中通常让 LLM 通过 Function Calling 选择工具。
- demo4 的 README 详细解释了"为什么节点里仍写 `invoke()` 却能流式输出"——根因是 LangGraph 外层用 `streamMode: 'messages'` 注入流式回调，值得先读。
