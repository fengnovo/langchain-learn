import fs from 'node:fs/promises';
import path from 'node:path';
import OpenAI from 'openai';
import pg from 'pg';
import pgvector from 'pgvector/pg';
type RetrievedChunk = {
  source: string;
  content: string;
  score: number;
};
/**
 * 教学用但接近生产的 RAG Repository。
 * MOCK_MODE=true:
 *   直接从 mock-company 文档做关键词检索。
 * MOCK_MODE=false:
 *   qwen3.7-text-embedding -> pgvector -> TopK。
 */
export class RagRepository {
  private readonly mockMode = process.env.MOCK_MODE !== 'false';
  /**
   * 真实 Embedding Provider。
   * Ollama 现在提供 OpenAI-Compatible /v1/embeddings，
   * 所以这里直接复用 OpenAI SDK。
   */
  private embeddingClient(): OpenAI {
    return new OpenAI({
      apiKey: process.env.EMBEDDING_API_KEY ?? 'ollama',
      baseURL: process.env.EMBEDDING_BASE_URL ?? 'http://localhost:11434/v1',
    });
  }
  private async embed(text: string): Promise<number[]> {
    const response = await this.embeddingClient().embeddings.create({
      model: process.env.EMBEDDING_MODEL ?? 'qwen3.7-text-embedding',
      input: text,
    });
    const vector = response.data[0]?.embedding;
    if (!vector) {
      throw new Error('Embedding provider 没有返回向量');
    }
    return vector;
  }
  /**
   * 生产模式：查询 pgvector。
   */
  private async vectorRetrieve(
    query: string,
    topK: number,
  ): Promise<RetrievedChunk[]> {
    const vector = await this.embed(query);
    const pool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
    });
    const client = await pool.connect();
    try {
      await pgvector.registerTypes(client);
      const result = await client.query<{
        source: string;
        content: string;
        distance: number;
      }>(
        `
        SELECT
          source,
          content,
          (embedding <=> $1) AS distance
        FROM knowledge_chunks
        ORDER BY embedding <=> $1
        LIMIT $2
        `,
        [pgvector.toSql(vector), topK],
      );
      return result.rows.map((row) => ({
        source: row.source,
        content: row.content,
        // cosine distance 越小越近；为了 UI 更直观转成 similarity。
        score: 1 - Number(row.distance),
      }));
    } finally {
      client.release();
      await pool.end();
    }
  }
  /**
   * Mock 模式：最小关键词检索 fallback。
   * 注意：它不是向量检索。
   * 它只是保证第一次运行不依赖数据库/Embedding 服务。
   */
  private async mockRetrieve(
    query: string,
    topK: number,
  ): Promise<RetrievedChunk[]> {
    const root = path.resolve(process.cwd(), '../../mock-company');
    const files = await walk(root);
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    const docs = await Promise.all(
      files.map(async (file) => ({
        source: path.relative(root, file),
        content: await fs.readFile(file, 'utf-8'),
      })),
    );
    return docs
      .map((doc) => {
        const text = doc.content.toLowerCase();
        // 简单相关度：
        // query 中的词在文档中出现得越多，分数越高。
        const hitCount = terms.reduce(
          (count, term) => count + (text.includes(term) ? 1 : 0),
          0,
        );
        // 中文没有空格时关键词法不理想，所以增加业务词兜底。
        const domainBoost = ['订单', 'order', '支付', 'payment'].some(
          (term) => query.toLowerCase().includes(term) && text.includes(term),
        )
          ? 2
          : 0;
        return {
          ...doc,
          score: hitCount + domainBoost,
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }
  async retrieve(query: string, topK = 4): Promise<RetrievedChunk[]> {
    if (this.mockMode) {
      return this.mockRetrieve(query, topK);
    }
    return this.vectorRetrieve(query, topK);
  }
}
/**
 * 递归读取 mock-company。
 */
async function walk(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const output: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      output.push(...(await walk(full)));
    } else if (/\.(md|ts|txt)$/i.test(entry.name)) {
      output.push(full);
    }
  }
  return output;
}
/**
 * 段落优先的最小 Chunker。
 * 真正生产建议替换成：
 * - Markdown heading-aware
 * - token-aware
 * - AST-aware code chunk
 */
export function chunkText(text: string, maxChars = 1200): string[] {
  const paragraphs = text
    .split(/\n{2,}/)
    .map((item) => item.trim())
    .filter(Boolean);
  const chunks: string[] = [];
  let current = '';
  for (const paragraph of paragraphs) {
    if ((current + '\n\n' + paragraph).length <= maxChars) {
      current = current ? `${current}\n\n${paragraph}` : paragraph;
      continue;
    }
    if (current) {
      chunks.push(current);
    }
    // 单段本身超长时再做兜底切片。
    if (paragraph.length > maxChars) {
      for (let i = 0; i < paragraph.length; i += maxChars) {
        chunks.push(paragraph.slice(i, i + maxChars));
      }
      current = '';
    } else {
      current = paragraph;
    }
  }
  if (current) {
    chunks.push(current);
  }
  return chunks;
}
