import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import OpenAI from 'openai';
dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());
/**
 * 创建 OpenAI Compatible Client
 * 这里不绑定具体厂商。
 * 只要兼容 OpenAI API 格式：
 * OpenAI
 * Azure
 * 通义千问
 * DeepSeek
 * OpenRouter
 * 都可以接入。
 */
const client = new OpenAI({
  apiKey: process.env.LLM_API_KEY,
  baseURL: process.env.LLM_BASE_URL,
});
/**
 * Chat API
 * 为什么使用 SSE？
 * AI 返回不是一次性结果：
 * token1
 * token2
 * token3
 * 一个一个产生。
 * SSE 可以让服务器持续推送。
 */
app.post('/chat', async (req, res) => {
  const { messages } = req.body;
  // 设置 SSE 响应头
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  const stream = await client.chat.completions.create({
    model: 'qwen3.7-plus-2026-05-26',
    messages,
    stream: true,
  });
  /**
   * 遍历模型输出
   * 每一次循环就是一个 token。
   */
  for await (const chunk of stream) {
    const content =
      chunk.choices[0]?.delta?.content || '';
    if(content){
      // SSE 格式
      res.write(
        `data: ${JSON.stringify(content)}\n\n`
      );
    }
  }
  // 告诉浏览器结束
  res.write('data: [DONE]\n\n');
  res.end();
});
app.listen(3000,()=>{
 console.log(
   'AI server running: http://localhost:3000'
 );
});
