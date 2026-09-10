---
name: "deepagents-source-tracing"
description: "深度排查 deepagents / LangGraph 多代理内部机制（子代理实例化、task 工具派发、中间件、文件系统与状态流转）。当用户询问 agent 框架内部原理、子代理与主代理关系、执行流程、或需要判定多 agent 架构并要求源码级证据时调用。"
---

# DeepAgents / LangGraph 源码级机制取证

针对 `deepagents`（及 @langchain/langgraph 的 createAgent/ReactAgent）回答"内部是怎么实现的"类问题时，按本技能的链路定位打包源码、取证后再下结论。禁止仅凭文档/概念印象作答。

## 触发场景

- 用户问 SubAgent 本质（是否和主 model 一样实例化、是否独立 agent）、主代理如何决定派发子代理、执行流程顺序、handoff/fork 区别、上下文隔离与文件共享原理；
- 用户要求判定"这是不是多 agent 架构"、子代理能否并行、recursionLimit 为何熔断等框架行为问题；
- 任何需要引用 deepagents 源码行号作为证据的回答。

## 步骤一：定位包与打包文件

pnpm 项目中包不在顶层 `node_modules/deepagents`，要用：

```bash
ls <项目根>/node_modules/.pnpm | grep -i deepagents
# 进入 <hash目录>/node_modules/deepagents/dist/
```

dist 文件规律（deepagents ≥ 1.x，esbuild 打包）：

- `langsmith-*.js`：**主 bundle**，全部框架逻辑在这里（8000+ 行），grep 主要打它；
- `src-*.js` / `index.js`：入口 re-export，通常只有几行；
- `*.d.ts`：类型声明，用来确认公开 API 签名（如 SubAgent、createDeepAgent 参数）；
- 同名 `.cjs` 为 CJS 版本，内容一致，优先读 `.js`。

若版本不同导致文件名变化，先 `grep -ln "subagent" dist/*.js` 确定主 bundle。

## 步骤二：按锚点 grep 取证

核心锚点（在主 bundle 中 grep，拿到行号后 `sed -n '起,止p'` 精读）：

| 锚点 | 能证明什么 |
|---|---|
| `function createDeepAgent` / `createSubAgentMiddleware({` | 主代理组装：主 model 作为 `defaultModel`、tools 作为 `defaultTools` 传入子代理中间件 |
| `function getSubagents` | 每个 SubAgent spec 的合并逻辑：`model: agentParams.model ?? defaultModel`（子代理默认复用主 model）、tools/middleware 回退、handoff/fork 模式分支 |
| `function createSubAgent` | 子代理本质：内部就是 `createAgent({ model, systemPrompt, tools, middleware, name })` —— 与主代理同一个 ReactAgent 编译入口；spec 带 `runnable` 时直接用预编译 graph |
| `function createTaskTool` / `return tool(async (input, config) =>` | task 就是一个普通 LangChain tool：校验 subagent_type → 构造子代理 state → `await subagent.invoke(...)` → 末条消息文本作为 ToolMessage 返回 |
| `subagentState.messages = [new HumanMessage` | handoff 模式下子代理只收到一条 description 消息（上下文隔离的直接证据）；fork 模式会带上主对话历史 |
| `returnCommandWithStateUpdate` / `filesValue` / `ReducedValue` | 子代理写的虚拟文件经 files reducer 合并回主状态（上下文隔离但文件系统共享的证据） |
| `getTaskToolDescription` | 主模型"看到"子代理的方式：task 工具 description 里动态拼出 `- name: description` 列表；派发决策 = LLM 的普通工具选择，框架无显式路由节点 |
| `BASE_AGENT_PROMPT` / `TASK_SYSTEM_PROMPT` / `DEFAULT_SUBAGENT_PROMPT` / `GENERAL_PURPOSE_SUBAGENT` | 内置提示词与默认 general-purpose 子代理（注意 TASK_SYSTEM_PROMPT 已 @deprecated，指引已迁入工具 schema） |
| `EXCLUDED_STATE_KEYS` | 传给子代理 / 从子代理回传时被剔除的 state 键（messages、todos、summarization 等） |

大段 `sed` 输出会被持久化到临时文件，用 Read 工具读该文件获取完整内容。

## 步骤三：按调用链组织证据链

回答前先在脑中（或笔记中）串好这条链，每一环都要有源码行号支撑：

```
createDeepAgent({ model, subagents })
  → createSubAgentMiddleware({ defaultModel: model, defaultTools, subagents })
    → getSubagents(): 每个 spec 合并默认值（model ?? defaultModel）
      → createSubAgent(spec) → createAgent(...)  // 编译出独立 ReactAgent graph
    → createTaskTool(): 注册名为 "task" 的工具
  → 主代理 ReAct 循环中：模型发 task tool_call
    → 工具内 subagent.invoke(隔离的 state)  // 图里套图，子代理跑自己的 ReAct 循环
    → 末条消息文本 → ToolMessage 回主代理 → 主模型进入下一轮循环
```

## 步骤四：输出规范

1. **先证据，后结论**：先给"源码里可直接指认的事实"（函数名、关键代码片段、文件/行号），再给概念判定；
2. **严格区分事实与推断**：源码没证明的（UI 行为、未读到的配置）必须用限定语，不要写成确定结论；
3. **概念判定给出口径**，例如多 agent 架构的判定标准：
   - 仅"同一 LLM + 同一工具集 + 不同 systemPrompt/入口" → 单 agent 体系的多模式/多 persona；
   - 存在独立 agent 循环 + 显式调度（task 工具/handoff）+ 独立上下文 + 独立工具集 → 多 agent 架构；
4. 流程类问题配 ASCII 流程图，对比类问题配表格（主代理 vs 子代理：model 实例、agent 实例、prompt、tools、消息历史、文件系统）；
5. 代码引用用可点击的绝对路径链接（file://...#L起-L止）。

## 常见结论速查（以实际源码版本为准，回答前仍需 grep 复核）

- 子代理默认复用主代理的 **同一个 model 对象**，可在 spec 中用 `model` 覆盖（如配小模型）；
- 子代理是**独立编译的 ReactAgent 实例**，有自己的 ReAct 循环和消息历史，不是"主模型换 prompt"；
- 派发子代理 = 主模型对 `task` 工具的一次普通 tool_call，**框架没有"是否派发"的判断节点**；子代理选择依据 task 工具 description 中的列表 + 主 systemPrompt；
- handoff（默认）：子代理只收到 description 一条 HumanMessage；fork：继承主对话历史；
- 子代理中间消息不回传，只有末条文本回主代理；但虚拟文件经共享 backend/files reducer 互通；
- 子代理 graph 嵌套在主 graph 内执行，步数预算共享 recursionLimit，嵌套过深会熔断；
- 模型可在一条消息里发多个 task tool_call 并行派发无依赖的子代理；有依赖时靠模型串行调度（后一个子代理通过共享文件/前序结论获得输入）。
- **general-purpose 子代理默认自动注入**：createDeepAgent 中 `gpConfig.enabled !== false` 且无同名子代理时，会 unshift 一个 general-purpose spec（同 model、全部 tools、极简 systemPrompt、唯一继承主代理 skills）。用户一个 subagents 都不配，task 工具也可用；子代理"角色"由主代理在 task 的 description 里运行时注入（stateless，看不到用户意图）。预设命名子代理的价值是静态约束（工具白名单/固定 prompt/专用 model/fork 模式），不是覆盖问题种类；自定义子代理默认不继承主代理 skills。
- **任务列表（todo）能力不在 deepagents 默认栈**：`todoListMiddleware()` 来自 `langchain` 包，注册 `write_todos` 工具，todos 存图状态（`{content, status: pending|in_progress|completed}`，全量替换、每轮限一次）；deepagents 仅在 Codex harness profile 中自动挂它，普通模型需手动加入 middleware。注意 `todos` 在 EXCLUDED_STATE_KEYS 中，子代理写的 todo 不回传主代理。CLI/前端做"弹出清单→逐条划掉"时：挂 todoListMiddleware + `agent.stream(input, { streamMode: 'values' })` 消费 state.todos + ANSI（绿 ✓ `\x1b[32m` + 删除线 `\x1b[9m`）整屏重绘。
- **streamMode 坑（实测）**：deepagents 的 `agent.stream()` 默认产出**自定义事件**（chunk 键为 `model_request`、`xxxMiddleware.before_agent`、`__interrupt__` 等，不含 messages/todos）；要拿完整状态（messages、todos、files）必须显式传 `streamMode: 'values'`。
- **人工审批（HITL）**：`humanInTheLoopMiddleware({ interruptOn: { write_file: { allowedDecisions: ['approve','reject'] } } })`（langchain 包），需配 checkpointer（如 MemorySaver）；中断时 values chunk / `agent.getState(config).tasks[].interrupts[]` 可取到 HITLRequest（actionRequests），用 `agent.stream(new Command({ resume: { decisions } }), config)` 恢复。CLI 交互用 `process.stdin.setRawMode(true)` 读方向键（`\u001b[A/B`）、回车 `\r`、y/n；非 TTY 环境必须兜底自动决策避免挂死。
- **values 流刷屏坑（实测）**：`streamMode: 'values'` 下 deepagents **每个中间件节点**（before_agent、patchToolCalls、summarization…）都吐一份完整状态快照；"你好"这种零工具调用也能出十几个 chunk，TUI 若对每个 chunk 清屏重绘就疯狂刷屏。对策：render() 开头算**内容签名**（todos 内容 + logs 条数与末条 + 审批选中项 + thinking 标志 + 最终回复）做 JSON.stringify 比对，签名相同直接 return；任务重置时清空签名强制下一帧。效果：问候场景 12+ 帧 → 4 帧。同时维护 `thinking` 状态（任务开始/工具结果后置 true、新 AIMessage 到达/finalize 置 false）显示"🤔 模型思考中…"，消除等待无反馈。
- **readline REPL 与 raw mode 共存坑（实测，Node v26 PTY 验证）**：① `rl.question(prompt)` 收到 Enter 后 readline 会按当前 prompt **自动重绘一次提示符**，此时 `rl.pause()` 还没执行，TUI 中间会残留一行 `❯`；对策是 `rl.question()` 调用后立刻 `rl.setPrompt('')`，让那次重绘输出空串（下轮 question 传入新 prompt 不受影响）。② **Node v26 的 readline 不再替你管理 tty raw 状态**：`createInterface` 时 raw=on，之后 `pause()`/`resume()`/`question()` 都**不会**切换 raw mode（用 `script -q /dev/null node ...` 分配 PTY 实测 `process.stdin.isRaw`）。所以审批 cleanup 里 `setRawMode(false)` 后，下一条输入 tty 停在熟模式：方向键被直接回显成可见字符 `^[[D`/`^[[C` 且无法移动光标。对策：主循环 `rl.resume()` 后显式 `process.stdin.setRawMode(true)`。③ **`rl.pause()` 不会停止输入累积**（同实测：暂停期间写入的 abc 会预填进下一次 question 的答案）——任务执行期的误触按键、审批 raw mode 的 y/n/方向键都会被 readline 静默收进 line buffer；对策是每轮 `rl.resume()` 后把 `rl.line=''`、`rl.cursor=0`（类型上只读，需 cast 成 `{line:string;cursor:number}`），审批 onDone 回调里也清一次。④ `clearLine`/`cursorTo` 要从 `node:readline` 导入，`node:readline/promises` 类型定义里没有这两个导出。⑤ 验证手段：`script -q /tmp/x.typescript env VAR=.. pnpm demo20` 给子进程分配真实 PTY（isTTY=true），用 `( sleep N; printf '...\r'; ... ) | script ...` 编排按键；熟模式方向键回显可在录制里搜可见字符 `^[[D`（0x5e 0x5b…），raw 模式下是真 ESC 0x1b。

## 注意事项

- deepagents 版本升级后打包文件名、行号、锚点函数名可能变化，**每次以当场 grep 结果为准**，不要照搬本技能里的行号；
- 只读取证，不要修改 node_modules 内任何文件；
- 若问题涉及 LangGraph 核心（ReactAgent、middleware、Command、state reducer）而非 deepagents 本身，同样方法定位 `@langchain/langgraph` 的 dist 包，grep 锚点换为 `createAgent`、`Middleware`、`createReactAgent` 等。
