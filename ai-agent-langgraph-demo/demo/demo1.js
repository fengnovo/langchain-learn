import { StateGraph, Annotation } from '@langchain/langgraph';

// 1.
const MyState = Annotation.Root({
  messages: Annotation({
    reducer: (x, y) => {
      return y !== undefined ? y : x;
    },
    default: () => undefined,
  }),
});

// 2.创建图
const gragh = new StateGraph(MyState);

// 3.制作步骤， 开始 -> node1 -> node2 -> node3 -> 结束
gragh
  .addNode('node1', (state, config) => {
    console.log('node1', state.messages, config.configurable?.a);
    return {
      messages: '我是node1的结果',
    };
  })
  .addNode('node2', (state, config) => {
    console.log('node2', state.messages, config.configurable?.a);
    return {
      messages: '我是node2的结果',
    };
  })
  .addNode('node3', (state, config) => {
    console.log('node3', state.messages, config.configurable?.a);
    return {
      messages: '我是node3的结果',
    };
  })
  .addEdge('__start__', 'node1')
  .addEdge('node1', 'node2')
  .addEdge('node2', 'node3');

// 编译
const app = gragh.compile();
const result = await app.invoke(
  { messages: '开始' },
  {
    recursionLimit: 20, // 最多执行的次数
    configurable: {
      a: 123123, // 自定义配置
    },
  },
);
console.log(result);
