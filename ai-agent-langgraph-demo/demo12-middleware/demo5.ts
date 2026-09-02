import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { HumanMessage } from '@langchain/core/messages';
import { InMemoryStore } from '@langchain/langgraph';
import {
  CompositeBackend,
  createFilesystemMiddleware,
  FilesystemBackend,
  StateBackend,
  StoreBackend,
} from 'deepagents';
import { createAgent } from 'langchain';
import { model } from '../model.js';

/**
 * File System（文件系统）中间件（对应 Python 课件五页内容）：
 *
 * 1. 概念：上下文（Context）的管理是构建高效 Agent 的关键所在。当使用的工具
 *    调用内部信息不稳定（如网络搜索或 RAG）时，这一挑战尤为严峻，因为冗长的
 *    工具信息会迅速填满上下文窗口。这时可以选择将一些关键信息以「文件」方式
 *    存储为「记忆」，需要使用时再调用获取信息，以支持 Agent 的连续长期运行。
 *
 *    File System 中间件会为 Agent 提供四种工具，用于短期和长期内存记忆的操作：
 *    - ls：列出当前文件系统中的文件列表；
 *    - read_file：读取某完整文件或其中特定行数；
 *    - write_file：创建新文件并写入内容；
 *    - edit_file：编辑某个现有文件。
 *
 * 2. 创建：从 deepagents 包导入 createFilesystemMiddleware 并传入 Agent 的
 *    middleware 列表。三个配置参数：
 *    - backend（可选）：默认为 StateBackend；
 *    - systemPrompt（可选）：自行配置系统提示词；
 *    - customToolDescriptions（可选）：可重写工具描述。
 *
 * 3. 三种后端类型：
 *    - StateBackend：在单次调用中的短暂文件存储，将 Agent 的文件系统嵌入在
 *      状态（State）中。该后端形成的文件（记忆）仅对单个线程保持持久性，
 *      完成任务后就会扔掉草稿；
 *    - FilesystemBackend：给与 Agent 访问本地文件系统的权限。用户可以通过
 *      rootDir 参数指定可访问根目录的绝对（相对）路径；virtualMode 参数在
 *      保证功能完整的前提下，把 Agent 的读写范围锁死在指定根目录；
 *    - StoreBackend：使 Agent 能够访问跨线程持久化的长期存储空间。以构建
 *      存储对象（InMemoryStore）的形式，使 Agent 的存储（记忆）能够脱离
 *      线程进行复用，非常适合需要多次执行的长期记忆或指令 Agent 任务。
 *      注意：StoreBackend 创建的文件与 Store 对象共享生命周期；
 *    - CompositeBackend（复合后端）：当希望为 Agent 提供多种存储（记忆）
 *      形式时，允许同时配置 StateBackend 和 StoreBackend——按路径前缀把
 *      文件操作路由到不同后端，一次装配即可「热插拔」多种存储，尤其适合
 *      结合多种信息源执行任务的情况。两种后端对运行时的使用：
 *      StateBackend → runtime.state（图状态），StoreBackend → runtime.store
 *      （外部存储对象）。
 */

/** 读取 Agent 最终回复文本。 */
function finalText(result: unknown): string {
  const messages = (result as { messages?: Array<{ text?: string }> })
    .messages;
  return messages?.at(-1)?.text ?? '(无回复)';
}

// =====================================================================
// 场景一：StateBackend（默认后端）—— 单次调用内的短暂文件存储
// =====================================================================
// backend 可省略（默认 StateBackend）；此处显式传入以对应课件写法
// backend=lambda runtime: StateBackend(runtime)（TS 版直接 new StateBackend()）。
const stateAgent = createAgent({
  model,
  tools: [], // 四种文件工具由中间件提供，无需手动传入
  middleware: [createFilesystemMiddleware({ backend: new StateBackend() })],
});

// =====================================================================
// 场景二：FilesystemBackend —— 访问本地文件系统（virtualMode 锁死根目录）
// =====================================================================
// 可访问的根目录：demo12-middleware/fs-root（提前创建，保证目录存在）
const fsRoot = fileURLToPath(new URL('./fs-root', import.meta.url));
mkdirSync(fsRoot, { recursive: true });

// 演示 systemPrompt（自定义系统提示词）与 customToolDescriptions（重写工具描述）
const fsAgent = createAgent({
  model,
  tools: [],
  middleware: [
    createFilesystemMiddleware({
      backend: new FilesystemBackend({ rootDir: fsRoot, virtualMode: true }),
      systemPrompt: '当用户要求保存信息时，请把内容写入文件系统。',
      customToolDescriptions: {
        ls: '当需要列出目录中的文件时使用 ls 工具',
        read_file: '使用 read_file 工具读取文件中的内容',
      },
    }),
  ],
});

// =====================================================================
// 场景三：StoreBackend —— 跨线程持久化的长期存储（共享同一个存储对象）
// =====================================================================
// 1. 实例化存储对象（LangGraph Store）
const store = new InMemoryStore();

// 2. 第一个 Agent 传入该存储对象；backend 使用 StoreBackend
const agentStore1 = createAgent({
  model,
  tools: [],
  store, // 传入存储对象
  middleware: [createFilesystemMiddleware({ backend: new StoreBackend({ store }) })],
});

// 4. 第二个 Agent 传入同一个存储对象（记忆脱离线程复用）
const agentStore2 = createAgent({
  model,
  tools: [],
  store, // 同一个 store 实例
  middleware: [createFilesystemMiddleware({ backend: new StoreBackend({ store }) })],
});

// =====================================================================
// 场景四：CompositeBackend —— 复合后端，按路径前缀把操作路由到不同存储
// =====================================================================
// TS 版构造函数为位置参数：new CompositeBackend(默认后端, 路由表)
// （对应 Python 课件 backend=lambda runtime: CompositeBackend(
//     default=StateBackend(runtime), routes={".": StoreBackend(runtime)})；
//   TS 版后端均为直接构造的实例，无需 runtime 工厂。课件用 "." 全路由，
//   这里按典型用法演示：默认走 StateBackend，/memories/ 前缀走 StoreBackend）
const compositeStore = new InMemoryStore();

const compositeAgent = createAgent({
  model,
  tools: [],
  store: compositeStore,
  middleware: [
    createFilesystemMiddleware({
      backend: new CompositeBackend(
        new StateBackend(), // 默认：状态内临时存储（线程结束即丢弃）
        {
          // /memories/ 前缀 → 跨线程持久存储（前缀对 Agent 透明，自动剥离/还原）
          '/memories/': new StoreBackend({ store: compositeStore }),
        },
      ),
    }),
  ],
});

async function main(): Promise<void> {
  // ----- 场景一：单次调用内写入 + 读取（线程结束草稿即被丢弃）-----
  console.log('===== 场景一：StateBackend（短暂存储，仅单线程内持久）=====');
  const res1 = await stateAgent.invoke({
    messages: [
      new HumanMessage(
        '调用工具写入一个文件，文件名为: 密码.txt，内容为: 我们是EgoAlpha',
      ),
      new HumanMessage('调用工具读取名为密码.txt的文件，告诉我里面的内容'),
    ],
  });
  console.log(`读到内容：${finalText(res1)}`);

  // 换一次新调用（新线程）再读同一文件——没有 checkpointer，状态不跨调用保留
  const res2 = await stateAgent.invoke({
    messages: [new HumanMessage('调用工具读取名为密码.txt的文件，告诉我里面的内容')],
  });
  console.log(`新调用读到：${finalText(res2)}\n`);

  // ----- 场景二：写入本地文件系统，并验证真实文件落盘 -----
  console.log('===== 场景二：FilesystemBackend（本地文件系统 + virtualMode）=====');
  const res3 = await fsAgent.invoke({
    messages: [
      new HumanMessage(
        '调用工具写入一个文件，文件名为: 密码.txt，内容为: 我们是EgoAlpha',
      ),
    ],
  });
  console.log(`Agent 回复：${finalText(res3)}`);

  const writtenPath = `${fsRoot}/密码.txt`;
  console.log(
    `磁盘验证：${writtenPath} ${existsSync(writtenPath) ? '已创建，内容为 → ' + JSON.stringify(readFileSync(writtenPath, 'utf-8')) : '未创建'}\n`,
  );

  // ----- 场景三：第一个线程写入，第二个线程读取（跨线程持久化）-----
  console.log('===== 场景三：StoreBackend（跨线程长期存储）=====');
  await agentStore1.invoke({
    messages: [
      new HumanMessage(
        '调用工具写入一个文件，文件名为: 密码.txt，内容为: 我们是EgoAlpha',
      ),
    ],
  });
  console.log('第一个线程已写入 密码.txt');

  const res4 = await agentStore2.invoke({
    messages: [
      new HumanMessage('调用工具读取名为密码.txt的文件，告诉我里面的内容'),
    ],
  });
  console.log(`新线程读到：${finalText(res4)}`);

  // ----- 场景四：同一 Agent 同时装配两种存储，按路径自动分流 -----
  console.log('\n===== 场景四：CompositeBackend（复合后端，热插拔多种存储）=====');
  const res5 = await compositeAgent.invoke({
    messages: [
      new HumanMessage('调用工具写入一个文件，文件名为: 草稿.txt，内容为: 临时草稿'),
      new HumanMessage(
        '调用工具写入一个文件，文件名为: /memories/密码.txt，内容为: 我们是EgoAlpha',
      ),
      new HumanMessage('分别读取 草稿.txt 和 /memories/密码.txt，告诉我里面的内容'),
    ],
  });
  console.log(`本次调用读到：${finalText(res5)}`);

  // 新调用（新线程）：草稿.txt 走 StateBackend 随线程结束消失；
  // /memories/密码.txt 走 StoreBackend 依然可读——一次装配，两种生命周期。
  const res6 = await compositeAgent.invoke({
    messages: [
      new HumanMessage('分别读取 草稿.txt 和 /memories/密码.txt，告诉我里面的内容'),
    ],
  });
  console.log(`新调用读到：${finalText(res6)}`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`\nDemo 执行失败：${message}`);
  process.exitCode = 1;
});
