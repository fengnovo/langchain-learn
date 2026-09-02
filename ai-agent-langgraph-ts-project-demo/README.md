# ai-agent-langgraph-ts-project-demo

基于 TypeScript + Node.js + ESM 的 LangGraph.js 入门练习项目（目录沿用 `ts-project-template` 模板名）。

`src/` 下提供了 **4 个独立示例**，分别演示用不同的方式编写 LangGraph 工作流：从"类式 `StateGraph`"，到"函数式 `entrypoint`/`task`"，再到多步骤管道与条件分支（质量门控）。每个文件都是可独立运行的完整脚本。

## 项目结构

```
.
├── src/
│   ├── index.ts     # 示例 1：StateGraph「类式」写法——带 add/multiply/divide 工具的 ReAct Agent
│   ├── index2.ts    # 示例 2：entrypoint/task「函数式」写法——实现与示例 1 相同能力的 Agent
│   ├── index3.ts    # 示例 3：函数式 + 多次工具调用——三个中文命名工具组成的"乾坤大挪移"链路
│   └── index4.ts    # 示例 4：多步骤笑话生成管道 + 质量门控条件边（improve/polish）
├── .env / .env.example
├── package.json
├── tsconfig.json
└── pnpm-lock.yaml
```

## 四个示例在讲什么

| 文件 | 演示重点 | 对应 LangGraph API | 提问示例 |
|---|---|---|---|
| `src/index.ts` | 基于图对象：模型节点 + 工具节点 + 条件边循环 | `StateGraph` / `StateSchema` / `MessagesValue` / `ReducedValue` / `addConditionalEdges` | `Add 3 and 4.` |
| `src/index2.ts` | 用函数式 API 表达同样的 ReAct 循环 | `task` / `entrypoint` / `addMessages` | `Add 3 and 4.` |
| `src/index3.ts` | 多次工具调用：先算 `天地良心(a+b)` 与 `老天可鉴(a-b)`，再把两者交给 `乾坤大挪移(a×b)` | `task` / `entrypoint` + `Promise.all` 并发执行工具 | `用乾坤大挪移计算8和3` |
| `src/index4.ts` | 管道式多节点 + 门控分支：没有"妙语"(`?`/`!`)的笑话直接结束 | `StateSchema` + `addConditionalEdges` 作为门控 | 主题 `cats` |

> 提示：示例 3、4 更贴近中文业务场景；示例 4 代码注释里也记录了模型返回 `thinking` 块（非 `text` 块）导致的抽取细节问题，阅读时值得留意。

## 环境变量

复制 `.env.example` 为 `.env`，四个示例都使用 Anthropic 兼容接口：

```dotenv
MODEL=claude-sonnet-4-5
ANTHROPIC_API_KEY=你的密钥
ANTHROPIC_BASE_URL=https://api.anthropic.com   # 或你的 OpenAI 兼容代理地址
```

## 可用命令

```bash
pnpm install

# 运行示例 1（默认 dev 入口）
pnpm dev

# 运行其他示例（直接指定文件）
pnpm exec tsx src/index2.ts
pnpm exec tsx src/index3.ts
pnpm exec tsx src/index4.ts

# 编译 TypeScript 到 dist/（输出后可用 node dist/index.js 运行示例 1）
pnpm build
pnpm start
```

## tsconfig.json 配置说明

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "types": ["node"],
    "esModuleInterop": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules"]
}
```

| 配置项 | 值 | 说明 |
|---|---|---|
| `target` | `ES2020` | 编译输出的 JavaScript 目标版本。ES2020 支持可选链 (`?.`)、空值合并 (`??`)、`Promise.allSettled` 等特性，兼容 Node.js 14+ |
| `module` | `ESNext` | 模块系统使用最新的 ES 模块标准。配合 `package.json` 中的 `"type": "module"`，让 Node.js 以 ESM 方式加载模块，支持 `import` / `export` 语法 |
| `moduleResolution` | `Bundler` | 模块解析策略。`Bundler` 是 TypeScript 4.7+ 新增的策略，模拟现代打包器（如 esbuild、Vite）的解析行为：允许省略文件扩展名、支持 `exports` 字段等，比传统的 `node` 策略更贴合 ESM 生态 |
| `types` | `["node"]` | 显式启用 Node.js 类型定义，可正确识别 `process`、`Buffer`、`node:fs` 等 Node API |
| `esModuleInterop` | `true` | 启用 CommonJS 与 ES Module 之间的互操作性 |
| `outDir` | `./dist` | 编译输出目录 |
| `rootDir` | `./src` | 源码根目录，`tsc` 编译后会保持 `src/` 的目录结构输出到 `dist/` |
| `strict` | `true` | 开启所有严格类型检查选项 |

## 依赖说明

| 依赖 | 用途 |
|---|---|
| `@langchain/anthropic` | 通过 `ChatAnthropic` 调用 Anthropic 兼容模型 |
| `@langchain/core` | 消息类型（`HumanMessage` / `SystemMessage` / `AIMessage` / `ToolMessage`）、`tool` 工具定义 |
| `@langchain/langgraph` | 图核心：`StateGraph`、`entrypoint`、`task`、`addMessages`、`StateSchema` 等 |
| `zod` | 工具入参 schema 与状态字段校验 |
| `dotenv` | 读取 `.env` 环境变量 |
| `tsx` / `typescript` / `@types/node` | 直接运行 / 编译 TypeScript |

## 包管理器

本项目使用 **pnpm** 作为包管理器。
