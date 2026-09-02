import express from 'express';
import fs from 'fs';
import { getGraph } from './utils/getGraph';

const expressApp = express();
const app = getGraph();
expressApp.get('/llm', async (req, res) => {
  // 1. 设置 SSE 响应头
  res.set({
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.flushHeaders();

  try {
    const { q, userId, sessionId } = req.query;
    const stream = await app.stream(
      {
        messages: [{ role: 'user', content: q }],
      },
      {
        configurable: {
          userId,
          sessionId,
        },
        streamMode: 'messages', // 2. 配置大模型为stream messages，LangGraph 开启消息流
      },
    );

    const arr = [];
    for await (const [message] of stream) {
      // arr.push(chunk);
      // 3. 获取LangGraph 返回的流式输出数据
      if (typeof message?.content === 'string' && message.content) {
        res.write(`data: ${JSON.stringify({ content: message.content })}\n\n`);
      }
    }
    // fs.writeFileSync('./a.json', JSON.stringify(arr, null, 1));
    res.write(`data: [DONE]\n\n`);
    res.end();
  } catch (error: any) {
    console.error('Error', error);
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    res.end();
  }
});

expressApp.listen(3004, () => {
  console.log('http://localhost:3004');
});
