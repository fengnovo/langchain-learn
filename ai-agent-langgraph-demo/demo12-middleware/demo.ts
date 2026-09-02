import { HumanMessage } from '@langchain/core/messages';
import { tool } from '@langchain/core/tools';
import {
  createAgent,
  createMiddleware,
  modelCallLimitMiddleware,
} from 'langchain';
import { z } from 'zod';
import { model } from '../model.js';

/**
 * 中间件（Middleware）三要素（对应 Python 课件三页内容）：
 *
 * 1. 概念：中间件是 Agent 执行管道中的拦截器，在关键执行节点暴露钩子（hooks），
 *    开发者可注入自定义业务逻辑，实现对代理行为的细粒度控制和功能扩展。
 *    执行管道：任务 -> beforeAgent -> beforeModel -> wrapModelCall
 *              ->（模型 ⇄ 工具列表，wrapToolCall）-> afterModel -> afterAgent -> 用户
 *
 * 2. 创建：把中间件传给 createAgent 的 middleware 参数（一个列表，可传多个）。
 *    注意：同一位置有多个中间件时，按照列表中的先后顺序触发。
 *
 * 3. 分类：
 *    - 预制中间件（Built-in）：summarizationMiddleware（Summarization）、
 *      humanInTheLoopMiddleware（Human-in-the-loop）、todoListMiddleware（To-do list）、
 *      modelCallLimitMiddleware（Model call limit）等；
 *    - 自定义中间件（Custom）：通过 createMiddleware 构建节点型钩子
 *      （beforeAgent / beforeModel / afterModel / afterAgent）与环绕型钩子
 *      （wrapModelCall / wrapToolCall）。
 */

// 演示用工具：查询天气
const getWeather = tool(
  ({ city }) => `${city}当前晴，气温 26°C，空气质量优。`,
  {
    name: 'get_weather',
    description: '查询指定城市的当前天气。',
    schema: z.object({
      city: z.string().describe('城市名称'),
    }),
  },
);

/**
 * 自定义中间件一：audit-trail
 * 主要作用 1（行为记录）：通过日志记录、分析和调试跟踪 Agent 行为，
 * 覆盖全部六种钩子，完整还原课件图中的执行管道。
 */
function log(tag: 'audit-trail' | 'call-counter', hook: string): void {
  console.log(`  [${tag}] ${hook}`);
}

const auditTrail = createMiddleware({
  name: 'audit-trail',

  // 节点型钩子
  beforeAgent: () => log('audit-trail', 'beforeAgent   （Agent 开始前，每次查询一次）'),
  beforeModel: () => log('audit-trail', 'beforeModel   （每次模型调用前）'),
  afterModel: () => log('audit-trail', 'afterModel    （每次模型响应后）'),
  afterAgent: () => log('audit-trail', 'afterAgent    （代理完成后，每次调用一次）'),

  // 环绕型钩子：进入/退出各记录一次
  wrapModelCall: async (request, handler) => {
    log('audit-trail', 'wrapModelCall 进入（环绕每次模型调用）');
    const response = await handler(request);
    log('audit-trail', 'wrapModelCall 退出');
    return response;
  },
  wrapToolCall: async (request, handler) => {
    log('audit-trail', `wrapToolCall 进入（环绕每次工具调用：${request.toolCall.name}）`);
    const result = await handler(request);
    log('audit-trail', 'wrapToolCall 退出');
    return result;
  },
});

/**
 * 自定义中间件二：call-counter
 * 主要作用 3/4（逻辑控制 + 资源限制）：统计每次运行的模型调用次数，
 * 超过上限时提前终止；同时用与 audit-trail 相同位置的钩子验证
 * “同一位置有多个中间件时按列表先后顺序触发”。
 */
let modelCalls = 0;
const MAX_MODEL_CALLS = 5;

const callCounter = createMiddleware({
  name: 'call-counter',

  beforeAgent: () => {
    modelCalls = 0;
    log('call-counter', 'beforeAgent   [计数器清零]');
  },
  beforeModel: () => {
    modelCalls += 1;
    if (modelCalls > MAX_MODEL_CALLS) {
      throw new Error(
        `达到模型调用上限（${MAX_MODEL_CALLS}），提前终止本次运行`,
      );
    }
    log(
      'call-counter',
      `beforeModel   [第 ${modelCalls}/${MAX_MODEL_CALLS} 次模型调用]`,
    );
  },
  wrapModelCall: async (request, handler) => {
    log('call-counter', 'wrapModelCall [计数器]');
    return handler(request);
  },
  afterModel: () => log('call-counter', 'afterModel    [计数器]'),
});

/**
 * 创建 Agent：middleware 参数传入一个列表，可以传多个中间件——
 * 两个自定义中间件 + 一个预制中间件（Built-in：Model call limit，
 * 对应 Python 课件的 ModelCallLimitMiddleware）。
 *
 * Python 课件写法：middleware=[SummarizationMiddleware(...), HumanInTheLoopMiddleware(...)]
 * JS 版还提供 summarizationMiddleware / humanInTheLoopMiddleware / todoListMiddleware。
 */
const agent = createAgent({
  model,
  tools: [getWeather],
  middleware: [
    auditTrail,
    callCounter,
    modelCallLimitMiddleware({ runLimit: 10 }),
  ],
});

const result = await agent.invoke({
  messages: [new HumanMessage('北京今天天气怎么样？')],
});

console.log('\n===== 最终回复 =====');
console.log(result.messages.at(-1)?.text);
