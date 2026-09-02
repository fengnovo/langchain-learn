# ai-agent-rag-summary-demo

RAG（检索增强生成）+ 长文档分段摘要 的 TypeScript 学习示例，使用：

- **向量数据库**：LanceDB（本地文件，`lancedb-data/`）
- **向量化 / 生成**：OpenAI 兼容接口的 Embedding 与 Chat 模型（`@langchain/openai`）
- **文档解析**：`pdf-parse`（PDF）、`mammoth`（docx）、LangChain Community 的加载器
- **文本切分**：`RecursiveCharacterTextSplitter`

仓库包含三部分独立能力：**建立索引**（`src/rag.ts`）、**分段摘要**（`src/summary.ts`）、**RAG 查询客户端**（`src/rag-client.ts`），分别对应 `pnpm rag:index`、`pnpm summary`、`pnpm rag:client` 三个脚本。

## 目录结构

```
ai-agent-rag-summary-demo
├── .env                        # OPENAI_* / MODEL / EMBEDDING_MODEL 等
├── package.json                # rag:index / summary / rag:client 脚本
├── docs                        # 待处理文档
│   ├── pdfFile.pdf             # rag.ts 建索引读取的 PDF
│   ├── pdfFile-source.html     # 该 PDF 的网页源文件（参考用）
│   ├── a.docx                  # summary.ts 摘要读取的 Word 文档
│   └── pdfResultSplit.json / summaryResult.json   # 运行后生成的产物
├── lancedb-data                # LanceDB 向量库目录（表 table2）
└── src
    ├── rag.ts                  # ① 建索引：解析 PDF → 切块 → Embedding → 写入 LanceDB
    ├── summary.ts              # ② 长文档分段摘要（带"前文摘要"上下文）
    └── rag-client.ts           # ③ RAG 查询客户端（命令行 / 交互式）
```

## 环境变量

```dotenv
OPENAI_API_KEY=你的密钥
OPENAI_BASE_URL=https://api.openai.com/v1   # 或你的 OpenAI 兼容地址
MODEL=模型名称
EMBEDDING_MODEL=embedding 模型名称
```

- 建索引 `rag.ts` 用到 `OPENAI_API_KEY`、`OPENAI_BASE_URL`、`EMBEDDING_MODEL`；
- 摘要 `summary.ts` 用到 `OPENAI_API_KEY`、`OPENAI_BASE_URL`、`MODEL`；
- 查询客户端 `rag-client.ts` 三组变量都会用到。

## 一、建立索引（src/rag.ts）

流程：读取 `docs/pdfFile.pdf` → 切块（`chunkSize: 100`，`chunkOverlap: 20`）→ 逐块调用 Embedding 向量化 → 以 `overwrite` 模式写入 LanceDB 表 `table2`。

运行后会：

1. 生成切分结果文件 `docs/pdfResultSplit.json`；
2. 把 `{ i, text, vector }` 写入本地数据库 `lancedb-data/table2`；
3. 用示例问题 `端午节放假几天` 做一次向量检索，控制台打印命中的片段、`_distance` 与原始索引。

```bash
pnpm rag:index
```

## 二、长文档分段摘要（src/summary.ts）

读取 `docs/a.docx`，按中文标点等分隔符切块（`chunkSize: 500`、`chunkOverlap: 50`），**逐段**让 Chat 模型生成摘要，并把"上一段的摘要"作为上下文传入下一段，实现跨段连贯的累积式摘要。

运行结果（每段的 `index`、原文 `chunk`、`summary`）写入 `docs/summaryResult.json`，控制台会实时打印处理进度。

```bash
pnpm summary
```

## 三、RAG 查询客户端（src/rag-client.ts）

连接 LanceDB 中已建好的 `table2`（先运行建索引脚本），把用户问题向量化后召回相似片段，再交给聊天模型**仅依据片段**生成回答。系统提示要求"只使用检索片段回答、不得编造、资料不足时如实说明"，并让模型在答案中标注 `[片段 N]` 作为依据。

支持命令行传参，也支持交互式对话：

```bash
# 查询一次
pnpm rag:client -- "端午节放假几天"

# 召回更多片段（默认 3，范围 1–20）
pnpm rag:client -- --limit 5 "年假有多少天"

# 只看检索结果，不调用聊天模型
pnpm rag:client -- --raw "病假需要什么材料"

# 不带参数进入交互模式（输入 /exit 退出）
pnpm rag:client

# 查看帮助
pnpm rag:client -- --help
```

> 提示：`rag-client.ts` 读取 `LANCEDB_PATH`（默认 `lancedb-data`）与 `LANCEDB_TABLE`（默认 `table2`）两个可选环境变量，可用于指定其它库表。

## 命令速查

| 功能 | 脚本命令 | 等价手写命令 |
|---|---|---|
| 建立索引 | `pnpm rag:index` | `pnpm exec tsx src/rag.ts` |
| 长文档摘要 | `pnpm summary` | `pnpm exec tsx src/summary.ts` |
| RAG 查询 | `pnpm rag:client` | `node src/rag-client.ts` |

## 检索细节说明

- 匹配方式：向量语义匹配（问题先经 Embedding 转为向量再做 `vectorSearch`）。
- 距离算法：LanceDB 默认 **L2 欧氏距离**（`.vectorSearch(queryVector)`）。
- 当前库表没有额外建立向量索引，因此执行的是**精确暴力检索**。
- 返回字段 `_distance`：**越小越相似**。若改用余弦距离（`.distanceType('cosine')`），则 `cosineSimilarity = 1 - _distance`，越大越相似。
