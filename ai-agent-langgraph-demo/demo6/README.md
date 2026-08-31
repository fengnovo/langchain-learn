# Demo 6：LangGraph 接入 Langfuse

这个示例会运行一个带 `calculator` 工具的 LangGraph agent，并把完整调用链发送到 Langfuse：

```text
LangGraph trace
├── agent 节点
│   └── LLM generation（决定调用工具）
├── tools 节点
│   └── calculator tool
└── agent 节点
    └── LLM generation（生成最终回答）
```

## 1. 配置环境变量

在项目根目录 `.env` 中补充：

```dotenv
LANGFUSE_PUBLIC_KEY=pk-lf-...
LANGFUSE_SECRET_KEY=sk-lf-...

# Langfuse Cloud EU；使用其他区域或自部署时改成对应地址
LANGFUSE_BASE_URL=https://cloud.langfuse.com

# 可选：方便在 Langfuse 中筛选
LANGFUSE_TRACING_ENVIRONMENT=development
LANGFUSE_DEMO_USER_ID=demo-user-001
LANGFUSE_DEMO_SESSION_ID=demo-session-001
```

模型仍复用项目根目录 `model.ts` 和 `.env` 中的 `TX_*` 配置。

## 2. 运行

```bash
pnpm demo6
```

也可以传入自己的问题：

```bash
pnpm demo6 "请用 calculator 计算 144 除以 12"
```

运行结束会输出回答、trace ID 和 Langfuse 地址。在 Langfuse 的 **Tracing / Traces** 页面按 trace 名 `demo6-langgraph-agent`、user ID、session ID 或 tag `demo6` 查找。

## 3. 关键接入点

- `instrumentation.ts` 必须最先加载，负责注册 `LangfuseSpanProcessor`。
- `CallbackHandler` 通过 LangGraph 的 `callbacks` 记录 graph、模型和工具调用。
- TypeScript 版动态身份字段是 `langfuseUserId` 和 `langfuseSessionId`。
- CLI 退出前调用 `shutdownLangfuse()`，确保尚未发送的 trace 完整落库。

排查 trace 未出现时，可临时在 `.env` 设置 `LANGFUSE_DEBUG=true` 查看 SDK 调试日志。
