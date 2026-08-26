```
ai-agent-langgraph-demo
│
├── package.json
├── tsconfig.json
├── .env
│
└── src
    │
    ├── index.ts                 # HTTP入口
    │
    ├── agent
    │   ├── graph.ts             # LangGraph流程
    │   ├── state.ts             # Agent状态定义
    │   ├── nodes
    │   │   ├── planner.ts       # 规划节点
    │   │   ├── toolSelector.ts  # 工具选择
    │   │   ├── executor.ts      # 执行工具
    │   │   └── summarize.ts     # 总结
    │
    ├── tools
    │   ├── calculator.ts
    │   ├── weather.ts
    │   └── index.ts
    │
    ├── llm
    │   └── model.ts
    │
    └── types
        └── index.ts

```