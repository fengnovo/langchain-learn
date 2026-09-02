import type { BaseMessage } from '@langchain/core/messages';
import { AIMessage, HumanMessage, ToolMessage } from '@langchain/core/messages';
import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { model } from '../model.js';

/**
 * State（状态）：LangGraph 中 Agent 系统处理数据时维护和跟踪信息的载体，
 * 可以理解为系统的“记忆”，在工作流、Agent 或图中随着进程不断推进，
 * 记录并更新其内部信息。消息（SystemMessage/HumanMessage/...）的
 * Content 就是这些状态的直接来源。
 *
 * 本示例通过一次真实的工具调用往返，检查 AIMessage 与 ToolMessage
 * 携带的关键属性（对应 Python 课件「AIMessage / ToolMessage 的
 * additional_kwargs」部分）。
 */

// 两个工具：calculate 真实计算；internet_search 返回模拟搜索结果。
const calculate = tool(
  ({ expression }) => {
    // 演示用：白名单校验后直接求值，避免执行任意代码。
    if (!/^[0-9+\-*/().\s]+$/.test(expression)) {
      throw new Error(`不支持的表达式：${expression}`);
    }
    return String(Function(`"use strict"; return (${expression});`)());
  },
  {
    name: 'calculate',
    description: '计算一个四则运算表达式，例如 125 * 48。',
    schema: z.object({
      expression: z.string().describe('四则运算表达式'),
    }),
  },
);

const internetSearch = tool(
  ({ query }) =>
    `（模拟搜索结果）关于「${query}」：` +
    '1）AI 与量子计算：AI 技术正逐步与量子计算相结合，以解决复杂计算问题；' +
    '2）创新与应用：AI 正加速成为企业潜在能力释放的基础，推动业务创新；' +
    '3）技术趋势：AI 正在快速将企业从基础设施运营到决策支持方面进行重塑；' +
    '4）全球发展动态：全球范围内 AI 领域继续呈现多点突破和交叉融合的态势。',
  {
    name: 'internet_search',
    description: '搜索互联网获取最新信息（演示用，返回模拟结果）。',
    schema: z.object({
      query: z.string().describe('搜索关键词'),
    }),
  },
);

const tools = [calculate, internetSearch];

/** 按名称执行工具，返回工具结果文本（对应 Python 课件里的 coerce_args：参数由 zod schema 自动校验/转换）。 */
async function executeTool(name: string, args: unknown): Promise<string> {
  switch (name) {
    case 'calculate':
      return calculate.invoke(args as { expression: string });
    case 'internet_search':
      return internetSearch.invoke(args as { query: string });
    default:
      throw new Error(`未知工具：${name}`);
  }
}

/**
 * 对应 Python 的 pretty_repr()：返回消息更易读的可视化呈现形式。
 * LangChain.js 没有内置等价方法，通常像这样自行格式化。
 */
function pretty(message: BaseMessage): string {
  const lines = [`[${message.type}] ${message.text || '(无文本内容)'}`];

  if (AIMessage.isInstance(message)) {
    for (const call of message.tool_calls ?? []) {
      lines.push(`  Tool Call: ${call.name} (${call.id ?? '无 id'})`);
      lines.push(`    Args: ${JSON.stringify(call.args)}`);
    }
  }

  return lines.join('\n');
}

async function main(): Promise<void> {
  const question = '请帮我计算 125 * 48 等于多少？另外再搜索一下 AI 最新发展。';
  const modelWithTools = model.bindTools(tools);

  // 第一次调用：模型可能在一条 AIMessage 里同时发起多个工具调用（并行工具调用）。
  const aiMessage = await modelWithTools.invoke([new HumanMessage(question)]);

  console.log('================= Ai Message =================');
  console.log(pretty(aiMessage));

  // AIMessage 的关键属性：
  // - tool_calls：与该消息关联的工具调用；
  // - invalid_tool_calls：与该消息关联的解析错误的工具调用；
  // - usage_metadata：该消息的使用元数据，例如 token 使用情况；
  // - contentBlocks：消息中标准的、结构化的 ContentBlock 列表
  //   （对应 Python 的 content_blocks）。
  console.log('\n--- AIMessage 的属性 ---');
  console.log('tool_calls:', JSON.stringify(aiMessage.tool_calls, null, 2));
  console.log(
    'invalid_tool_calls:',
    JSON.stringify(aiMessage.invalid_tool_calls, null, 2),
  );
  console.log('usage_metadata:', JSON.stringify(aiMessage.usage_metadata));
  console.log(
    'content_blocks:',
    JSON.stringify(aiMessage.contentBlocks, null, 2),
  );

  // 执行每个工具调用，并构造 ToolMessage 把结果传回模型：
  // - tool_call_id：该消息所响应的工具调用唯一标识（必须与调用 id 配对）；
  // - status：工具调用的结果状态（'success' | 'error'）；
  // - artifact：工具执行过程中产生的非传输内容，与工具定义时的
  //   content_and_artifact 参数关联（这里记录原始入参作演示）。
  // Python ToolMessage.additional_kwargs 里的 results 对应这里的 content。
  const toolCalls = aiMessage.tool_calls ?? [];
  const toolMessages: ToolMessage[] = [];

  for (const call of toolCalls) {
    const result = await executeTool(call.name, call.args);
    toolMessages.push(
      new ToolMessage({
        name: call.name,
        content: result,
        tool_call_id: call.id ?? '',
        status: 'success',
        artifact: { args: call.args, executedAt: new Date().toISOString() },
      }),
    );
  }

  console.log('\n================= Tool Message =================');
  for (const message of toolMessages) {
    console.log(`[${message.type}] name=${message.name}`);
    console.log(`  tool_call_id: ${message.tool_call_id}`);
    console.log(`  status: ${message.status ?? '未设置'}`);
    console.log(`  content: ${message.text}`);
    console.log(`  artifact: ${JSON.stringify(message.artifact)}`);
  }

  // 第二次调用：把工具执行结果传回模型，生成最终回复
  // （对应图片中第二个 Ai Message：计算结果 + AI 最新发展总结）。
  const finalReply = await modelWithTools.invoke([
    new HumanMessage(question),
    aiMessage,
    ...toolMessages,
  ]);

  console.log('\n================= 最终回复 =================');
  console.log(finalReply.text);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`\nDemo 执行失败：${message}`);
  process.exitCode = 1;
});
