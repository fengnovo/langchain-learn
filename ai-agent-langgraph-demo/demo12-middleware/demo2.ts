import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { stdin, stdout } from 'node:process';
import type { Interface } from 'node:readline/promises';
import { createInterface } from 'node:readline/promises';
import { HumanMessage } from '@langchain/core/messages';
import { tool } from '@langchain/core/tools';
import { Command, MemorySaver } from '@langchain/langgraph';
import {
  createAgent,
  humanInTheLoopMiddleware,
} from 'langchain';
import { z } from 'zod';
import { model } from '../model.js';

/**
 * Human-in-the-Loop（HITL，人工监督）中间件（对应 Python 课件四页内容）：
 *
 * 1. 概念：HITL 允许用户为代理工具调用添加人工监督。当模型提出可能需要
 *    审查的动作（如写入文件、执行 SQL）时，中间件会暂停执行并等待人类决策。
 *    三种人类响应中断的方式：
 *    - 批准（approve）：批准模型的原始调用请求并执行；
 *    - 编辑（edit）：基于模型原始工具调用进行人工修改并执行；
 *    - 拒绝（reject）：拒绝原始工具调用，可在对话中添加解释引导模型下一步动作。
 *
 * 2. 创建：创建代理时把 HITL 中间件加入 middleware 列表，用 interruptOn
 *    为每个工具配置策略——`true` = 中断并允许 { approve, edit, reject }，
 *    配置对象可显式限定 allowedDecisions，`false` = 不中断自动执行，
 *    未配置的工具默认自动批准（不会触发中断）。
 *    注意：必须配置 checkpointer（检查点），以便在中断间持久化图状态。
 *
 * 3. 响应中断：工具调用与 interruptOn 策略匹配时触发中断，调用结果包含
 *    __interrupt__ 字段，显示需要复核的工具调用；人类用 Command(resume=...)
 *    以列表形式传入决策。多个工具调用同时暂停时，每个工具都需要独立决策，
 *    决策必须按照中断请求中出现的动作顺序提供。
 *    本示例在中断发生时暂停在终端，由你交互输入决策：
 *    - approve：回车确认批准；
 *    - edit：逐项输入新参数（直接回车保留原值，其他类型按 JSON 解析）；
 *    - reject：可输入解释引导模型下一步（直接回车使用默认提示）。
 */

// 演示数据文件（每次运行重置为初始内容）
const dataPath = fileURLToPath(new URL('./data-hitl.txt', import.meta.url));
const INITIAL_CONTENT = '6,小虎,90\n';

// 创建工具：文件写入 / 文件读取 / 文件删除
const writeTxtTool = tool(
  ({ path, content }) => {
    writeFileSync(path, content, 'utf-8');
    return `写入完成: ${path}`;
  },
  {
    name: 'write_txt_tool',
    description: '将文本内容写入给定路径。',
    schema: z.object({
      path: z.string().describe('文件路径'),
      content: z.string().describe('要写入的文本内容'),
    }),
  },
);

const readTxtTool = tool(
  ({ path }) => {
    try {
      return readFileSync(path, 'utf-8');
    } catch {
      return `文件不存在: ${path}`;
    }
  },
  {
    name: 'read_txt_tool',
    description: '读取给定路径的文本内容。',
    schema: z.object({
      path: z.string().describe('文件路径'),
    }),
  },
);

const deleteTxtTool = tool(
  ({ path }) => `已请求删除: ${path}（演示用，未真正删除）`,
  {
    name: 'delete_txt_tool',
    description: '删除给定路径的文本文件。',
    schema: z.object({
      path: z.string().describe('文件路径'),
    }),
  },
);

/**
 * 创建 Agent 并传入 HITL 中间件：
 * - write_txt_tool: true —— 中断，允许 approve / edit / reject 全部决策；
 * - delete_txt_tool: { allowedDecisions: ['approve', 'reject'] } —— 中断，
 *   但显式限定只能批准或拒绝（不允许编辑）；
 * - read_txt_tool: false —— 只读操作不中断，自动执行；
 * - descriptionPrefix：中断说明前缀，展示给人工审核者。
 */
const agent = createAgent({
  model,
  tools: [writeTxtTool, readTxtTool, deleteTxtTool],
  middleware: [
    humanInTheLoopMiddleware({
      interruptOn: {
        write_txt_tool: true,
        delete_txt_tool: { allowedDecisions: ['approve', 'reject'] },
        read_txt_tool: false,
      },
      descriptionPrefix: '工具执行待批准',
    }),
  ],
  // 用户必须配置一个检查点，以在中断间持久化图状态
  checkpointer: new MemorySaver(),
});

// 定义 config 字典（thread_id 标识会话线程），调用时传入
const config = { configurable: { thread_id: 'hitl-demo-thread' } };

/** 中断信息结构（result.__interrupt__[0].value）。 */
interface ActionRequest {
  name: string;
  args: Record<string, unknown>;
  description?: string;
}

interface ReviewConfig {
  actionName: string;
  allowedDecisions: ('approve' | 'edit' | 'reject')[];
}

interface InterruptValue {
  actionRequests?: ActionRequest[];
  reviewConfigs?: ReviewConfig[];
}

interface AgentResult {
  __interrupt__?: Array<{ value?: InterruptValue }>;
  messages?: Array<{ text?: string }>;
}

/** 读取 Agent 最终回复文本。 */
function finalText(result: unknown): string {
  const messages = (result as AgentResult).messages;
  return messages?.at(-1)?.text ?? '(无回复)';
}

/** 打印结果中的中断信息（调用结果包含 __interrupt__ 字段表示需要人工复核）。 */
function printInterrupts(result: unknown, label: string): void {
  const interrupts = (result as AgentResult).__interrupt__;
  if (interrupts === undefined) {
    console.log(`(${label}: 本次未触发中断)`);
    return;
  }
  console.log(`--- ${label}: __interrupt__ ---`);
  console.log(JSON.stringify(interrupts, null, 2));
}

/** 交互式获取一个待审核动作的人工决策（决策必须在 allowedDecisions 范围内）。 */
async function askDecision(
  rl: Interface,
  action: ActionRequest,
  allowed: ('approve' | 'edit' | 'reject')[],
): Promise<Record<string, unknown>> {
  console.log(`\n  待审核工具：${action.name}`);
  console.log(`  可选决策：${allowed.join(' / ')}`);

  for (;;) {
    const answer = (await ask('  请输入你的决策: '))
      .trim()
      .toLowerCase();
    if (!allowed.includes(answer as 'approve' | 'edit' | 'reject')) {
      console.log(`  无效决策「${answer}」，请输入：${allowed.join(' / ')}`);
      continue;
    }

    // 批准：批准模型的原始调用请求并执行
    if (answer === 'approve') {
      return { type: 'approve' };
    }

    if (answer === 'edit') {
      // 编辑：基于原始工具调用修改参数后执行；editedAction.name 也可改为
      // 其他工具名（此处保留原工具），逐项输入，直接回车保留原值。
      const editedArgs: Record<string, unknown> = {};
      for (const [key, original] of Object.entries(action.args)) {
        const input = await ask(
          `  编辑参数 ${key}（回车保留 ${JSON.stringify(original)}）: `,
        );
        if (input.trim() === '') {
          editedArgs[key] = original;
          continue;
        }
        try {
          editedArgs[key] = JSON.parse(input) as unknown;
        } catch {
          editedArgs[key] = input;
        }
      }
      return { type: 'edit', editedAction: { name: action.name, args: editedArgs } };
    }

    // 拒绝：拒绝原始调用，可附加解释引导模型下一步动作（回车使用默认提示）
    const message = await ask('  拒绝原因（回车使用默认提示）: ');
    return {
      type: 'reject',
      message:
        message.trim() || '该操作未通过人工审核，请不要执行该工具并告知用户。',
    };
  }
}

/**
 * 若结果触发中断，则暂停在终端交互式收集人工决策，并用 Command(resume=...)
 * 恢复执行；决策数量与顺序必须与中断请求中的动作一一对应。
 */
async function resumeWithHumanDecision(
  hitlAgent: typeof agent,
  result: unknown,
  invokeConfig: { configurable: { thread_id: string } },
): Promise<unknown> {
  const value = (result as AgentResult).__interrupt__?.[0]?.value;
  const actions = value?.actionRequests ?? [];
  if (!value || actions.length === 0) {
    return result;
  }

  const allowedByName = new Map(
    (value.reviewConfigs ?? []).map((c) => [c.actionName, c.allowedDecisions]),
  );

  console.log(`\n--- ${actions.length} 个工具调用等待人工决策 ---`);
  const decisions: Record<string, unknown>[] = [];
  for (const action of actions) {
    const allowed = allowedByName.get(action.name) ?? ['approve', 'edit', 'reject'];
    decisions.push(await askDecision(rl, action, allowed));
  }

  return hitlAgent.invoke(new Command({ resume: { decisions } }), invokeConfig);
}

// 终端交互：TTY 下逐问等待人工输入；非 TTY（如管道喂入决策）时在启动阶段
// 预读全部标准输入行——否则模型调用等待期间 stdin 提前 EOF 会关闭 readline。
const usingPipedInput = !process.stdin.isTTY;
const pipedLines = usingPipedInput ? readFileSync(0, 'utf-8').split('\n') : [];
let pipedIndex = 0;

const rl = createInterface({ input: stdin, output: stdout });

async function ask(question: string): Promise<string> {
  if (usingPipedInput) {
    const line = pipedLines[pipedIndex] ?? '';
    pipedIndex += 1;
    console.log(`${question}${line}`);
    return line;
  }
  return rl.question(question);
}

async function main(): Promise<void> {
  writeFileSync(dataPath, INITIAL_CONTENT, 'utf-8');
  console.log(`（准备演示文件：${dataPath}\n初始内容：${JSON.stringify(INITIAL_CONTENT)}）\n`);

  try {
    // ===== 场景一：调用代理（不触发中断）—— read_txt_tool 配置为 false =====
    console.log('===== 场景一：读取文件（read_txt_tool: false，不触发中断）=====');
    const result1 = await agent.invoke(
      {
        messages: [
          new HumanMessage(`帮我查看 ${dataPath} 文件中有什么内容?`),
        ],
      },
      config,
    );
    printInterrupts(result1, '场景一');
    console.log(`最终回复：${finalText(result1)}\n`);

    // ===== 场景二：调用代理（触发中断）—— write_txt_tool: true，由你决策 =====
    console.log('===== 场景二：写入文件（write_txt_tool: true，触发中断后交互决策）=====');
    const result2 = await agent.invoke(
      {
        messages: [
          new HumanMessage(`为我在 ${dataPath} 中添加一行小虎的数学成绩为95。`),
        ],
      },
      config,
    );
    printInterrupts(result2, '场景二中断');
    const result2Resumed = await resumeWithHumanDecision(agent, result2, config);
    console.log(`\n[决策后] 最终回复：${finalText(result2Resumed)}`);
    console.log(`[决策后] 文件实际内容：\n${readFileSync(dataPath, 'utf-8')}\n`);

    // ===== 场景三：调用代理（触发中断）—— delete_txt_tool 只允许 approve/reject =====
    console.log('===== 场景三：删除文件（delete_txt_tool，触发中断后交互决策）=====');
    const result3 = await agent.invoke(
      {
        messages: [new HumanMessage(`请删除文件 ${dataPath}。`)],
      },
      config,
    );
    printInterrupts(result3, '场景三中断');
    const result3Resumed = await resumeWithHumanDecision(agent, result3, config);
    console.log(`\n[决策后] 最终回复：${finalText(result3Resumed)}`);
    console.log(`[决策后] 文件仍然存在：${readFileSync(dataPath, 'utf-8')}\n`);

    // ===== 场景四：调用代理（触发中断）—— 编辑（edit）修改参数后执行 =====
    // 除了批准和拒绝，用户还可以通过 Command 命令以编辑（edit）响应中断：
    // 可以修改工具调用的“参数”作为中断响应，必要时也可通过 editedAction.name
    // 修改所调用的工具，改为调用其他工具。
    console.log('===== 场景四：写入文件（write_txt_tool: true，触发中断后编辑参数）=====');
    // 使用独立线程，让本场景可重复运行
    const editConfig = { configurable: { thread_id: 'hitl-demo-thread-edit' } };
    const result4 = await agent.invoke(
      {
        messages: [
          new HumanMessage(`为我在 ${dataPath} 文件末尾追加一行：8,小虎,88`),
        ],
      },
      editConfig,
    );
    printInterrupts(result4, '场景四中断');
    const result4Resumed = await resumeWithHumanDecision(agent, result4, editConfig);
    console.log(`\n[编辑后] 最终回复：${finalText(result4Resumed)}`);
    console.log(`[编辑后] 文件实际内容：\n${readFileSync(dataPath, 'utf-8')}`);
  } finally {
    rl.close();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`\nDemo 执行失败：${message}`);
  process.exitCode = 1;
});
