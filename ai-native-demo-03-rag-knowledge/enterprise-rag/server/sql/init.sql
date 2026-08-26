-- PostgreSQL + pgvector 示例
CREATE EXTENSION vector;
CREATE TABLE documents(
 id BIGSERIAL PRIMARY KEY,
 content TEXT,
 embedding vector(1024)
);
-- 查询相似内容
-- SELECT *
-- FROM documents
-- ORDER BY embedding <=> query_vector
-- LIMIT 10;
