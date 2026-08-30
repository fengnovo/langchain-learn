# 03 RAG 生产化
## 1. 文档入口
本项目使用：
```text
mock-company/
```
模拟：
- API 文档
- 研发规范
- 业务规则
- 代码
- 产品资料
---
## 2. Chunk
生产 RAG 不应该直接：
```ts
text.slice(0, 1000)
```
本 Demo 使用简单“段落优先 + 长度兜底”的教学实现。
真实系统建议再加：
- Markdown heading-aware split
- token-based size
- code AST chunk
- metadata
- document permission
---
## 3. qwen3.7-text-embedding
`EmbeddingProvider` 通过 OpenAI-Compatible embeddings API 调用 qwen3.7-text-embedding。
默认示例：
```text
Ollama
http://localhost:11434/v1
model=qwen3.7-text-embedding
```
---
## 4. pgvector
数据库字段：
```sql
embedding vector(1024)
```
检索：
```sql
ORDER BY embedding <=> query_vector
LIMIT top_k
```
`<=>` 是 cosine distance。
距离越小越相似。
代码里转成：
```text
similarity = 1 - distance
```
---
## 5. TopK
本 Demo：
```text
TopK = 4
```
真正生产可以先召回 20～100，再 Rerank Top5。
Demo 10-B 保持主链清爽，没有再把独立 reranker 服务塞进来；Demo03-B 的 Rerank 知识可以直接插到 `retrieve()` 后面。
---
## 6. 权限
真正企业 RAG 必须在检索前/检索时考虑：
```text
user_id
tenant_id
department
document_acl
```
否则“检索准确”但“越权”一样是严重事故。
