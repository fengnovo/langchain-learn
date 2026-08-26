# AI Native Demo 05：Agent Workflow 编排
目标：
从单 Agent 升级到多步骤 Agent Workflow。
学习：
- Planner Agent
- Coder Agent
- Reviewer Agent
- Tester Agent
- State状态管理
- Node/Edge思想
- Agent之间上下文传递
架构：
```
用户需求
 ↓
Planner
 ↓
Coder
 ↓
Reviewer
 ↓
Tester
 ↓
最终结果
```
这个 Demo 不依赖 LangGraph。
原因：
先理解底层编排原理。
后续 Demo 会使用 LangGraph.js 重构。
