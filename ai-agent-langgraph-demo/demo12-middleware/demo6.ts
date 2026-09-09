import pg from 'pg';
import { HumanMessage } from '@langchain/core/messages';
import { PostgresSaver } from '@langchain/langgraph-checkpoint-postgres';
import { createAgent } from 'langchain';
import { model } from '../model.js';

/**
 * Demo6：会话（短期记忆 / 检查点）持久化到 PostgreSQL
 *
 * 1. 概念：前面的 demo2 / demo16 用 MemorySaver 做 checkpointer，状态保存在
 *    进程内存里——进程一重启，所有线程的对话历史就丢了。生产环境需要把
 *    「检查点（checkpoint）」落到外部数据库：LangGraph.js 提供
 *    @langchain/langgraph-checkpoint-postgres 的 PostgresSaver，它把每个
 *    超步（super-step）的图状态（messages 等）写入 PostgreSQL，从而——
 *      • 进程重启 / 换一台机器后，凭 thread_id 即可恢复整段对话；
 *      • 多个应用实例共享同一个数据库做会话持久化；
 *      • 天然保留检查点历史（可做 time travel / 回溯）。
 *
 * 2. 与 StoreBackend（demo5）的区别：
 *    - checkpointer（本例 PostgresSaver）保存的是【短期记忆】：按 thread_id
 *      隔离的完整图状态 / 对话历史，框架自动在每个超步读写；
 *    - Store（如 InMemoryStore / PostgresStore）保存的是【长期记忆】：
 *      跨线程、由 Agent 通过文件工具主动存取的知识。本例演示前者。
 *
 * 3. 用法（Python 对照）：
 *    Python:
 *      from langgraph.checkpoint.postgres import PostgresSaver
 *      with PostgresSaver.from_conn_string(os.environ["DATABASE_URL"]) as cp:
 *          cp.setup()                       # 首次部署建表（幂等）
 *          agent = create_agent(..., checkpointer=cp)
 *    TypeScript:
 *      const cp = PostgresSaver.fromConnString(process.env.DATABASE_URL!)
 *      await cp.setup()                     // 首次建表（CREATE TABLE IF NOT EXISTS）
 *      const agent = createAgent({ model, checkpointer: cp })
 *      // ... 用完 await cp.end() 关闭连接池
 *    setup() 会创建 checkpoints / checkpoint_blobs / checkpoint_writes 等表。
 *
 * 4. 运行前置：在项目根目录 .env 中配置 PostgreSQL 连接串，例如
 *      DATABASE_URL=postgresql://user:password@localhost:5432/langgraph
 *    （本地可用 docker 起一个 postgres：
 *      docker run --name lg-pg -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=langgraph -p 5432:5432 -d postgres:16 ）
 */

function env(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(
      `缺少环境变量 ${name}。请在项目根目录 .env 配置 PostgreSQL 连接串，例如：\n` +
        `DATABASE_URL=postgresql://user:password@localhost:5432/langgraph`,
    );
  }
  return value;
}

const databaseUrl = env('DATABASE_URL');

/** 记录所有创建的 saver，结束时统一关闭连接池。 */
const savers: PostgresSaver[] = [];

/**
 * 创建一个【全新】的 PostgresSaver + Agent。
 * 每次调用都新建独立连接池，用来模拟「程序重启 / 换了一个进程」——
 * 内存里没有任何状态，只能从 PostgreSQL 恢复。
 */
async function createFreshAgent() {
  const checkpointer = PostgresSaver.fromConnString(databaseUrl);
  await checkpointer.setup(); // 幂等：表已存在时不会重复创建
  savers.push(checkpointer);
  return createAgent({
    model,
    tools: [],
    checkpointer,
  });
}

/** 读取 Agent 最终回复文本。 */
function finalText(result: unknown): string {
  const messages = (result as { messages?: Array<{ text?: string }> }).messages;
  return messages?.at(-1)?.text ?? '(无回复)';
}

/** 直接查 PostgreSQL，统计某线程在 checkpoints 表里落了多少行（ground truth）。 */
async function countCheckpointRows(threadId: string): Promise<number> {
  const pool = new pg.Pool({ connectionString: databaseUrl });
  try {
    const res = await pool.query<{ n: number }>(
      'SELECT count(*)::int AS n FROM checkpoints WHERE thread_id = $1',
      [threadId],
    );
    return res.rows[0]?.n ?? 0;
  } finally {
    await pool.end();
  }
}

async function main(): Promise<void> {
  const threadId = 'demo6-pg-thread';
  const config = { configurable: { thread_id: threadId } };

  // ===== 场景一：进程 A 写入对话（告诉 Agent 名字）=====
  console.log('===== 场景一：进程 A —— 告诉 Agent「我叫小明」=====');
  const agentA = await createFreshAgent();
  const res1 = await agentA.invoke({
    messages: [new HumanMessage('你好，我叫小明。请记住我的名字。')],
  }, config);
  console.log(`Agent A 回复：${finalText(res1)}`);
  console.log(
    `PostgreSQL 验证：checkpoints 表中线程 ${threadId} 已有 ` +
      `${await countCheckpointRows(threadId)} 行检查点\n`,
  );

  // ===== 场景二：模拟程序重启 —— 全新进程 B，凭同一 thread_id 恢复记忆 =====
  // agentB 是全新实例 + 全新连接池，内存中没有任何对话历史，
  // 但因为 checkpointer 指向同一个 PostgreSQL，它能从库里读回上一段对话。
  console.log('===== 场景二：进程 B（模拟重启）—— 新实例问「我叫什么名字？」=====');
  const agentB = await createFreshAgent();
  const res2 = await agentB.invoke({
    messages: [new HumanMessage('我叫什么名字？')],
  }, config);
  console.log(`Agent B 回复：${finalText(res2)}`);
  console.log('（B 与 A 是两个独立进程/实例，却能答出「小明」——记忆来自 PostgreSQL）\n');

  // ===== 场景三：线程隔离 —— 换一个 thread_id，读不到别的线程的历史 =====
  console.log('===== 场景三：线程隔离 —— 新线程问「我叫什么名字？」=====');
  const otherConfig = { configurable: { thread_id: 'demo6-pg-other' } };
  const res3 = await agentB.invoke({
    messages: [new HumanMessage('我叫什么名字？')],
  }, otherConfig);
  console.log(`新线程回复：${finalText(res3)}`);
  console.log('（不同 thread_id 的短期记忆互不可见）\n');

  // ===== 场景四：检查点历史 —— 直接遍历 PostgresSaver 里该线程的检查点 =====
  console.log('===== 场景四：检查点历史（time travel 基础）=====');
  const checkpointerB = savers.at(-1)!;
  let count = 0;
  for await (const tuple of checkpointerB.list(config)) {
    count += 1;
    const sources = Object.keys(tuple.checkpoint.channel_values ?? {});
    console.log(
      `  检查点 #${count} id=${tuple.config.configurable?.checkpoint_id} ` +
        `channels=[${sources.join(', ')}]`,
    );
  }
  console.log(`线程 ${threadId} 在 PostgreSQL 中共 ${count} 个检查点。`);
}

main()
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`\nDemo 执行失败：${message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    // 关闭所有连接池，避免进程挂住不退出
    await Promise.allSettled(savers.map((saver) => saver.end()));
  });
