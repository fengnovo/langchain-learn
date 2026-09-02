import { HumanMessage } from '@langchain/core/messages';
import { tool } from '@langchain/core/tools';
import {
  createAgent,
  createMiddleware,
  llmToolSelectorMiddleware,
} from 'langchain';
import { initChatModel } from 'langchain/chat_models/universal';
import { z } from 'zod';
import { model } from '../model.js';

/**
 * LLM tool_selector 中间件（对应 Python 课件四页内容）：
 *
 * 1. 概念：在调用主模型前，利用大型语言模型智能筛选相关工具。该中间件通过
 *    结构化输出向 LLM 询问当前查询最相关的工具，结构化输出模式定义了可用
 *    工具的名称及描述。适用于以下场景：
 *    - 多工具：拥有大量工具（10+）的代理，其中多数工具对每次查询而言并不相关；
 *    - 高成本：通过过滤无关工具来减少 token 使用量；
 *    - 高精度：通过减少冗余工具，提升模型聚焦度与准确性。
 *
 * 2. 创建：使用 tool_selector 时，将中间件添加到 Agent 的中间件列表中。
 *    tool_selector 作为 before_model 类型的钩子，会在每次对模型进行调用前，
 *    基于当前消息列表，触发工具筛选。
 *    - model：负责选取工具的模型；
 *    - maxTools：选取出来的工具数量；
 *    - alwaysInclude：始终被选取的工具名称（不计入 maxTools 数量上限）。
 *    注意：Agent 的工具列表中传入的是工具对象，中间件 alwaysInclude 中只是
 *    以字符串形式传入工具名称。
 *
 * 3. 实现说明（JS 版）：llmToolSelectorMiddleware 通过 wrapModelCall 钩子
 *    实现——每次模型调用前，先用结构化输出让筛选模型从工具池中选出与当前
 *    查询最相关的工具，再把筛选后的工具列表交给真正的模型调用。本示例在
 *    selector 之后注册一个 wrapModelCall 日志中间件（后注册者在内层，能看到
 *    筛选后的请求），打印每次模型调用实际可用的工具，直观观察筛选效果。
 */

// 读取环境变量的小工具（.env 已由 ../model.js 侧加载）
function env(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`缺少环境变量 ${name}，请先在项目根目录的 .env 中配置。`);
  }
  return value;
}

/**
 * 工具筛选专用模型：selector 中间件内部通过 withStructuredOutput 进行结构化
 * 输出（会强制 tool_choice），而 qwen3.8 思考模式下接口不接受该参数（400），
 * 因此与 demo10 相同，用 modelKwargs 显式关闭思考模式。
 */
const selectorModel = await initChatModel(env('MODEL'), {
  modelProvider: 'openai',
  apiKey: env('OPENAI_API_KEY'),
  configuration: { baseURL: env('OPENAI_BASE_URL') },
  temperature: 0,
  maxTokens: 500,
  timeout: 30_000,
  maxRetries: 2,
  modelKwargs: { enable_thinking: false },
});

// ===== 工具池：模拟拥有大量工具的 Agent（课件场景一：10+ 工具）=====
const internetSearch = tool(
  ({ query }) =>
    `（模拟搜索结果）关于「${query}」：联网检索到若干条相关资讯。`,
  {
    name: 'internet_search',
    description: '联网搜索实时资讯与公开信息。',
    schema: z.object({ query: z.string().describe('搜索关键词') }),
  },
);

const calculate = tool(
  ({ expression }) => {
    if (!/^[0-9+\-*/().\s]+$/.test(expression)) {
      throw new Error(`不支持的表达式：${expression}`);
    }
    return String(Function(`"use strict"; return (${expression});`)());
  },
  {
    name: 'calculate',
    description: '执行四则运算数学计算。',
    schema: z.object({ expression: z.string().describe('四则运算表达式') }),
  },
);

const getWeather = tool(
  ({ city }) => `${city}当前晴，气温 26°C，湿度 55%。`,
  {
    name: 'get_weather',
    description: '查询指定城市的当前天气情况。',
    schema: z.object({ city: z.string().describe('城市名称') }),
  },
);

const currencyExchange = tool(
  ({ from, to, amount }) =>
    `（模拟汇率）1 ${from} ≈ ${from === 'JPY' ? 0.047 : 0.78} ${to}，` +
    `${amount} ${from} ≈ ${(amount * (from === 'JPY' ? 0.047 : 0.78)).toFixed(2)} ${to}。`,
  {
    name: 'currency_exchange',
    description: '按当前汇率把一种货币金额换算为另一种货币。',
    schema: z.object({
      from: z.string().describe('源货币代码，如 JPY'),
      to: z.string().describe('目标货币代码，如 CNY'),
      amount: z.number().describe('换算金额'),
    }),
  },
);

const textTranslate = tool(
  ({ text, targetLanguage }) => `（模拟翻译）${text} → ${targetLanguage}`,
  {
    name: 'text_translate',
    description: '把文本翻译成指定语言。',
    schema: z.object({
      text: z.string().describe('待翻译文本'),
      targetLanguage: z.string().describe('目标语言'),
    }),
  },
);

const writeNote = tool(
  ({ content }) => `（模拟写入）笔记已保存：${content}`,
  {
    name: 'write_note',
    description: '把一段内容写入笔记。',
    schema: z.object({ content: z.string().describe('笔记内容') }),
  },
);

/** 完整工具池（对应课件 tools=[tool_1, tool_2, tool_3, tool_4, ...]） */
const toolPool = [
  internetSearch,
  calculate,
  getWeather,
  currencyExchange,
  textTranslate,
  writeNote,
];

/**
 * 观察用中间件：注册在 selector 之后（内层），其 wrapModelCall 看到的
 * request.tools 已经是筛选后的列表——打印出来即可验证工具筛选效果。
 */
const toolSelectionLogger = createMiddleware({
  name: 'tool-selection-logger',
  wrapModelCall: async (request, handler) => {
    const names = request.tools.map((item) =>
      'name' in item ? item.name : '(provider 内置工具)',
    );
    console.log(
      `  [工具筛选结果] 本次模型调用实际可用工具（${names.length} 个）：${names.join('、')}`,
    );
    return handler(request);
  },
});

/**
 * 创建 Agent 传入 tool_selector：
 * - 工具列表包含完整工具池（工具对象）；
 * - model=selectorModel：负责选取工具的模型（也可用字符串如 'openai:gpt-4o-mini'）；
 * - maxTools=2：筛选模型最多选出 2 个工具；
 * - alwaysInclude=['calculate']：calculate 始终被保留（字符串形式，不计入 maxTools）。
 */
const agent = createAgent({
  model,
  tools: toolPool,
  middleware: [
    llmToolSelectorMiddleware({
      model: selectorModel,
      maxTools: 2,
      alwaysInclude: ['calculate'],
    }),
    toolSelectionLogger,
  ],
});

/** 读取 Agent 最终回复文本。 */
function finalText(result: unknown): string {
  const messages = (result as { messages?: Array<{ text?: string }> }).messages;
  return messages?.at(-1)?.text ?? '(无回复)';
}

async function main(): Promise<void> {
  // 场景一：查询天气 + 温度换算——工具池 6 个工具中，只有天气相关工具与本次
  // 查询相关；calculate 因 alwaysInclude 始终保留。
  console.log('===== 场景一：天气 + 温度换算（工具池 6 选 2）=====');
  console.log('问：东京今天的天气怎么样？顺便帮我把 25 摄氏度换算成华氏度。');
  const result1 = await agent.invoke({
    messages: [
      new HumanMessage('东京今天的天气怎么样？顺便帮我把 25 摄氏度换算成华氏度。'),
    ],
  });
  console.log(`\n最终回复：${finalText(result1)}\n`);

  // 场景二：货币兑换——与天气无关的工具应被过滤，选出汇率换算工具。
  console.log('===== 场景二：货币兑换（工具池 6 选 2）=====');
  console.log('问：1000 日元大约能兑换多少人民币？请帮我计算一下。');
  const result2 = await agent.invoke({
    messages: [
      new HumanMessage('1000 日元大约能兑换多少人民币？请帮我计算一下。'),
    ],
  });
  console.log(`\n最终回复：${finalText(result2)}`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`\nDemo 执行失败：${message}`);
  process.exitCode = 1;
});
