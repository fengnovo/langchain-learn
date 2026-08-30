# ts-project-template

基于 TypeScript + Node.js + ESM 的极简项目模板。

## 项目结构

```
.
├── src/
│   ├── index.ts    # 入口文件
│   └── utils.ts    # 工具函数
├── package.json
├── tsconfig.json
├── pnpm-lock.yaml
└── .gitignore
```

## 可用命令

```bash
pnpm dev      # 开发模式，直接运行 src/index.ts
pnpm build    # 编译 TypeScript 到 dist/ 目录
pnpm start    # 运行编译后的代码
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
| `moduleResolution` | `Bundler` | 模块解析策略。`Bundler` 是 TypeScript 4.7+ 新增的策略，模拟了现代打包器（如 esbuild、Vite）的解析行为：允许省略文件扩展名、支持 `exports` 字段等，比传统的 `node` 策略更贴合 ESM 生态 |
| `types` | `["node"]` | 显式启用 Node.js 类型定义。项目运行在 Node.js 环境中，因此可以正确识别 `process`、`Buffer`、`node:fs` 等 Node API |
| `esModuleInterop` | `true` | 启用 CommonJS 与 ES Module 之间的互操作性。允许用 `import foo from 'foo'` 的方式导入 CommonJS 模块，TypeScript 会自动生成兼容代码 |
| `outDir` | `./dist` | 编译输出目录，`tsc` 编译后的 `.js` 文件会输出到这里 |
| `rootDir` | `./src` | 源代码根目录，编译器会保持 `src/` 下的目录结构输出到 `dist/` |
| `strict` | `true` | 开启所有严格类型检查选项，包括 `strictNullChecks`、`noImplicitAny`、`strictFunctionTypes` 等，是 TypeScript 推荐的最高安全级别 |
| `include` | `["src/**/*"]` | 指定编译范围，只编译 `src/` 目录下的所有文件 |
| `exclude` | `["node_modules"]` | 排除 `node_modules` 目录，避免编译依赖包 |

## 依赖说明

| 依赖 | 用途 |
|---|---|
| `typescript` | TypeScript 编译器 (`tsc`) |
| `tsx` | 开发时直接运行 TypeScript 文件，无需预编译，基于 esbuild，速度极快 |
| `@types/node` | Node.js 的 TypeScript 类型定义 |

## 包管理器

本项目使用 **pnpm** 作为包管理器。
