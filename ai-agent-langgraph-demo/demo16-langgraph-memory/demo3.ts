import { HumanMessage } from '@langchain/core/messages';
import { tool, type ToolRuntime } from '@langchain/core/tools';
import { InMemoryStore } from '@langchain/langgraph';
import { createAgent } from 'langchain';
import { z } from 'zod';
import { model } from '../model.js';

/**
 * runtime.store 的声明类型是 @langchain/core 的 BaseStore（mget/mset 接口），
 * 而 LangGraph 运行时实际注入的是 put/get/search 接口的 store 对象
 * （本 demo 传入的 InMemoryStore），这里统一断言为 InMemoryStore。
 */
function langgraphStore(runtime: ToolRuntime): InMemoryStore | null {
  return runtime.store as unknown as InMemoryStore | null;
}

/**
 * LangGraph 记忆③：长期记忆（long-term memory）（对应 Python 课件内容）：
 *
 * LangChain 将长期记忆以 JSON 文档的形式存储在 store 对象中。store 中的每个
 * 记忆都组织在自定义命名空间（namespace）和独立键（key）下。命名空间通常包含
 * 用户或组织 ID 或其他标签，便于信息组织——类似文件夹路径：
 * C:\五年级\2班\王五.xls ↔ 命名空间 ('五年级','2班') + 键 '王五'。
 *
 * 创建与使用：InMemoryStore + put(namespace, key, value) / get(namespace, key)。
 * 任意查询方式（namespace, key）→ 与 Store 对象绑定，可以跨线程访问；
 * 运行时通过 runtime.store 访问（区别于短期记忆的 runtime.state）。
 *
 * 与短期记忆（checkpointer）的核心区别（对应课件对照表）：
 * | 维度       | 短期记忆 InMemorySaver        | 长期记忆 InMemoryStore        |
 * | 传入参数    | checkpointer                  | store                         |
 * | 查询方式    | thread_id + checkpoint_id     | (namespace, key) 任意查询      |
 * | 数据关联    | 与特定 thread 绑定（无法跨线程）| 与 Store 对象绑定（可跨线程）  |
 * | 运行时态    | runtime.state / context       | runtime.store                 |
 * | 存储内容    | 完整 State 快照（含对话历史）   | 写入的键值对数据（不含对话）    |
 * | 生命周期    | InMemorySaver/Postgres/SqLite | InMemoryStore/Postgres/SqLite |
 * | 应用场景    | 对话上下文、长任务执行          | 用户画像、知识库等             |
 * | 常用方法    | put/get/get_tuple/list        | put/get/delete/search/list_namespaces |
 */

// =====================================================================
// 第 1 部分：长期记忆的创建与使用（对应课件「长期记忆的创建与使用」）
// =====================================================================
async function storeBasics(): Promise<void> {
  console.log('===== 长期记忆：InMemoryStore 的创建与使用 =====');
  const store = new InMemoryStore();

  // 定义命名空间（类似文件夹路径）
  const namespace1 = ['六年级', '1班'];
  const namespace2 = ['五年级', '2班'];

  // put：存储键值对（JSON 文档）
  await store.put(namespace1, '张三', {
    exam: '期末考试',
    scores: { 英语: 90, 数学: 95 },
    date: '2026-01-15',
  });
  await store.put(namespace1, '李四', {
    exam: '期末考试',
    scores: { 英语: 80, 数学: 85 },
    date: '2026-01-15',
  });
  await store.put(namespace2, '王五', {
    exam: '期末考试',
    scores: { 英语: 95, 数学: 100 },
    date: '2026-01-15',
  });

  // get：通过 (namespace, key) 任意查询——不受线程限制
  const liInfo = await store.get(namespace1, '李四');
  const wangInfo = await store.get(namespace2, '王五');
  console.log(`li_info  = ${JSON.stringify(liInfo)}`);
  console.log(`wang_info = ${JSON.stringify(wangInfo)}`);

  // search：列出命名空间下的所有记忆项
  const classItems = await store.search(namespace1);
  console.log(
    `\nsearch(六年级/1班) 共 ${classItems.length} 项：${classItems.map((item) => item.key).join('、')}`,
  );

  // list_namespaces：列出命名空间（支持前缀过滤）
  const namespaces = await store.listNamespaces({ prefix: ['六年级'] });
  console.log(
    `listNamespaces(prefix=六年级) → ${JSON.stringify(namespaces)}`,
  );

  // delete：删除指定项
  await store.delete(namespace1, '张三');
  const deleted = await store.get(namespace1, '张三');
  console.log(`delete(张三) 后再 get → ${deleted ?? 'null（已删除）'}`);
}

// =====================================================================
// 第 2 部分：Agent 集成 store——跨线程共享长期记忆（用户画像场景）
// =====================================================================

// 写入长期记忆：runtime.store 访问 store（区别于短期记忆的 runtime.state）
const saveUserMemory = tool(
  async ({ userName, preference }, runtime: ToolRuntime) => {
    await langgraphStore(runtime)?.put(['user_profile'], userName, {
      preference,
      updatedAt: new Date().toISOString(),
    });
    return `已把「${userName} 的偏好：${preference}」写入长期记忆。`;
  },
  {
    name: 'save_user_memory',
    description: '把用户偏好写入长期记忆（跨线程共享）。',
    schema: z.object({
      userName: z.string().describe('用户姓名'),
      preference: z.string().describe('偏好描述'),
    }),
  },
);

// 读取长期记忆：任意 (namespace, key) 查询
const getUserMemory = tool(
  async ({ userName }, runtime: ToolRuntime) => {
    const item = await langgraphStore(runtime)?.get(['user_profile'], userName);
    if (!item) return `${userName}：暂无记忆`;
    return `${userName} 的偏好：${String((item.value as { preference?: string }).preference ?? JSON.stringify(item.value))}`;
  },
  {
    name: 'get_user_memory',
    description: '从长期记忆中读取用户偏好（跨线程共享）。',
    schema: z.object({ userName: z.string().describe('用户姓名') }),
  },
);

// 与 Store 对象绑定：换线程、换会话，只要共享同一个 store 就能访问
const store = new InMemoryStore();
const agent = createAgent({
  model,
  tools: [saveUserMemory, getUserMemory],
  store, // 长期记忆：传入 store（短期记忆对应 checkpointer）
});

async function agentMemory(): Promise<void> {
  // ----- 线程 A：用户自我介绍 → 偏好写入长期记忆 -----
  console.log('\n===== 长期记忆 + Agent：线程 A（thread_id="A"）写入 =====');
  const resA = await agent.invoke(
    {
      messages: [
        new HumanMessage('我叫小李。请记住我的偏好：我喜欢简洁的回复，不要长篇大论。'),
      ],
    },
    { configurable: { thread_id: 'A' } },
  );
  console.log(`回复：${resA.messages.at(-1)!.text}`);

  // ----- 线程 B：全新线程（无 checkpointer 对话历史），仍能读到 -----
  console.log('\n===== 长期记忆 + Agent：线程 B（thread_id="B"，验证跨线程）=====');
  const resB = await agent.invoke(
    {
      messages: [
        new HumanMessage('用户小李的偏好是什么？请依据记忆回答。'),
      ],
    },
    { configurable: { thread_id: 'B' } },
  );
  console.log(`回复：${resB.messages.at(-1)!.text}`);
  console.log(
    '\n（线程 B 没有任何对话历史，但通过 runtime.store 读到了线程 A 写入的记忆——长期记忆与 Store 对象绑定，可以跨线程。）',
  );
}

async function main(): Promise<void> {
  await storeBasics();
  await agentMemory();
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`\nDemo 执行失败：${message}`);
  process.exitCode = 1;
});
