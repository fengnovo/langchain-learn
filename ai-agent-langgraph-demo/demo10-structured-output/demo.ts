import { tool } from '@langchain/core/tools';
import { createAgent, toolStrategy } from 'langchain';
import { z } from 'zod';
import { model } from './model.js';

// 简单的计算器工具（对应 Python 示例里的 tools），
// 用于演示业务工具与结构化输出工具可以共存。
const calculator = tool(
  ({ a, b, operation }) => {
    switch (operation) {
      case 'add':
        return String(a + b);
      case 'subtract':
        return String(a - b);
      case 'multiply':
        return String(a * b);
      case 'divide':
        if (b === 0) {
          throw new Error('除数不能为 0');
        }
        return String(a / b);
    }
  },
  {
    name: 'calculator',
    description: '对两个数字执行加、减、乘、除运算。涉及算术时必须调用此工具。',
    schema: z.object({
      a: z.number().describe('第一个数字'),
      b: z.number().describe('第二个数字'),
      operation: z
        .enum(['add', 'subtract', 'multiply', 'divide'])
        .describe('要执行的运算'),
    }),
  },
);

/**
 * 定义输出格式（对应 Python 的 class ContactInfo(BaseModel)）：
 * zod schema 等价于 Pydantic BaseModel，describe 相当于字段的 Field 描述。
 */
const ContactInfo = z.object({
  name: z.string().describe('联系人姓名'),
  email: z.string().describe('电子邮箱'),
  phone: z.string().describe('电话号码'),
});

type ContactInfo = z.infer<typeof ContactInfo>;

// 创建 Agent：ToolStrategy 使用人工工具调用来生成结构化输出，
// 适用于任何支持工具调用的模型（对应 Python 的 response_format=ToolStrategy(ContactInfo)）。
const agent = createAgent({
  model,
  tools: [calculator],
  responseFormat: toolStrategy(ContactInfo),
});

async function main(): Promise<void> {
  const result = await agent.invoke({
    messages: [
      {
        role: 'user',
        content:
          '从以下内容中提取信息：大家都觉得非常靠谱的小明，他的具体联系渠道我这里可以给你。他总是能及时回复邮件，所以如果你有文件或详细问题，发邮件到 xiaoming@mail.com 这个邮箱地址。当然，如果事情比较紧急，或者需要实时语音沟通确认细节，你也可以直接拨打他的个人办公电话，号码是 (04xx) 123-4567, 这个号码通常在工作日的办公时间内都能接通',
      },
    ],
  });

  // 调用 Agent 观察结果：结构化输出在 result.structuredResponse 中
  // （对应 Python 的 result["structured_response"]）。
  const contact = result.structuredResponse as ContactInfo;
  console.log('===== structured_response =====');
  console.log(JSON.stringify(contact, null, 2));
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`\nDemo 执行失败：${message}`);
  process.exitCode = 1;
});
