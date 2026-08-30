import { ChatAnthropic } from '@langchain/anthropic';
import {
  StateGraph,
  StateSchema,
  GraphNode,
  ConditionalEdgeRouter,
  END,
} from '@langchain/langgraph';
import { z } from 'zod/v4';
import dot from 'dotenv';
import { fileURLToPath } from 'node:url';

dot.config({
  path: fileURLToPath(new URL('../.env', import.meta.url)),
});

console.log(
  '------------- 一个多步骤的 AI 笑话生成管道，带有质量门控机制',
  '只有当笑话有"妙语"时才会继续改进和润色 ---------------',
);

// 图状态
const State = new StateSchema({
  topic: z.string(), // 笑话主题
  joke: z.string(), // 初始笑话
  improvedJoke: z.string(), // 改进后的笑话
  finalJoke: z.string(), // 最终笑话
});

const llm = new ChatAnthropic({
  temperature: 0,
  model: process.env.MODEL,
  apiKey: process.env.ANTHROPIC_API_KEY,
  clientOptions: {
    baseURL: process.env.ANTHROPIC_BASE_URL,
    timeout: 30000, // 30秒超时
  },
});

// 定义节点函数
// 根据主题生成初始笑话   ：   第一次 LLM 调用生成初始笑话
const generateJoke: GraphNode<typeof State> = async (state) => {
  console.log('正在生成初始笑话...');
  const msg = await llm.invoke(`Write a short joke about ${state.topic}`);
  console.log('初始笑话生成完成');
  // 处理 content 可能是数组的情况，只提取 text 类型的内容
  const content =
    typeof msg.content === 'string'
      ? msg.content
      : msg.content
          .filter((block: any) => block.type === 'text')
          .map((block: any) => block.text || '')
          .join('');
  return { joke: content };
};

// 质量检查    ：   门控函数：检查笑话是否有妙语
const checkPunchline: ConditionalEdgeRouter<{
  InputSchema: typeof State;
  Nodes: 'improveJoke';
}> = (state) => {
  // 简单检查 - 笑话是否包含 "?" 或 "!"
  if (state.joke?.includes('?') || state.joke?.includes('!')) {
    return 'improveJoke';
  }
  return END;
};

//。通过添加文字游戏来改进笑话  ：  第二次 LLM 调用改进笑话
const improveJoke: GraphNode<typeof State> = async (state) => {
  console.log('正在改进笑话...');
  console.log('当前笑话内容:', state.joke);
  try {
    const msg = await llm.invoke(
      `Make this joke funnier by adding wordplay: ${state.joke}`,
    );
    console.log('笑话改进完成');
    // 处理 content 可能是数组的情况，只提取 text 类型的内容
    const content =
      typeof msg.content === 'string'
        ? msg.content
        : msg.content
            .filter((block: any) => block.type === 'text')
            .map((block: any) => block.text || '')
            .join('');
    return { improvedJoke: content };
  } catch (error) {
    console.error('改进笑话时出错:', error);
    throw error;
  }
};

// 为笑话添加出人意料的转折进行最终润色  ：   第三次 LLM 调用最终润色
const polishJoke: GraphNode<typeof State> = async (state) => {
  console.log('改进笑话内容:', state.improvedJoke);
  console.log('正在润色笑话...');
  try {
    const msg = await llm.invoke(
      `Add a surprising twist to this joke: ${state.improvedJoke}`,
    );
    console.log('笑话润色完成');
    // 处理 content 可能是数组的情况，只提取 text 类型的内容
    const content =
      typeof msg.content === 'string'
        ? msg.content
        : msg.content
            .filter((block: any) => block.type === 'text') // LLM 返回的内容包含 thinking 类型的块（模型的思考过程），而不是 text 类型。当前代码尝试提取 block.text，但 thinking 块没有 text 属性，导致提取失败或返回空字符串。
            .map((block: any) => block.text || '')
            .join('');
    return { finalJoke: content };
  } catch (error) {
    console.error('润色笑话时出错:', error);
    throw error;
  }
};

// 构建工作流
const chain = new StateGraph(State)
  .addNode('generateJoke', generateJoke)
  .addNode('improveJoke', improveJoke)
  .addNode('polishJoke', polishJoke)

  .addEdge('__start__', 'generateJoke')

  .addConditionalEdges('generateJoke', checkPunchline)

  .addEdge('improveJoke', 'polishJoke')
  .addEdge('polishJoke', '__end__')
  .compile();

// 调用执行
const state = await chain.invoke({ topic: 'cats' });

console.log('初始笑话:');
console.log(state.joke);
console.log('\n--- --- ---\n');
if (state.improvedJoke !== undefined) {
  console.log('改进后的笑话:');
  console.log(state.improvedJoke);
  console.log('\n--- --- ---\n');

  console.log('最终笑话:');
  console.log(state.finalJoke);
} else {
  console.log('笑话未通过质量门控 - 未检测到妙语!');
}
