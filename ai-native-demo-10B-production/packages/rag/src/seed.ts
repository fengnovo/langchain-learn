import fs from "node:fs/promises";
import path from "node:path";
import OpenAI from "openai";
import pg from "pg";
import pgvector from "pgvector/pg";
import { chunkText } from "./index.js";
if (process.env.MOCK_MODE !== "false") {
  console.error(
    "当前 MOCK_MODE=true。要写入真实 pgvector，请先把 .env 中 MOCK_MODE 改为 false。"
  );
  process.exit(1);
}
const root = path.resolve(process.cwd(), "../../mock-company");
const files = await walk(root);
const embeddingClient = new OpenAI({
  apiKey: process.env.EMBEDDING_API_KEY ?? "ollama",
  baseURL: process.env.EMBEDDING_BASE_URL ?? "http://localhost:11434/v1"
});
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL
});
const client = await pool.connect();
try {
  await pgvector.registerTypes(client);
  await client.query("TRUNCATE TABLE knowledge_chunks RESTART IDENTITY");
  for (const file of files) {
    const source = path.relative(root, file);
    const text = await fs.readFile(file, "utf-8");
    const chunks = chunkText(text);
    for (const [index, content] of chunks.entries()) {
      const response = await embeddingClient.embeddings.create({
        model: process.env.EMBEDDING_MODEL ?? "bge-m3",
        input: content
      });
      const embedding = response.data[0]?.embedding;
      if (!embedding) {
        throw new Error(`Embedding 为空: ${source}#${index}`);
      }
      await client.query(
        `
        INSERT INTO knowledge_chunks
          (source, chunk_index, content, metadata, embedding)
        VALUES
          ($1, $2, $3, $4, $5)
        `,
        [
          source,
          index,
          content,
          JSON.stringify({ source, index }),
          pgvector.toSql(embedding)
        ]
      );
      console.log(`seeded: ${source}#${index}`);
    }
  }
  console.log("RAG seed 完成。");
} finally {
  client.release();
  await pool.end();
}
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
