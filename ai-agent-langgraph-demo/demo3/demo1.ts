import {
  StateGraph,
  Annotation,
  BaseCheckpointSaver,
} from '@langchain/langgraph';

// 1.
const MyState = Annotation.Root({
  messages: Annotation({
    reducer: (x: string | number | undefined, y: string | number) => {
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
      messages: 0.2,
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
  // .addEdge("node1", "node2")
  .addEdge('node2', 'node3')
  .addConditionalEdges('node1', (state, config) => {
    if (Number(state.messages) > 0.5) {
      return 'node2';
    } else {
      return '__end__';
    }
  });

class TestSaver extends BaseCheckpointSaver {
  constructor() {
    super();
  }

  async put(config: any, checkpoint: any, metadata: any) {
    console.log('put');
    return {
      configurable: {
        thread_id: 123,
        checkpoint_id: 123123,
      },
    };
  }

  async getTuple(config: any) {
    console.log(config.configurable, '获取所有检查点');
    return undefined;
  }

  async putWrites(config: any, write: any, taskId: any) {
    console.log('putWrites', write, taskId);
  }
}

const checkpointer = new TestSaver();

// 编译
const app = gragh.compile({ checkpointer });
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
