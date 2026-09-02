# ai-agent-deepagent-demo

基于 [deepagents](https://www.npmjs.com/package/deepagents) + Anthropic Claude 的命令行多轮对话 Agent 演示。

在终端里与一个"善于计算"的 DeepAgent 持续对话：实时展示模型的思考过程、工具调用入参/出参，以及最终回答，并将完整对话历史持久化到本地 JSON 文件，下次启动可自动恢复上下文。

## 功能特性

- **持续多轮对话**：命令行交互式输入，输入 `exit`、`quit` 或 `退出` 结束会话。
- **实时过程展示**：流式区分打印 `[思考过程]`（thinking / reasoning）与 `[最终回答]`，并以彩色标签展示工具的调用事件（`[工具调用]`、`[入参]`、`[出参]`、`[工具错误]`）。
- **自定义工具**：内置「天地同寿算法」工具——对给定的两个数 `a`、`b` 返回 `a + b + 100`，Agent 会根据问题自行判断是否调用。
- **对话历史持久化**：每轮结束后从 LangGraph checkpointer 取出完整消息链，原子写入 `_data/conversation.json`；下次启动自动恢复历史，跨会话保持连续。
- **中文学术演示**：系统提示要求全程中文交流，并先说明思考过程，适合观察 Agent 的工具调用链路。

## 环境要求

- Node.js（版本需支持直接运行 TypeScript，如 Node ≥ 23.6；`package.json` 的 `pnpm dev` 直接执行 `node src/index.ts`）
- pnpm（仓库声明 `pnpm@11.24.0`）

## 环境变量

复制并填写项目根目录 `.env`：

```dotenv
ANTHROPIC_API_KEY=你的密钥
ANTHROPIC_BASE_URL=https://api.anthropic.com   # 或你的 OpenAI 兼容代理地址
MODEL=claude-sonnet-4-5                         # 填入你实际使用的模型 ID

# 可选：需要把调用追踪到 LangSmith 时再配置
# LANGSMITH_API_KEY=
```

- `ANTHROPIC_BASE_URL` 可选，支持通过代理/中转服务调用 Anthropic 兼容接口。
- 代码通过 `ChatAnthropic` 发起请求，模型需支持工具调用与 thinking/reasoning 输出块。

## 快速开始

```bash
# 1. 安装依赖
pnpm install

# 2. 启动对话
pnpm dev
```

启动后按提示输入问题即可。示例：

```
你：
帮我算一下 3 和 5 用天地同寿算法的结果
```

Agent 会先展示思考过程，再触发「天地同寿算法」工具（入参 `3`、`5`），最后给出结果 `108`。

## 项目结构

```
ai-agent-deepagent-demo
├── .env                        # 环境变量（模型、密钥等）
├── package.json
├── tsconfig.json               # ESM + NodeNext 配置
├── _data
│   └── conversation.json       # 本地对话历史（自动生成，可删除以开启新会话）
└── src
    ├── index.ts                # 程序入口：加载 .env、创建 Agent、启动对话
    ├── agent.ts                # 初始化 ChatAnthropic 模型、注册自定义工具、createDeepAgent
    ├── conversation.ts         # 命令行交互、流式响应、工具事件处理、多轮循环
    ├── conversation-store.ts   # 历史消息的本地 JSON 读写（原子写入、版本校验）
    └── util.ts                 # 终端渲染工具：彩色标签、分块输出、加载动画
```

## 实现要点

| 关注点 | 做法 |
|---|---|
| 历史注入 | 每次启动生成新的 `thread_id`，首轮把磁盘历史拼进输入，由 checkpointer 按 `thread_id` 自动恢复 |
| 流式模式 | `agent.stream(..., { streamMode: ['messages', 'tools'] })` 分别捕获模型消息与工具事件 |
| 工具事件 | 监听 `on_tool_start / on_tool_event / on_tool_end / on_tool_error`，打印入参与出参 |
| 持久化 | 每轮结束后用 `agent.getState()` 取回完整消息链，先写 `.tmp` 再 `rename` 原子落盘 |
| 状态记忆 | 使用 `MemorySaver()` 作为 checkpointer（内存态，跨进程靠本地 JSON 文件兜底） |

## 备注

- 删除或改名 `_data/conversation.json` 即可开始一段全新会话（程序检测到文件缺失时会自动视为新会话）。
- 该示例聚焦 DeepAgent 的 CLI 体验与工具链路展示；如需持久化线程状态到磁盘，可替换为 LangGraph 的 `FileCheckpointSaver`。
