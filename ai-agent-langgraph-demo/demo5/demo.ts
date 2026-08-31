import type { AIMessageChunk } from '@langchain/core/messages';
import { concat } from '@langchain/core/utils/stream';
import { model } from '../model.js';

type DemoName = 'invoke' | 'dynamic' | 'batch' | 'stream' | 'async' | 'all';

function printTitle(title: string): void {
  console.log(`\n========== ${title} ==========`);
}

/**
 * pnpm demo5 invoke
 *  单条消息调用。LangChain.js 的模型请求返回 Promise，因此需要 await。 */
async function invokeDemo(): Promise<void> {
  printTitle('单条调用 invoke');
  const response = await model.invoke('为什么鹦鹉有彩色羽毛？');
  console.log(response.text);
}

/**
 * pnpm demo5 dynamic
 * 仅为当前调用覆盖模型参数，不改变 model.ts 中的默认配置。
 * 字段名使用 LangChain.js 的 camelCase：maxTokens，而不是 Python 的 max_tokens。
 */
async function dynamicConfigDemo(): Promise<void> {
  printTitle('动态参数配置');
  const response = await model.invoke(
    '用 100 字以内生成一个有创意的太空故事。',
    {
      configurable: {
        temperature: 0.9,
        maxTokens: 500,
      },
    },
  );
  console.log(response.text);
}

/**
 * pnpm demo5 batch
 * batch 默认并发执行多个独立请求，maxConcurrency 用来限制最大并发数。 */
async function batchDemo(): Promise<void> {
  printTitle('批量调用 batch');
  const questions = [
    '为什么鹦鹉有彩色羽毛？',
    '飞机是如何飞行的？',
    '用一句话解释什么是量子计算？',
  ];

  const responses = await model.batch(questions, { maxConcurrency: 3 });

  responses.forEach((response, index) => {
    console.log(`\n问题 ${index + 1}：${questions[index]}`);
    console.log(`回答：${response.text}`);
  });
}

/**
 * pnpm demo5 stream
 * 流式输出 token/chunk，同时把所有 chunk 聚合成一条完整 AIMessageChunk。 */
async function streamDemo(): Promise<void> {
  printTitle('流式调用 stream');
  const stream = await model.stream('用通俗的语言解释机器学习。');
  let fullResponse: AIMessageChunk | undefined;

  for await (const chunk of stream) {
    process.stdout.write(chunk.text);
    fullResponse = fullResponse ? concat(fullResponse, chunk) : chunk;
  }
}

async function collectStream(prompt: string): Promise<string> {
  let result = '';

  for await (const chunk of await model.stream(prompt)) {
    result += chunk.text;
  }

  return result;
}

/**
 * pnpm demo5 async
 * Python 中的 ainvoke/astream 在 TypeScript 中仍对应 invoke/stream；
 * 它们本身就是异步 API。Promise.all 可并发处理多个异步任务。
 */
async function asyncDemo(): Promise<void> {
  printTitle('异步并发调用');

  const [invokeResponse, streamedResponse] = await Promise.all([
    model.invoke('为什么鹦鹉会模仿人类说话？'),
    collectStream('用两句话解释机器学习。'),
  ]);

  console.log(`invoke 结果：${invokeResponse.text}`);
  console.log(`stream 结果：${streamedResponse}`);
}

// pnpm demo5 all
const demos: Record<Exclude<DemoName, 'all'>, () => Promise<void>> = {
  invoke: invokeDemo,
  dynamic: dynamicConfigDemo,
  batch: batchDemo,
  stream: streamDemo,
  async: asyncDemo,
};

function printHelp(): void {
  console.log(`用法：pnpm demo5 <命令>

命令：
  invoke   单条消息调用
  dynamic  当前调用动态覆盖 temperature/maxTokens
  batch    并发批量调用
  stream   流式输出并聚合完整消息
  async    Promise 异步并发调用
  all      依次运行以上所有示例`);
}

async function main(): Promise<void> {
  const command = process.argv[2];

  if (!command) {
    printHelp();
    return;
  }

  if (command === 'all') {
    for (const demo of Object.values(demos)) {
      await demo();
    }
    return;
  }

  if (!(command in demos)) {
    printHelp();
    process.exitCode = 1;
    return;
  }

  await demos[command as keyof typeof demos]();
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`\nDemo 执行失败：${message}`);
  process.exitCode = 1;
});
