// Anthropic 消息响应体类型定义
interface AnthropicContentBlock {
  type: string; // 'text' | 'thinking' 等
  text?: string; // text 块的正文
  thinking?: string; // thinking 块的思考内容
  signature?: string;
}

interface AnthropicMessageResponse {
  id: string;
  type: 'message';
  role: 'assistant';
  model: string;
  content: AnthropicContentBlock[];
  stop_reason: string | null;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

async function chatWithKimi(
  messages: { role: 'user' | 'assistant'; content: string }[],
): Promise<{ text: string; thinking: string; raw: AnthropicMessageResponse }> {
  const resp = await fetch(`${process.env.TX_ANTHROPIC_BASE_URL}/v1/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.TX_ANTHROPIC_API_KEY ?? '',
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: process.env.TX_ANTHROPIC_MODEL ?? 'kimi-k3',
      max_tokens: 2048,
      messages,
    }),
  });

  if (!resp.ok) {
    const err = await resp.json();
    throw new Error(`调用失败 ${resp.status}: ${JSON.stringify(err)}`);
  }

  const data = (await resp.json()) as AnthropicMessageResponse;

  // 按块类型拆分：文本 / 思考过程
  const text = data.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text ?? '')
    .join('');
  const thinking = data.content
    .filter((b) => b.type === 'thinking')
    .map((b) => b.thinking ?? '')
    .join('');

  return { text, thinking, raw: data };
}

async function main() {
  const { text, thinking } = await chatWithKimi([
    { role: 'user', content: '帮我梳理一下今天任务的优先级' },
  ]);

  console.log('回答：', text);
  if (thinking) console.log('思考过程：', thinking);
}

main().catch(console.error);
