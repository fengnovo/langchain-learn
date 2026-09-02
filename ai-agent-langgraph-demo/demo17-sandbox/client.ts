/**
 * 模式一：Agent in Sandbox —— 宿主机客户端
 *
 * 对应课件 client.py：沙箱内的 DeepAgent 通过 HTTP 与外界交互，
 * client 只需要 POST { message, thread_id } 到 http://localhost:8000/chat。
 *
 * 运行前提：先启动沙箱内服务
 *   - Docker 方式：docker build -t deepagent-ts . && docker run --rm -p 8000:8000 \
 *       -v "$(pwd)/workspace:/workspace" --env-file ../../.env deepagent-ts
 *   - 本地调试：pnpm demo17:serve
 * 然后执行：pnpm demo17:client
 */
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

dotenv.config({
  path: fileURLToPath(new URL('../../.env', import.meta.url)),
  quiet: true,
});

const BASE_URL = process.env.AGENT_BASE_URL ?? 'http://localhost:8000';

// 对应课件 chat(message, thread_id)：发送 POST 请求
async function chat(message: string, threadId = 'default'): Promise<void> {
  const resp = await fetch(`${BASE_URL}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, thread_id: threadId }), // 请求体
  });
  const data = (await resp.json()) as { response?: string; error?: string };
  console.log(JSON.stringify({ response: data.response ?? data.error }));
}

async function main(): Promise<void> {
  // 测试1：简单对话
  console.log('=== 测试1: 简单对话 ===');
  await chat('你好，请介绍一下自己', 'test-chat');

  // 测试2：代码执行（写文件 + 在沙箱中运行）
  console.log('\n=== 测试2: 代码执行 ===');
  await chat(
    '在 workspace 文件夹中，创建一个 Python 文件打印 Hello World 字符串，然后运行它。',
    'test-code',
  );

  // 测试3：查看文件
  console.log('\n=== 测试3: 查看文件 ===');
  await chat('查看一下当前工作目录中有什么文件', 'test-file');
}

main().catch((e) => {
  console.error('客户端执行失败:', e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
