import type { BaseMessage } from '@langchain/core/messages';
import { AIMessage, HumanMessage, ToolMessage } from '@langchain/core/messages';
import { tool } from '@langchain/core/tools';
import { createAgent, summarizationMiddleware } from 'langchain';
import { z } from 'zod';
import { model } from '../model.js';

/**
 * Summarization 中间件（对应 Python 课件四页内容）：
 *
 * 1. 概念：在接近令牌限制或其他条件时，自动总结对话记录，保留近期消息的
 *    同时压缩较早的上下文，为 Agent 在更复杂的长时序环境中的任务执行提供
 *    便利。摘要功能适用于以下场景：
 *    - 长文本（Long-context）：超出上下文窗口的长期对话任务；
 *    - 多轮次（multi-turn）：具有丰富历史记录的多轮对话；
 *    - 高冗余（High-redundancy）：需要完整保留对话上下文的应用场景。
 *
 * 2. 创建：把中间件添加到 Agent 的中间件列表中。设置触发条件后，当 Agent
 *    的消息列表符合条件，中间件会依据用户配置精简消息列表后继续任务执行。
 *    - model：定义总结模型（负责生成摘要）；
 *    - trigger：Summarization 中间件总结摘要触发条件；
 *    - keep：总结摘要后维持的消息列表状态。
 *
 * 3. 触发与流程：Summarization 属于 before_model 类型钩子（Hook），该钩子在
 *    每一次对模型调用之前，依据用户拟定条件检查是否符合触发条件；达到阈值时
 *    自动对较旧的消息进行摘要处理——旧消息被替换为一条 "Here is a summary
 *    of the conversation so far..." 的摘要消息。
 *
 * 4. 多种规则制定方式：除消息条数外，还支持 token 计数、模型上下文长度比值
 *    和混合策略。
 *
 * 5. 其他参数配置（见下方 agent4 / agent5）：
 *    - model: string | BaseChatModel —— 与 Agent 创建相同，可利用字符串配置
 *      模型，也可直接传入模型对象；
 *    - trigger: ContextSize | ContextSize[] —— 可接受单一条件对象，或条件对象
 *      列表作为多条件触发（混合配置：任一条件符合都会触发摘要）。注意 JS 版
 *      语义：单个对象内的多个属性是「同时满足（AND）」，数组内多个条件是
 *      「任一满足（OR）」；
 *    - keep: ContextSize —— 只能接收单一对象，不进行配置时会默认为
 *      { messages: 20 }；
 *    - summaryPrompt: string —— LangChain 已为用户预设了供摘要模型使用的系统
 *      提示词，当用户有特殊需求时可进行重写以替换预设提示词。注意：自行拟定
 *      提示词中必须包含 {messages} 占位符（会被替换为待摘要的消息列表）。
 */

// 创建工具：模拟 Tavily 联网搜索 + 数学计算
const internetSearch = tool(
  ({ query }) =>
    JSON.stringify({
      query,
      results:
        'DeepSeek 公司发布最新数学推理模型 DeepSeek-Math-V2：' +
        '采用“生成-验证”迭代自检机制，在 MMMO、CMIMOU 24 等数学竞赛评测中' +
        '取得开源模型领先成绩，数学推理能力显著突破。',
    }),
  {
    name: 'internet_search',
    description: '使用 Tavily 搜索引擎在互联网上搜索信息（演示用，返回模拟结果）。',
    schema: z.object({
      query: z.string().describe('搜索关键词'),
    }),
  },
);

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
    description: '执行数学计算并返回结果。',
    schema: z.object({
      expression: z.string().describe('四则运算表达式'),
    }),
  },
);

/**
 * 创建 Agent 传入 Summarization：
 * - 导入中间件并传入 middleware 列表；
 * - model=model：定义总结模型；
 * - trigger={ messages: 5 }：配置触发逻辑——消息数达到 5 条触发摘要；
 * - keep={ messages: 3 }：摘要后保留最近 3 条消息。
 */
const agent = createAgent({
  model,
  tools: [internetSearch, calculate],
  middleware: [
    summarizationMiddleware({
      model,
      trigger: { messages: 5 },
      keep: { messages: 3 },
    }),
  ],
});

function printMessages(label: string, messages: BaseMessage[]): void {
  console.log(`${label}（共 ${messages.length} 条）`);
  for (const [index, message] of messages.entries()) {
    const text = message.text.replace(/\s+/g, ' ').slice(0, 90);
    console.log(`  [${index}] [${message.type}] ${text}${message.text.length > 90 ? '…' : ''}`);
  }
}

async function main(): Promise<void> {
  // 预设消息列表：一轮完整的「提问 -> 搜索 -> 结果 -> 回答」历史
  const history: BaseMessage[] = [
    new HumanMessage('deepseek公司最近有什么最新的资讯?'),
    new AIMessage({
      content: '',
      tool_calls: [
        {
          name: 'internet_search',
          args: { query: 'deepseek 最新资讯' },
          id: 'call_search_1',
          type: 'tool_call',
        },
      ],
    }),
    new ToolMessage({
      content:
        '{"query": "deepseek 最新资讯", "results": "DeepSeek 发布数学推理模型 DeepSeek-Math-V2"}',
      tool_call_id: 'call_search_1',
    }),
    new AIMessage(
      '最近，DeepSeek 公司推出了其最新的数学推理模型 DeepSeek-Math-V2，采用生成-验证迭代机制，在多项数学竞赛评测中取得突破。',
    ),
  ];

  // 加入新的询问：预设 4 条 + 新消息 1 条 = 5 条，达到 trigger 阈值
  history.push(new HumanMessage('deepseek的新模型有哪些特点与突破?'));

  printMessages('调用前消息列表', history);

  const result = await agent.invoke({ messages: history });

  console.log('\n===== 观察 Agent 回复（摘要触发后的消息列表）=====');
  printMessages('调用后消息列表', result.messages);

  const firstMessage = result.messages[0];
  const summarized = firstMessage.text.includes('summary');
  console.log(
    `\n较旧消息已被压缩为摘要消息：${summarized ? '是（列表以 "Here is a summary..." 开头）' : '否'}`,
  );

  // ===== Summarization 规则的多种制定方式（创建示例，不实际调用）=====
  // agent2：token 计数——依据消息列表中的 token 数量，触发或保留。
  const agent2 = createAgent({
    model,
    tools: [internetSearch, calculate],
    middleware: [
      summarizationMiddleware({
        model,
        trigger: { tokens: 4000 },
        keep: { tokens: 2000 },
      }),
    ],
  });

  // agent3：模型上下文长度比值——依据模型上下文大小的比例，触发或保留。
  const agent3 = createAgent({
    model,
    tools: [internetSearch, calculate],
    middleware: [
      summarizationMiddleware({
        model,
        trigger: { fraction: 0.8 },
        keep: { fraction: 0.3 },
      }),
    ],
  });

  console.log('\n===== 多种规则制定方式（创建成功）=====');
  console.log(
    `agent2（token 计数：trigger tokens>=4000 / keep tokens>=2000）已创建：${agent2 !== undefined}`,
  );
  console.log(
    `agent3（上下文比值：trigger fraction>=0.8 / keep fraction>=0.3）已创建：${agent3 !== undefined}`,
  );

  // ===== Summarization 的其他参数配置 =====
  // agent4：混合配置——trigger 可设置多触发条件（数组），任一条件符合都会触发
  // 摘要；keep 不进行配置时会默认 { messages: 20 }。model 也可像课件一样用
  // 字符串配置（如 model: 'gpt-4o-mini'），与直接传入模型对象等价。
  const agent4 = createAgent({
    model,
    tools: [internetSearch, calculate],
    middleware: [
      summarizationMiddleware({
        model,
        trigger: [{ tokens: 5000 }, { messages: 3 }],
        keep: { messages: 20 },
      }),
    ],
  });

  // agent5：summaryPrompt——LangChain 已预设供摘要模型使用的系统提示词，有
  // 特殊需求时可重写以替换预设提示词；自行拟定的提示词中必须包含 {messages}
  // 占位符，会被替换为待摘要的消息列表。
  const agent5 = createAgent({
    model,
    tools: [internetSearch, calculate],
    middleware: [
      summarizationMiddleware({
        model,
        trigger: { messages: 5 },
        keep: { messages: 3 },
        summaryPrompt: [
          '请将以下对话历史提炼为简洁的中文摘要，保留关键事实、数据与未完成的任务，按要点列出：',
          '',
          '<messages>',
          '{messages}',
          '</messages>',
        ].join('\n'),
      }),
    ],
  });

  console.log('\n===== 其他参数配置（创建成功）=====');
  console.log(
    `agent4（混合配置：trigger 数组任一条件触发 [tokens>=5000 或 messages>=3]，keep messages=20）已创建：${agent4 !== undefined}`,
  );
  console.log(
    `agent5（自定义 summaryPrompt 重写预设提示词，须含 {messages} 占位符）已创建：${agent5 !== undefined}`,
  );
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`\nDemo 执行失败：${message}`);
  process.exitCode = 1;
});
