import { createDeepAgent } from 'deepagents';
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { SimpleDirectoryReader } from '@llamaindex/readers/directory';
import { OpenAI, OpenAIEmbedding } from '@llamaindex/openai';
import { ChatOpenAI } from '@langchain/openai';
import { Settings, VectorStoreIndex } from 'llamaindex';
import { tool } from '@langchain/core/tools';
import { z } from 'zod';

const currentDirectory = dirname(fileURLToPath(import.meta.url));
// ai-agent-langgraph-demo/demo7-LlamaIndex/your_documents /docs
const documentsDirectory = join(currentDirectory, 'your_documents');

// 无论从哪个目录启动，都固定读取项目根目录的 .env。
dotenv.config({
  path: join(currentDirectory, '../.env'),
  quiet: true,
});

function requiredEnv(
  name: 'OPENAI_API_KEY' | 'MODEL' | 'EMBEDDING_MODEL',
): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`缺少环境变量 ${name}，请先在项目根目录的 .env 中配置。`);
  }

  return value;
}

const apiKey = requiredEnv('OPENAI_API_KEY');
const baseURL = process.env.OPENAI_BASE_URL?.trim() || undefined;
// 这句会删除模型名称开头的 openai:：  openai:gpt-4o → gpt-4o
// 因为 ChatOpenAI 和 LlamaIndex 的 OpenAI 类需要原始模型 ID，例如 gpt-4o，不需要 openai: 前缀。
const modelName = requiredEnv('MODEL').replace(/^openai:/, '');
const embeddingModelName = requiredEnv('EMBEDDING_MODEL');

Settings.chunkSize = 256;
Settings.chunkOverlap = 40;

// LlamaIndex 0.12 需要显式配置生成模型和向量模型。
Settings.llm = new OpenAI({
  model: modelName,
  apiKey,
  baseURL,
});
Settings.embedModel = new OpenAIEmbedding({
  model: embeddingModelName,
  apiKey,
  baseURL,
  embedBatchSize: 1, // 当前兼容接口不适合一次处理较大的文本或批次
  timeout: 60_000,
  maxRetries: 2,
});

const agentModel = new ChatOpenAI({
  model: modelName,
  apiKey,
  configuration: {
    baseURL,
  },
});

async function createQueryEngine() {
  // 加载文档
  const documents = await new SimpleDirectoryReader().loadData({
    directoryPath: documentsDirectory,
  });
  // 创建索引
  const index = await VectorStoreIndex.fromDocuments(documents);
  // 返回查询引擎（用于检索）
  return index.asQueryEngine();
}

function createRetrievalTool(queryEngine: any) {
  return tool(
    async ({ query }: { query: string }) => {
      // 调用 LlamaIndex 进行检索
      const response = await queryEngine.query({ query });
      // 返回检索到的文本内容
      return response.response;
    },
    {
      name: 'knowledge_base_search',
      description:
        '从公司内部知识库中搜索相关信息，用于回答关于内部文档的问题。',
      schema: z.object({
        query: z.string().describe('用户的搜索查询，最好提炼为关键词。'),
      }),
    },
  );
}

async function main() {
  const question = process.argv.slice(2).join(' ').trim() || '病假要怎么弄？';

  // 1. 初始化 LlamaIndex 查询引擎
  const queryEngine = await createQueryEngine();

  // 2. 封装为工具
  const retrievalTool = createRetrievalTool(queryEngine);

  // 3. 创建 DeepAgent，并注册工具
  const agent = createDeepAgent({
    model: agentModel,
    tools: [retrievalTool], // 注册检索工具
  });

  // 4. 使用 agent
  const result = await agent.invoke({
    messages: [{ role: 'user', content: question }],
  });

  console.log(result.messages[result.messages.length - 1].content);
}

main().catch((error) => {
  console.error('Error in main execution:', error);
  process.exitCode = 1;
});
