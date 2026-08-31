/**
 * LangGraph.js 入门模板
 * 根据自己的需要改造这些代码吧！
 */
import { StateGraph } from '@langchain/langgraph';
import { RunnableConfig } from '@langchain/core/runnables';
import { ChatAnthropic } from '@langchain/anthropic';
import dot from 'dotenv';
import { StateAnnotation } from './state.js';

dot.config();
/**
 * 定义节点。节点负责执行图中的工作，应包含大部分业务逻辑。
 * 节点必须返回 StateAnnotation 中所定义属性的一个子集。
 * @param state 图的当前状态。
 * @param config 传入状态图的额外参数。
 * @returns 图状态参数的一个子集，用于更新接下来要执行的边和节点所使用的状态。
 */
const callModel = async (
  state: typeof StateAnnotation.State,
  _config: RunnableConfig,
): Promise<typeof StateAnnotation.Update> => {
  const model = new ChatAnthropic({
    temperature: 0,
    model: process.env.MODEL,
    apiKey: process.env.ANTHROPIC_API_KEY,
    clientOptions: {
      baseURL: process.env.ANTHROPIC_BASE_URL,
      timeout: 30_000,
    },
  });

  const res = await model.invoke(state.messages);
  console.log('Current state:', state, res);
  return {
    messages: [res],
  };

  /**
   * 执行一些工作……（例如调用 LLM）
   * 例如，使用 LangChain 时可以这样做：
   *
   * ```bash
   * $ npm i @langchain/anthropic
   * ```
   *
   * ```ts
   * import { ChatAnthropic } from "@langchain/anthropic";
   * const model = new ChatAnthropic({
   *   model: "claude-3-5-sonnet-20240620",
   *   apiKey: process.env.ANTHROPIC_API_KEY,
   * });
   * const res = await model.invoke(state.messages);
   * ```
   *
   * 或者直接使用 SDK：
   *
   * ```bash
   * $ npm i openai
   * ```
   *
   * ```ts
   * import OpenAI from "openai";
   * const openai = new OpenAI({
   *   apiKey: process.env.OPENAI_API_KEY,
   * });
   *
   * const chatCompletion = await openai.chat.completions.create({
   *   messages: [{
   *     role: state.messages[0]._getType(),
   *     content: state.messages[0].content,
   *   }],
   *   model: "gpt-4o-mini",
   * });
   * ```

  console.log("Current state:", state);
  return {
    messages: [
      {
        role: "assistant",
        content: `Hi there! How are you?`,
      },
    ],
  };

  */
};

/**
 * 路由函数：决定继续研究还是结束构建器。
 * 此函数判断已收集的信息是否足够，或者是否需要进一步研究。
 *
 * @param state - 研究构建器的当前状态
 * @returns 返回 "callModel" 以继续研究，或返回 END 以结束构建器
 */
export const route = (
  state: typeof StateAnnotation.State,
): '__end__' | 'callModel' => {
  if (state.messages.length > 0) {
    return '__end__';
  }
  // 返回并再次执行
  return 'callModel';
};

// 最后，创建图本身。
const builder = new StateGraph(StateAnnotation)
  // 添加负责执行工作的节点。
  // 以这种方式将节点链接起来会更新 StateGraph 实例的类型，
  // 因此在添加边时可以进行静态类型检查。
  .addNode('callModel', callModel)
  // 普通边表示“节点 A 完成后始终转移到节点 B”。
  // "__start__" 和 "__end__" 是始终存在的“虚拟”节点，
  // 分别表示构建器的开始和结束。
  .addEdge('__start__', 'callModel')
  // 条件边可以根据情况路由到不同节点（或结束流程）
  .addConditionalEdges('callModel', route);

export const graph = builder.compile();

graph.name = 'New Agent';
