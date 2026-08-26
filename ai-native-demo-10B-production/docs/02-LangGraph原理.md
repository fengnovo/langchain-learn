# 02 LangGraph 原理
## 为什么不用普通 Promise 链？
普通代码：
```ts
context = await retrieve();
plan = await planner(context);
frontend = await frontend(plan);
backend = await backend(plan);
```
能跑，但复杂后会遇到：
- 状态散落
- 分支难管理
- 并行难表达
- 重试和恢复困难
- Human-in-the-loop 难插入
LangGraph 把流程表示成：
```text
State + Node + Edge
```
---
## State
`packages/agent-core/src/state.ts`
里面包含：
```text
requirement
ragContext
mcpContext
plan
artifacts
review
harness
quality
```
多个 Agent 不直接“互相聊天”。
它们围绕 State 读取输入、返回状态增量。
---
## fan-out
Planner 有 3 条 outgoing edge：
```text
planner → frontend
planner → backend
planner → qa
```
LangGraph 会把它们放进同一个 super-step 并行运行。
---
## 为什么 artifacts 要 reducer？
三个并行节点都会写：
```ts
artifacts
```
如果普通字段同时被多个节点写，会出现并发状态冲突。
所以：
```ts
new ReducedValue(
  z.array(...),
  {
    reducer: (oldValue, update) =>
      oldValue.concat(update)
  }
)
```
它告诉 LangGraph：
“多个 Agent 返回的 artifact 不是互相覆盖，而是累加。”
---
## fan-in
三个节点都连向：
```text
reviewer
```
Reviewer 会在并行 super-step 完成后执行。
这就是：
```text
fan-out → fan-in
```
---
## 后续生产升级
你可以进一步增加：
- checkpointer
- Redis/Postgres 持久化 state
- retryPolicy
- interrupt / human approval
- recursion limit
- resume after failure
