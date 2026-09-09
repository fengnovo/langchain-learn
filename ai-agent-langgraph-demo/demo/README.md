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

## 附：LangChain 与 Runnable 的关系

**一句话：Runnable 是 LangChain 的"统一接口协议"，几乎所有 LangChain 组件都实现（继承）了这个接口。** LangChain ≠ Runnable，但 LangChain 里几乎所有可调用的东西"是"Runnable。

### 1. 谁是谁

| | LangChain | Runnable |
|---|---|---|
| 是什么 | 一个**生态/库集合**（`@langchain/core`、`@langchain/anthropic`、`langchain`、`@langchain/langgraph`...） | `@langchain/core/runnables` 里定义的一个 **abstract base class / interface** |
| 角色 | 上层框架，提供模型/工具/agent/检索等具体能力 | 底层"协议"，规定 `invoke / stream / batch / streamEvents / withConfig / bindTools` 等方法 |
| 关系 | LangChain 内部组件**实现** Runnable | Runnable 本身不做事，是契约 |

可以类比为：Runnable ≈ Java 的 `Callable` / Python 的 `__call__` 协议；LangChain ≈ Spring。

### 2. Runnable 规定了什么

核心方法：

```ts
abstract class Runnable<Input, Output> {
  invoke(input: Input, config?: RunnableConfig): Promise<Output>;
  batch(inputs: Input[], config?: RunnableConfig): Promise<Output[]>;
  stream(input: Input, config?: RunnableConfig): AsyncGenerator<Output>;
  streamEvents(input, config): AsyncGenerator<StreamEvent>;
  withConfig(config): Runnable<Input, Output>;   // 不可变绑定 config
  bind(kwargs): Runnable<Input, Output>;         // 不可变绑定 kwargs
  pipe(next): RunnableSequence;                  // 链式组合
  // ...
}
```

所有组件只要 `extends Runnable`，就自动具备上面这些能力，而且**可组合**（`a.pipe(b).pipe(c)`）。

### 3. 哪些东西"是" Runnable

在本项目里就能看到一堆 Runnable 子类：

```ts
import { ToolNode, toolsCondition } from '@langchain/langgraph/prebuilt';
//                       ↑ Runnable                       ↑ 不是 Runnable（纯函数，返回路由 string）
```

- `ChatAnthropic`（模型）→ Runnable
- `Tool` / `ToolNode`（工具）→ Runnable
- `StateGraph.compile()` 返回的 CompiledStateGraph → Runnable
- `createDeepAgent()` 返回的 DeepAgent → Runnable
- `RunnableSequence` / `RunnableLambda` / `RunnablePassthrough` → Runnable（组合积木）

所以 `demo6` 里 `InvokableAgent` 那个最小契约只要求 `invoke(input, config)`，实际就是 Runnable 的一个子集——任何 Runnable 都满足，因此能同时包裹 DeepAgent、CompiledStateGraph、模型。

### 4. 为什么要有 Runnable 这个抽象

LangChain 早期组件各自为战：模型有 `call`，链有 `run`，工具有 `_run`。0.1 之后引入 Runnable 统一接口，带来三个红利：

**(1) 可组合**：`a.pipe(b).pipe(c)` 拼成新 Runnable，无需为每种组合写新类。这就是 LangChain Expression Language (LCEL)。

```ts
const chain = prompt.pipe(model).pipe(parser);
//        ↑ Runnable     ↑ Runnable  ↑ Runnable  → 还是 Runnable
await chain.invoke(input);  // 一样的接口
```

**(2) 配置透传**：`RunnableConfig`（`callbacks / tags / metadata / configurable / recursionLimit`）从根节点自动向所有子 run 传播。这正是 `demo6` 里 Langfuse 能工作的根基——你只在最外层挂一个 `CallbackHandler`，LangChain 自动把它传给里面的 LLM run、tool run、graph node。

```ts
const config = { callbacks: [langfuseHandler] };
agent.invoke(input, config);
//   ↑ 内部 LLM 调用、tool 调用都会拿到同一个 handler
```

**(3) 流式统一**：同一份代码 `await x.invoke()` / `for await (const c of x.stream())` / `for await (const e of x.streamEvents())` 都能用，不用为每个组件单独实现流式 API。

### 5. "run" 是什么

Runnable 的每一次 `invoke` 在 LangChain 内部被包成一个 **Run**，触发 start/success/error 回调。Langfuse 的 `CallbackHandler` 就挂在这些回调上、把每次 run 转成一个 span。所以：

> Runnable 是 LangChain 给所有组件立的"统一接口"；你挂上去的 callback 会被传播到整棵 Runnable 调用树的每个节点。

`mergeConfigs(options.config, tracingConfig)` 就是 `demo6` 里把 Langfuse callbacks 和用户原 config 的 callbacks 合并进同一棵 run 树的实现。
