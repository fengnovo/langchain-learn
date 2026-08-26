import fs from 'fs';
import { StateGraph, MessagesAnnotation } from '@langchain/langgraph';
import { ChatOpenAI } from '@langchain/openai';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import { mapChatMessagesToStoredMessages } from '@langchain/core/messages';
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { customCalc } from './tool';

dotenv.config({
  path: fileURLToPath(new URL('../.env', import.meta.url)),
});

const model = new ChatOpenAI({
  modelName: process.env.MODEL,
  apiKey: process.env.OPENAI_API_KEY,
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL,
  },
});

const tools = [customCalc];

const modelWithTools = model.bindTools(tools);
// 2.创建图, MessagesAnnotation 是内置的，里面会自动有个message，会将上个节点的message自动push到当前数组，并返回给当前节点
// 会把每个节点自动包装成
const workflow = new StateGraph(MessagesAnnotation);

async function callModel(state: { messages: string[] }) {
  const messages = state.messages;
  const response = await modelWithTools.invoke(messages);

  return { messages: [response] };
}

const toolNode = new ToolNode(tools);

function shouldContinue(state: any) {
  const { messages } = state;
  const lastMessage = messages[messages.length - 1];
  if (!lastMessage.tool_calls || lastMessage.tool_calls.length === 0) {
    return '__end__';
  }
  return 'tools';
}

workflow
  .addNode('agent', callModel)
  .addNode('tools', toolNode)

  .addEdge('__start__', 'agent')
  .addConditionalEdges('agent', shouldContinue) // agent 之后判断是否要调用工具
  .addEdge('tools', 'agent'); // 工具 执行完之后 传回给大模型

// 编译
const app = workflow.compile();
const result = await app.invoke({
  messages: [{ role: 'user', content: '使用天地同寿算法计算3和4' }],
});

const storeData = JSON.stringify(
  mapChatMessagesToStoredMessages(result.messages),
  null,
  2,
);
fs.writeFileSync(
  fileURLToPath(new URL('./result.json', import.meta.url)),
  storeData,
);
