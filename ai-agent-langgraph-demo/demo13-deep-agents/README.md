# demo13：DeepAgents 的创建与核心能力

## 1. DeepAgent 的提出与概念

结合**规划、子代理、文件系统和详尽提示词**四个基本概念，让 Agent 实现从"浅"至
"深"的转变：能够规划更复杂的任务，并在更长时间范围内逐步完成各个目标，最终
完成整体任务。

## 2. DeepAgent 的核心能力

| 核心能力 | 说明 |
| --- | --- |
| 规划与任务分解（Planning and task decomposition） | 内置规划工具（todo list），将复杂任务拆解为离散步骤，跟踪进展，并根据新信息的出现调整计划 |
| 上下文管理（Context management） | 文件系统工具（`ls`、`read_file`、`write_file`、`edit_file`）允许 Agent 将复杂的上下文卸载到内存，防止上下文窗口溢出，并支持可变长度工具结果的处理 |
| 子代理生成（Subagent spawning） | 内置的 "task" 工具，使代理能够针对性生成的子代理以实现上下文隔离——主代理的上下文保持干净，同时又能深入处理子任务 |
| 长期记忆（Long-term memory） | 利用不同类型的 Backend 进行信息存储，将具有持久内存的 Agent 扩展到线程之间，代理可以保存和检索之前对话中的信息，辅助任务执行 |

## 3. DeepAgents 的创建与内部细节

使用 deepagents 包中的 `createDeepAgent` 方法创建。该方法实际上是在 deepagents
包中对 `createAgent` 函数额外配备了一些复杂任务常用的相关配置。

内部结构 = **模型 + 用户赋予的额外工具** + 内置中间件 + 内置工具：

- **中间件**：To-do-list、Summarization（`trigger = fraction 0.9`、
  `keep = fraction 0.15`）、PatchToolCalls、file system；
- **工具**：task（子代理调用）+ 文件系统工具等。

与 `createAgent` 相同，`createDeepAgent` 依然返回一个 compiled graph 对象，
调用方法与传统 Agent 的调用方法完全相同（`invoke` / `stream` 等）。

## 4. createDeepAgent 的常用参数配置

| 参数 | 说明 |
| --- | --- |
| `systemPrompt` | 用户拟定的额外系统提示，**会追加在基本系统提示 `BASE_AGENT_PROMPT`**（"In order to complete the objective that the user asks of you, you have access to a number of standard tools."）中 |
| `tools` | 用户赋予的额外的工具列表（与内置工具合并） |
| `backend` | 与配置 file system 时相同（`StateBackend` / `FilesystemBackend` / `StoreBackend` / `CompositeBackend`，见 demo12 demo5） |
| `interruptOn` | 用户中断配置，默认为 `None`（HITL，见 demo12 demo2） |
| `subagents` | 子代理规格列表（demo2.ts 演示） |
| `checkpointer` / `store` | 检查点与长期记忆存储 |

DeepAgent 的常见使用场景：

1. **complex and multi-step**——需要多步规划和分解的复杂多步骤任务；
2. **large amounts of context**——需要通过文件系统工具管理大量上下文；
3. **Delegate work**——需要将子任务委托给专门的 subagent 以实现上下文隔离；
4. **Persist memory**——需要跨对话和线程持续保存记忆。

## 5. 运行

在 `ai-agent-langgraph-demo` 目录执行：

```bash
pnpm demo13
pnpm demo13:2
pnpm demo13:3
```

执行类型检查：

```bash
pnpm typecheck:demo13
```

## 6. demo.ts：基本创建（规划 + 上下文管理）

复刻课件示例：详尽的研究员系统提示（`research_instructions`，明确职责、
`internet_search` 工具用法与"先写 todo_list"的工作流程）+ 模拟搜索工具 +
`FilesystemBackend(rootDir=workspace, virtualMode=true)`。

运行观察：

1. Agent 先调用内置 **todo list 工具**写入 `/todo_list.md` 拆解任务并跟踪进展
   （规划与任务分解）；
2. 多轮调用 `internet_search` 检索资料，中间结果与计划都落盘在文件系统中，
   不撑爆上下文窗口（上下文管理）；
3. 最终把研究报告 `write_file` 到 `/report.md`——Node 侧直接读磁盘验证
   `workspace/report.md` 真实落盘（FilesystemBackend + virtualMode 生效）；
4. 全程使用与传统 Agent 完全相同的 `agent.invoke({ messages: [...] })` 调用。

> 注意：`workspace/` 下的文件**跨运行持久**（真实磁盘），demo.ts 每次运行
> 会先重置该目录，避免上次运行的 todo_list.md / report.md 残留影响观察。

## 7. demo2.ts：子代理生成（Delegate work）

通过 `subagents` 参数声明两个子代理，观察内置 **task 工具**的委托流程：

- `researcher`：持有 `internet_search` 工具，负责调研并把要点写入
  `findings.md`（检索能力下沉到子代理，主代理不直接持有搜索工具）；
- `writer`：使用内置文件系统工具读取 `findings.md`，撰写正式报告到
  `report.md`（子代理之间通过**共享文件系统**交接，上下文各自隔离）。

运行后打印 task（子代理调用）次数与最终回复，观察：

1. 主代理按 `description` 自主选择把任务委托给哪个子代理；
2. 子代理的中间过程（多轮搜索、阅读）不进入主代理上下文，主代理只收到
   蒸馏后的结论——上下文隔离；
3. 子代理自动获得默认中间件栈（file system、Summarization 等），与主代理
   共享文件状态——**上下文隔离但"记忆"互通**。

`SubAgent` 常用配置字段：`name`（task 工具中的选择标识）、`description`
（展示给模型的选取说明）、`systemPrompt`（子代理自己的系统提示）、`tools`
（工具白名单，工具对象而非名称）、`model`（可覆盖为更廉价的模型）、
`middleware` / `interruptOn` 等。

### 7.1 子代理为什么会 fan-out 调很多次工具（如 research 调 8 次 search）
+181
-0
```
$ tsx demo13-deep-agents/demo2.ts
===== DeepAgent 子代理生成：主编委托 researcher / writer 协作 =====
问：请调研 DeepAgents 的子代理机制并产出报告。

==============调用了internetSearch==========
==============调用了internetSearch==========
==============调用了internetSearch==========
==============调用了internetSearch==========
==============调用了internetSearch==========
==============调用了internetSearch==========
==============调用了internetSearch==========
==============调用了internetSearch==========
委托 → subagent_type=researcher，任务：请对当前美国经济状况进行全面调研，包括但不限于以下方面：1. GDP增长趋势与最新数据；2. 通胀水平（CPI、PCE）及美联储货币政策动向；3. 就业市场表现（失业率、非农就业、薪资增长）；4. 消费支出与消费者信心；5. 房地产市场现状；6. 制造业与服务业PMI；7. 联邦债务与财政赤字情况；8. 主要经济风险与挑战（如衰退概率、地缘政治影响、贸易政策等）。请提供最新可用数据和权威来源，输出结构化的关键要点清单。
委托 → subagent_type=writer，任务：请根据
```
运行 demo2 时常见到 `internetSearch` 被连续调用多次（例如 8 次）。这些调用
**全部发生在 researcher 子代理内部**，不是主代理调的，属于子代理自主 ReAct
循环的正常 fan-out：

1. 主代理委托 researcher 的任务里列了多个研究维度（GDP、通胀、就业、消费、
   房地产、PMI、财政、风险……），并要求「最新数据、权威来源」；
2. `internet_search` 的描述是「针对**特定查询**执行搜索」，子代理模型便合理
   地把调研拆成多个针对性查询——每个维度各搜一次；
3. 子代理有自己独立的 agent 循环（思考 → 调 search → 看结果 → 再搜），直到
   认为调研充分才写 `findings.md` 并结束。这些中间搜索**不进入主代理上下文**
   （主代理的 task 委托只有 researcher / writer 两条），这正是上下文隔离；
4. 本例 `internet_search` 是返回固定文案的 **mock**，每次都回同样的泛泛内容、
   并未真正回答该维度，模型会觉得「还没覆盖到」而继续搜，客观上放大了次数。

即：**多次搜索 = researcher 按任务列出的方面逐个发起检索**，不是 bug；只是在
mock 场景下显得多余。

控制工具调用次数的三种方式：

- **在子代理 systemPrompt 里加预算约束**（最简单）：
  ```ts
  systemPrompt:
    '你是研究员。internet_search 最多调用 2 次：用 1-2 个综合查询覆盖主题即可，' +
    '不要逐维度重复检索。把 3-5 条要点写入 findings.md 并在回复中给出。',
  ```
- **给子代理加调用限流中间件**：`SubAgent` 支持 `middleware` 字段，可挂
  `modelCallLimitMiddleware({ runLimit: 4 })` 等做硬上限（见 demo12）；
- **`recursionLimit` 兜底**：子代理内部的每次模型 / 工具调用都消耗超步，
  链太长会被总超步上限截断（见 demo3 场景一）。

## 8. Python 与 TypeScript API 对照

| 功能 | Python | TypeScript |
| --- | --- | --- |
| 导入 | `from deepagents import create_deep_agent` | `import { createDeepAgent } from 'deepagents'` |
| 基本创建 | `create_deep_agent(model=model, tools=[...], system_prompt=..., backend=...)` | `createDeepAgent({ model, tools, systemPrompt, backend })` |
| 文件后端 | `FilesystemBackend(root_dir=".", virtual_mode=True)` | `new FilesystemBackend({ rootDir: '.', virtualMode: true })` |
| 系统提示（追加在 BASE_AGENT_PROMPT 后） | `system_prompt=research_instructions` | `systemPrompt: researchInstructions` |
| 子代理声明 | `subagents=[{"name": ..., "description": ..., "system_prompt": ..., "tools": [...]}]` | `subagents: [{ name, description, systemPrompt, tools }]` |
| 中断配置 | `interrupt_on={...}`（默认 None） | `interruptOn: {...}`（默认 undefined） |
| 调用 | `agent.invoke({"messages": [...]})` | `agent.invoke({ messages: [...] })` |
| 内置中间件 | TodoListMiddleware / SummarizationMiddleware / PatchToolCallsMiddleware / FilesystemMiddleware | 自动装配，无需手动传入 |
| 内置 task 工具 | 自动注册（名称 `task`） | 自动注册（名称 `task`） |

## 9. 注意事项

- **maxTokens 要放宽**：DeepAgent 的 `write_file` / `edit_file` 会把整份文件
  内容放进工具参数，输出长度远超普通问答。根目录 `model.ts` 的
  `maxTokens=1000` 会导致参数生成到一半被截断（工具调用丢失、回复为空），
  因此本目录的 [model.ts](./model.ts) 放宽到 4000；
- **模拟搜索**：示例中 `internet_search` 为模拟实现（返回固定文案）。模型会
  检测到检索通道异常并在报告中诚实标注证据边界——这恰好展示了 DeepAgent
  的自我校验行为，可如实向观者说明；
- **长期记忆**：DeepAgent 的第四项核心能力（Persist memory）通过 `backend`
  与 `store` 配置实现，已在 demo12-middleware/demo5.ts 中详细演示。

## 10. demo3.ts：性能 / 资源控制（多子代理、调用数增多时）

当 DeepAgent 派出多个子代理、模型调用数显著增多时，用三个手段控制成本、
延迟与失控风险（`pnpm demo13:3`）：

1. **`recursionLimit`（超步 / 递归上限）**：LangGraph 图执行的「超步
   （super-step）」总数上限，默认 **25**。主代理 + 嵌套子代理的每次模型调用、
   工具调用都消耗超步。
   - 任务复杂、子代理链长时默认值可能不够 → 调大（如 `recursionLimit: 50`）；
   - 它也是「保险丝」：设得过小会在子代理异常循环 / 失控时快速失败。
   - 用法：`agent.invoke(input, { recursionLimit: N })`。demo3 场景一用
     `recursionLimit: 6` 触发 `Recursion limit of 6 reached ...` 熔断，
     场景二用 `50` 正常跑通 researcher → writer 委托链。
2. **精简 `systemPrompt`**：DeepAgent 自带的 BASE_AGENT_PROMPT 已很长且每次
   调用都携带，主 / 子代理的额外 prompt 只写「分工 + 关键流程」，去掉冗余，
   降低每次调用的输入 token 与延迟。
3. **子代理单独配更快的小模型**：`SubAgent.model` 可与主代理不同。检索、写
   要点等机械子任务用「关思考 + 低 `maxTokens`」的快模型（demo3 用
   `initChatModel` 造了一个 `fastSubModel`；生产中也可直接传更便宜的模型名，
   如 `model: 'openai:gpt-4o-mini'`），主代理仍用全功能模型统筹，兼顾质量与
   成本。

| 配置点 | Python | TypeScript |
| --- | --- | --- |
| 超步上限 | `agent.invoke(input, config={"recursion_limit": 50})` | `agent.invoke(input, { recursionLimit: 50 })` |
| 子代理单独模型 | `subagents=[{"name": ..., "model": fast_model}]` | `subagents: [{ name, model: fastSubModel }]`（也接受模型名字符串） |

> 说明：demo3 与 demo2 一样未传 `backend`（默认 StateBackend，文件为内存虚拟）；
> 子代理的快模型与主模型同源于 `.env` 的 `MODEL`，仅通过 `enable_thinking: false`、
> 更小的 `maxTokens` / `timeout` / `maxRetries` 实现「更快更省」。
