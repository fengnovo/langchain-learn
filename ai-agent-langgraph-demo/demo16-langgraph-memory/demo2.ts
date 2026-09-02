import { SystemMessage } from '@langchain/core/messages';
import { tool, type ToolRuntime } from '@langchain/core/tools';
import { MemorySaver } from '@langchain/langgraph';
import { createAgent, createMiddleware } from 'langchain';
import { z } from 'zod';
import { model } from '../model.js';

/**
 * LangGraph 记忆②：定制 Agent 的记忆状态 + 状态记忆的工具读取
 * （对应 Python 课件「定制 Agent 的记忆状态」「状态记忆的工具读取」两页）：
 *
 * 1. 定制记忆状态：记忆（或记忆中的对话信息）的根本意义是记录信息或数据。
 *    我们可以在 states 中定义额外字段进行独特信息的记录——用 zod 定义
 *    stateSchema（如 userName、gender），传入 checkpointer 后该状态随线程
 *    持久化：invoke 输入写入 → 后续调用自动恢复（无需重复传入）。
 *    invoke 的返回值中也包含这些自定义状态字段。
 *
 * 2. 注意的坑：Agent 交互过程中，model 默认只能看到 messages，其他状态
 *    字段需要通过 Middleware 或者其他方式显式注入。本示例用 wrapModelCall
 *    中间件把 userName / gender 注入系统消息。
 *
 * 3. 状态记忆的工具读取：通过工具间接赋予模型访问记忆的能力——工具函数的
 *    第二个参数 runtime（类型 ToolRuntime）访问工具中的短期记忆（状态）：
 *    runtime.state.userName / runtime.state.gender。
 *    还可以结合 before_model / after_model 等钩子实现多样化的记忆写入和
 *    读取，满足各类应用场景。
 */

// ===== 定制记忆状态：在 states 中定义额外字段（对应 CustomAgentState） =====
const stateSchema = z.object({
  userName: z.string().optional(),
  gender: z.enum(['male', 'female']).optional(),
});

// ===== 状态记忆的工具读取：runtime（ToolRuntime）访问短期记忆（状态） =====
// 注意用 type 而非 interface：ToolRuntime<TState> 的 state 类型解析依赖
// TState 对 Record<string, unknown> 的隐式索引签名（interface 不具备）
type MemoryState = {
  userName?: string;
  gender?: string;
};

const getUserInfo = tool(
  (_input, runtime: ToolRuntime<MemoryState>) => {
    const { userName, gender } = runtime.state;
    if (!userName) return 'User Name: 未知, Gender: 未知';
    return `User Name: ${userName}, Gender: ${gender ?? '未知'}`;
  },
  {
    name: 'get_user_info',
    description: '查看当前用户信息（从记忆状态中读取，而非对话内容）。',
    schema: z.object({}),
  },
);

// ===== 中间件注入：model 默认只能看到 messages，其他状态字段需显式注入 =====
const stateInjectMiddleware = createMiddleware({
  name: 'StateInjectMiddleware',
  // 声明关心 memorized 状态字段后，wrapModelCall 的 request.state 才包含它们
  stateSchema,
  wrapModelCall: (request, handler) => {
    const state = request.state as MemoryState;
    if (!state.userName) return handler(request);
    console.log(
      `[状态注入] 把记忆状态写入模型上下文：userName=${state.userName}, gender=${state.gender}`,
    );
    const injected = new SystemMessage(
      `已知用户信息（来自记忆状态，非对话内容）：姓名 ${state.userName}，` +
        `性别 ${state.gender === 'male' ? '男' : '女'}。回答时可直接使用这些信息。`,
    );
    return handler({ ...request, messages: [injected, ...request.messages] });
  },
});

// 配置 checkpointer：自定义状态随线程持久化
const memorySaver = new MemorySaver();

const agent = createAgent({
  model,
  tools: [getUserInfo],
  checkpointer: memorySaver,
  stateSchema, // 定制记忆状态
  middleware: [stateInjectMiddleware], // 非 messages 状态字段的显式注入
});

async function main(): Promise<void> {
  // ----- 1. invoke 输入写入自定义状态字段（对应课件 res["user_name"]） -----
  console.log('===== 定制记忆状态：invoke 写入 user_name / gender =====');
  const res = await agent.invoke(
    {
      messages: [{ role: 'user', content: '你好！' }],
      userName: '李雷',
      gender: 'male',
    },
    { configurable: { thread_id: '1' } },
  );
  console.log(`回复：${res.messages.at(-1)!.text}`);
  // invoke 返回值中读取自定义状态字段（对应课件 print(res["user_name"])）
  const { userName, gender } = res as MemoryState;
  console.log(`返回状态字段 → user_name: ${userName}, Gender: ${gender}`);

  // ----- 2. 新调用不传字段：checkpointer 自动恢复状态（持久化验证） -----
  console.log('\n===== 状态随线程持久化 + 工具读取（"我是谁？"）=====');
  const res2 = await agent.invoke(
    { messages: [{ role: 'user', content: '我是谁？需要我帮你做些什么吗？' }] },
    { configurable: { thread_id: '1' } },
  );
  console.log(`回复：${res2.messages.at(-1)!.text}`);

  // ----- 3. 换个线程：状态不可见（短期记忆按线程隔离） -----
  console.log('\n===== 线程隔离：新线程读不到之前的状态 =====');
  const res3 = await agent.invoke(
    { messages: [{ role: 'user', content: '我是谁？' }] },
    { configurable: { thread_id: '2' } },
  );
  console.log(`回复：${res3.messages.at(-1)!.text}`);

  // ----- 4. 对照：中间件在模型调用前读取并注入状态（跨线程也生效的写法） -----
  console.log('\n===== 中间件显式注入：同一调用中同时观察 [状态注入] 日志 =====');
  const res4 = await agent.invoke(
    {
      messages: [{ role: 'user', content: '用一句话介绍我自己的信息。' }],
      userName: '韩梅梅',
      gender: 'female',
    },
    { configurable: { thread_id: '3' } },
  );
  console.log(`回复：${res4.messages.at(-1)!.text}`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`\nDemo 执行失败：${message}`);
  process.exitCode = 1;
});
