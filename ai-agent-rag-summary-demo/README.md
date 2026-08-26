# RAG和摘要生成
使用 LanceDB 默认的 L2 欧氏距离；现有 table2 也没有向量索引，因此执行的是精确暴力检索。
当前项目使用的是：
- 匹配方式：向量语义匹配
- 距离算法：L2 欧氏距离（LanceDB 默认）
- 检索方式：精确暴力检索
- 向量索引：没有创建
- _distance：越小表示越相似

```
const queryVector = await this.embeddings.embedQuery(question);
const rows = await this.table
    .vectorSearch(queryVector)
    .select(['i', 'text'])
    .limit(limit)
    .toArray();

```

```
const rows = await this.table
  .vectorSearch(queryVector)
  .distanceType('cosine')
  .select(['i', 'text'])
  .limit(limit)
  .toArray();

LanceDB 返回的是“余弦距离”：
const cosineSimilarity = 1 - row._distance;
```
- _distance 越小越相似
- cosineSimilarity 越大越相似
- 例如 _distance = 0.12，相似度就是 0.88