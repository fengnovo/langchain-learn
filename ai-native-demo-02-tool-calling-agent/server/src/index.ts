import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import OpenAI from 'openai';
import type {
  ChatCompletionMessageParam,
  ChatCompletionTool,
} from 'openai/resources/chat/completions';
dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());
const client = new OpenAI({
  apiKey: process.env.LLM_API_KEY,
  baseURL: process.env.LLM_BASE_URL,
});
/**
 * 真实项目中这里可能是：
 * 查询数据库
 * 请求第三方API
 * 调用内部服务
 * 这里为了学习：
 * 使用模拟天气数据。
 */
function getWeather(city: string) {
  return {
    city,
    weather: '晴天',
    temperature: 32,
  };
}
function getUserInfo(req: any) {
  // const ip =
  //   req.headers["x-forwarded-for"]?.toString().split(",")[0] ||
  //   req.socket.remoteAddress;

  return {
    approx_location: 'Taipei',
    timezone: '+08:00',
    local_time: '2026-08-25 12:19',
  };
}

/**
 * Tool定义
 * 告诉LLM：
 * 有哪些能力可以使用。
 */
const tools: ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'get_weather',
      description: '查询城市天气',
      parameters: {
        type: 'object',
        properties: {
          city: {
            type: 'string',
          },
        },
        required: ['city'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_user_info',
      description: '获取当前用户的网络和位置信息',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
];

/**
 * Agent核心循环
 */
app.post('/agent', async (req, res) => {
  const messages: ChatCompletionMessageParam[] = [
    { role: 'user', content: req.body.message },
  ];

  const first = await client.chat.completions.create({
    model: 'qwen3.8-flash',
    messages,
    tools,
  });
  const response = first.choices[0];
  console.log(response.message?.reasoning_content);
  /**
   * 模型决定调用查询用户位置信息工具
   */
  if (response.finish_reason === 'tool_calls') {
    const call = response.message.tool_calls![0];
    const args = JSON.parse(call.function.arguments);
    console.log('调用工具 ' + call.function.name);
    let result;
    if (call.function.name === 'get_user_info') {
      result = getUserInfo({});
    } else if (call.function.name === 'get_weather') {
      result = getWeather(args.city);
    }
    console.log('调用结果 ' + JSON.stringify(result));
    messages.push(response.message);
    messages.push({
      role: 'tool',
      tool_call_id: call.id,
      content: JSON.stringify(result),
    });

    const second = await client.chat.completions.create({
      model: 'qwen3.8-flash',
      messages,
      tools,
    });
    const response2 = second.choices[0];
    console.log(response2.message?.reasoning_content);

    /**
     * 模型决定调用查询天气工具
     */
    if (response2.finish_reason === 'tool_calls') {
      const call = response2.message.tool_calls![0];
      const args = JSON.parse(call.function.arguments);
      console.log('调用工具 ' + call.function.name);
      let result;
      if (call.function.name === 'get_user_info') {
        result = getUserInfo({});
      } else if (call.function.name === 'get_weather') {
        result = getWeather(args.city);
      }
      console.log('调用结果 ' + JSON.stringify(result));

      messages.push(response2.message);
      messages.push({
        role: 'tool',
        tool_call_id: call.id,
        content: JSON.stringify(result),
      });
    } else {
      res.json({ answer: response.message.content });
    }
    /**
     * 再次调用模型
     * 让模型把工具结果转换成人话。
     */
    const final = await client.chat.completions.create({
      model: 'qwen3.8-flash',
      messages,
    });
    res.json({ answer: final.choices[0].message.content });
  } else {
    res.json({ answer: response.message.content });
  }
});
app.listen(3001, () => {
  console.log('Tool Agent running');
});
