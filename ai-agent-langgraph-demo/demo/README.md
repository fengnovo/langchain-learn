# demo1：LangGraph 入门（状态、节点、边、条件路由、工具调用）

LangGraph 最基础的用法演示：如何定义状态、注册节点、连接边与条件边，最后 `compile()` 后 `invoke()` 执行。目录内有两个独立小例，渐进引入**工具调用**。

## 内容

| 文件 | 演示重点 |
|---|---|
| `demo1.js` / `demo1.ts` | 最小图：`Annotation.Root` 定义带 reducer 的状态通道；`addNode`×3 + `addEdge` + `addConditionalEdges`（根据状态值决定去 `node2` 还是结束）；`compile()` 后 `invoke`，并演示 `recursionLimit`（限制最大执行步数）与 `configurable`（自定义配置）两个运行时参数 |
| `demo2.ts` | ReAct 工具循环：`ChatOpenAI` + `model.bindTools(tools)` + `ToolNode` + 内置 `MessagesAnnotation`，通过条件边判断"模型是否要调工具"在 `agent ↔ tools` 间循环 |
| `tool.ts` | 自定义工具 `custom_calc`（zod 定义入参 schema，实现"天地同寿算法" = `a + b + 1000`） |
| `result.json` | `demo2.ts` 运行后把完整消息链序列化写出的结果样例 |

图中模型读取项目根目录 `.env` 的 `MODEL` / `OPENAI_API_KEY` / `OPENAI_BASE_URL`。

## 运行

先确保根目录 `.env` 已配置，然后在项目根目录（`ai-agent-langgraph-demo/`）执行：

```bash
# 入门图：状态 + 条件路由
pnpm exec tsx demo/demo1.ts

# 或用 Node 直接运行 JS 版
node demo/demo1.js

# 工具调用 ReAct 循环（会在 demo/result.json 写入结果）
pnpm exec tsx demo/demo2.ts
```

`demo2.ts` 的提问示例：`使用天地同寿算法计算3和4`（模型会调用 `custom_calc` 并返回 `1007`）。

## 下一步

- 理解 `MessagesAnnotation`：它是内置状态，自动按"追加 + 按 ID 去重"归约消息。
- 想看记忆 / 持久化，接着看 [`demo2/`](../demo2/)、[`demo3/`](../demo3/)。
