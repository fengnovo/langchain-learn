import type { BaseMessage } from '@langchain/core/messages';
import {
  AIMessage,
  HumanMessage,
  SystemMessage,
  ToolMessage,
} from '@langchain/core/messages';
import { model } from '../model.js';

/**
 * 消息的分类（对应 Python 示例的 messages 列表）：
 *
 * - SystemMessage：一组初始指令，用于引导模型的行为——设置基调、
 *   定义模型的角色并建立响应指南；
 * - HumanMessage：表示用户输入和交互，可以包含文本、图像、音频、
 *   文件等多模态内容；
 * - AIMessage：表示模型调用的输出，可以包括多模态数据、工具调用和
 *   特定于供应商的 metadata；
 * - ToolMessage：对于支持工具调用的模型，AI 消息可以包含工具调用，
 *   工具消息用于将单个工具执行的结果传递回模型。工具可以生成
 *   ToolMessage 对象，用户也可以直接创建 ToolMessage。
 *
 * Python 从 langchain.messages 导入；TypeScript 从 @langchain/core/messages 导入。
 */
const messages: BaseMessage[] = [
  new SystemMessage(
    '你是一个编程助手,专门帮助用户解答编程相关问题。\n请用清晰、准确的语言回答，并提供实用的代码示例。',
  ),
  new HumanMessage(
    '我想学习Python中的列表推导式,能否详细解释一下并给出几个实用的例子?',
  ),
  new AIMessage(
    '列表推导式是Python中一种简洁创建列表的方法。\n基本语法是: [expression for item in iterable if condition]',
  ),
];

function printMessages(list: BaseMessage[]): void {
  for (const message of list) {
    // .type 返回 'system' | 'human' | 'ai' | 'tool'（等价于 Python 的 message.type）
    console.log(`[${message.type}]`);
    // .text 是消息文本的推荐读取方式（等价于 Python 的 message.content）
    console.log(`${message.text}\n`);
  }
}

console.log('===== 消息的分类 =====');
printMessages(messages);

/**
 * Tool Message（对应 Python 示例的 ai_message / tool_message）：
 *
 * - 对于支持工具调用的模型，AI 消息可以通过 tool_calls 发起工具调用；
 * - 工具消息用于将单个工具执行的结果传递回模型，
 *   tool_call_id 必须与对应工具调用的 id 一一配对。
 */
const aiMessage = new AIMessage({
  content: '',
  tool_calls: [
    {
      name: 'get_weather',
      args: { location: '北京' },
      id: 'call_123',
      type: 'tool_call',
    },
  ],
});

const toolMessage = new ToolMessage({
  content: '晴天，21°C',
  tool_call_id: 'call_123',
});

console.log('===== Tool Message =====');
printMessages([aiMessage, toolMessage]);

/**
 * 把工具执行结果传递回模型：对话序列为
 * 用户提问 -> AI 发起工具调用 -> ToolMessage 返回结果 -> 模型生成最终回复。
 */
const weatherReply = await model.invoke([
  new HumanMessage('北京今天天气怎么样？'),
  aiMessage,
  toolMessage,
]);

console.log('===== 模型基于工具结果的回复 =====');
console.log(`${weatherReply.text}\n`);

/**
 * 历史消息作为本次调用的上下文信息引导模型回复：
 * 把上面的消息列表作为对话历史，再追加一条新的用户消息继续提问，
 * 模型会带着角色设定和前文语境回答。
 */
const response = await model.invoke([
  ...messages,
  new HumanMessage('字典推导式也详细讲讲，并给出几个实用的例子？'),
]);

console.log('===== 基于历史上下文的模型回复 =====');
console.log(response.text);
