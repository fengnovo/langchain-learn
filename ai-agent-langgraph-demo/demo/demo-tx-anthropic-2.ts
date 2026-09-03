import { ChatAnthropic } from '@langchain/anthropic';
import { createDeepAgent } from 'deepagents'; // 以你安装版本的导出为准
import { tool } from '@langchain/core/tools';

// kimi-k3 走 TokenHub 的 Anthropic 兼容协议
const model = new ChatAnthropic({
  model: process.env.TX_ANTHROPIC_MODEL,
  apiKey: process.env.TX_ANTHROPIC_API_KEY,
  clientOptions: {
    baseURL: process.env.TX_ANTHROPIC_BASE_URL,
  },
});

// 示例工具（可按需替换/增加）
const weatherTool = tool(
  async ({ city }: { city: string }) => `查询 ${city} 的天气`,
  {
    name: 'get_weather',
    description: '查询指定城市的天气',
  },
);

const agent = await createDeepAgent({
  model,
  tools: [weatherTool],
});

const result = await agent.invoke({
  messages: [{ role: 'user', content: '帮我查一下深圳今天适合出门吗' }],
});

// 输出结构
console.log(result.messages[result.messages.length - 1].content);
