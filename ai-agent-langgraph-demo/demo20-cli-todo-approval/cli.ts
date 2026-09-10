import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import readline from 'node:readline/promises';

import { AIMessage, HumanMessage, ToolMessage } from '@langchain/core/messages';
import { Command, MemorySaver } from '@langchain/langgraph';
import {
  humanInTheLoopMiddleware,
  todoListMiddleware,
  type HITLRequest,
  type HITLResponse,
  type Interrupt,
} from 'langchain';
import { createDeepAgent } from 'deepagents';

import { createBackend } from './backend.js';
import { model } from './model.js';
import {
  A,
  askApproval,
  render,
  tuiFinish,
  tuiLog,
  tuiResetTask,
  tuiSetHeader,
  tuiSetThinking,
  tuiSetTodos,
  tuiShowCursor,
  type ApprovalDecision,
  type Todo,
} from './tui.js';

/**
 * demo20：可实际使用的 Coding Agent CLI
 *
 * 能力全景（DeepAgents 全家桶）：
 * 1. 文件操作：read_file / write_file / edit_file / ls / glob / grep / delete
 *    —— 挂载 FilesystemMiddleware，backend 用 LocalShellBackend 真实落盘；
 * 2. 命令执行：execute 工具（shell 命令在工作目录真实执行，可跑测试 / 构建）；
 * 3. 沙箱：CODE_AGENT_BACKEND=sandbox 切换 LangSmithSandbox 云沙箱；
 * 4. 长程保障：Summarization 上下文压缩、task 子代理上下文隔离（内置）、
 *    skills 技能加载（/skills/ 目录）、todoListMiddleware 任务规划；
 * 5. 人工审批：write_file / edit_file / delete / execute 调用前 interrupt，
 *    CLI 方向键菜单审批（批准 / 拒绝 / 本次会话全部批准）。
 *
 * 用法：
 *   pnpm demo20                         # 进入交互式 REPL
 *   pnpm demo20 "帮我写一个冒泡排序并测试"  # 单任务模式（跑完即退）
 *   pnpm demo20 --cwd /path/to/project  # 指定工作目录
 */

// ------------------------------ 参数与目录 --------------------------------

const demoDir = path.dirname(fileURLToPath(import.meta.url));

function parseArgs(): { cwd: string; oneShotTask: string | null } {
  const argv = process.argv.slice(2);
  let cwd = process.env.CODE_AGENT_CWD?.trim() || path.join(demoDir, 'workspace');
  const positional: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--cwd' && argv[i + 1]) {
      cwd = path.resolve(argv[i + 1]);
      i++;
    } else {
      positional.push(argv[i]);
    }
  }
  return { cwd, oneShotTask: positional.length > 0 ? positional.join(' ') : null };
}

const { cwd: rootDir, oneShotTask } = parseArgs();
mkdirSync(rootDir, { recursive: true });

// 准备 skills 目录（backend 视角下的 /skills/），放一个示例技能
const skillsDir = path.join(rootDir, 'skills');
mkdirSync(path.join(skillsDir, 'commit-message'), { recursive: true });
writeFileSync(
  path.join(skillsDir, 'commit-message', 'SKILL.md'),
  [
    '---',
    'name: "commit-message"',
    'description: "生成规范的 git commit message。当用户要求提交代码、写 commit 信息时使用。"',
    '---',
    '',
    '# Commit Message 规范',
    '',
    '格式：`<type>(<scope>): <subject>`',
    '',
    '- type：feat（新功能）/ fix（修复）/ docs（文档）/ style（格式）/ refactor（重构）/ test（测试）/ chore（杂务）',
    '- subject：简明扼要，不超过 50 字，末尾不加句号',
    '- body（可选）：说明「做了什么」和「为什么」，每行不超过 72 字',
  ].join('\n'),
);

// ------------------------------ Agent 构建 --------------------------------

const { backend, mode: backendMode } = await createBackend(rootDir);

const checkpointer = new MemorySaver();

const agent = createDeepAgent({
  model,
  checkpointer,
  // 真实磁盘 + 本机 shell（或云沙箱）
  backend: backend as never,
  // 技能目录：backend 视角 /skills/ → 磁盘 rootDir/skills/
  skills: ['/skills/'],
  systemPrompt: [
    `你是一个运行在终端里的编码助手（coding agent），工作目录是：${rootDir}`,
    '规则：',
    '1. 所有文件路径使用绝对路径；动手前先用 ls / glob / grep 了解项目结构；',
    '2. 需要跑命令（安装依赖、测试、构建、类型检查、git 等）时使用 execute 工具，命令在工作目录下执行；',
    '3. 多步任务第一步必须调用 write_todos 拆成 3-6 个步骤；开始某步骤前标 in_progress，完成后立刻标 completed，不要攒着批量标记；',
    '4. 改完代码必须验证：运行测试 / 构建 / 类型检查，不要只改不验；失败就修，直到通过；',
    '5. write_file / edit_file / delete / execute 调用前会弹出人工审批，这是正常流程，批准后继续；',
    '6. 纯调研、检索类子任务可以用 task 工具委托子代理；但代码修改和命令执行你亲自完成；',
    '7. 全部完成后用简短中文总结：改了什么、验证结果如何。',
  ].join('\n'),
  middleware: [
    // 任务规划：write_todos 工具 + todos 状态
    todoListMiddleware(),
    // 人工审批：写 / 改 / 删文件、执行 shell 命令前中断
    humanInTheLoopMiddleware({
      interruptOn: {
        write_file: { allowedDecisions: ['approve', 'reject'] },
        edit_file: { allowedDecisions: ['approve', 'reject'] },
        delete: { allowedDecisions: ['approve', 'reject'] },
        execute: { allowedDecisions: ['approve', 'reject'] },
      },
    }),
  ],
});

const config = {
  configurable: { thread_id: `demo20-${Date.now()}` },
  recursionLimit: 80,
  // deepagents 的 stream 默认产出自定义事件；values 模式才能拿到完整状态
  streamMode: 'values' as const,
};

tuiSetHeader(
  `DeepAgents Coding Agent · 模式: ${backendMode === 'sandbox' ? '☁️ 云沙箱' : '💻 本机'} · 工作目录: ${rootDir}`,
);

// ----------------------------- 流事件 → TUI -------------------------------

const seenMsgIds = new Set<string>();
let lastAnswer = '';
let autoApproveAll = false; // 「本次会话全部批准」开关
let activeRli: ReturnType<typeof readline.createInterface> | null = null; // REPL readline

function textOf(content: unknown): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((b) => (typeof b === 'object' && b !== null && 'text' in b ? String((b as { text: unknown }).text) : ''))
      .join('');
  }
  return '';
}

function summarizeArgs(name: string, args: Record<string, unknown>): string {
  if (name === 'execute') {
    return `${A.dim}$ ${String(args.command ?? '?')}${A.reset}`;
  }
  if (name === 'write_file' || name === 'edit_file') {
    const filePath = String(args.file_path ?? args.path ?? '?');
    const length = String(args.content ?? '').length;
    return `${A.dim}${filePath}（${length} 字符）${A.reset}`;
  }
  if (name === 'delete') {
    return `${A.dim}${String(args.file_path ?? args.path ?? JSON.stringify(args))}${A.reset}`;
  }
  const raw = JSON.stringify(args);
  return A.dim + (raw.length > 60 ? `${raw.slice(0, 60)}…` : raw) + A.reset;
}

/** 消费一个 values 状态快照；若图被 interrupt，返回审批请求。 */
function ingest(chunk: Record<string, unknown>): HITLRequest | null {
  if (Array.isArray(chunk.todos)) {
    tuiSetTodos(chunk.todos as Todo[]);
  }

  for (const msg of (chunk.messages ?? []) as unknown[]) {
    const id = (msg as { id?: string }).id ?? '';
    if (id && seenMsgIds.has(id)) continue;
    if (id) seenMsgIds.add(id);

    if (msg instanceof AIMessage) {
      // 模型已经开口（含工具调用），结束「思考中」状态
      tuiSetThinking(false);
      const text = textOf(msg.content).trim();
      if (text) lastAnswer = text;
      for (const tc of msg.tool_calls ?? []) {
        if (tc.name === 'write_todos') {
          tuiLog(`📝 模型更新了任务清单`);
        } else {
          tuiLog(
            `🔧 请求调用 ${A.bold}${tc.name}${A.reset}(${summarizeArgs(tc.name, (tc.args ?? {}) as Record<string, unknown>)})`,
          );
        }
      }
    } else if (msg instanceof ToolMessage && msg.name && msg.name !== 'write_todos') {
      const content = textOf(msg.content).replace(/\s+/g, ' ').trim();
      const short = content.length > 70 ? `${content.slice(0, 70)}…` : content;
      tuiLog(`${A.green}✔${A.reset} ${A.bold}${msg.name}${A.reset} ${A.dim}${short}${A.reset}`);
      // 工具执行完，模型即将进入下一轮思考
      tuiSetThinking(true);
    }
  }

  const interrupts = (chunk as { __interrupt__?: Array<Interrupt<HITLRequest>> }).__interrupt__;
  render();
  return interrupts?.[0]?.value ?? null;
}

// ------------------------------- 任务执行 ---------------------------------

async function runTask(userInput: string): Promise<void> {
  tuiResetTask();
  lastAnswer = '';
  tuiLog(`${A.dim}用户：${userInput.split('\n')[0].slice(0, 60)}${A.reset}`);
  tuiSetThinking(true);

  let input: unknown = { messages: [new HumanMessage(userInput)] };

  // interrupt → 审批 → resume，可能循环多轮
  for (;;) {
    let interruptReq: HITLRequest | null = null;

    const stream = await agent.stream(input as never, config);
    for await (const chunk of stream) {
      const req = ingest(chunk as Record<string, unknown>);
      if (req) interruptReq = req;
    }

    // 兜底：从 checkpoint 状态取中断
    if (!interruptReq) {
      const state = (await agent.getState(config)) as {
        tasks?: Array<{ interrupts?: Array<{ value: unknown }> }>;
      };
      const paused = state.tasks?.find((t) => (t.interrupts?.length ?? 0) > 0);
      if (paused?.interrupts?.[0]) {
        interruptReq = paused.interrupts[0].value as HITLRequest;
      }
    }

    if (!interruptReq) break;

    let decision: ApprovalDecision;
    if (autoApproveAll) {
      decision = 'approve';
      tuiLog(`${A.dim}（会话全部批准模式）自动放行${A.reset}`);
    } else {
      decision = await askApproval(
        interruptReq.actionRequests.map((r) => ({
          name: r.name,
          summary: summarizeArgs(r.name, r.args ?? {}),
        })),
        // raw mode 的按键（y/n/方向键）可能进了 readline 缓冲，清空避免污染下一轮输入
        () => {
          if (activeRli) {
            const rw = activeRli as unknown as { line: string; cursor: number };
            rw.line = '';
            rw.cursor = 0;
          }
        },
      );
    }

    if (decision === 'approve-all') {
      autoApproveAll = true;
      decision = 'approve';
      tuiLog(`${A.yellow}⚡ 已开启「本次会话全部批准」，后续工具调用不再逐个询问${A.reset}`);
    } else {
      tuiLog(
        decision === 'approve'
          ? `${A.green}✅ 已批准${A.reset} ${interruptReq.actionRequests.map((r) => r.name).join('、')}`
          : `${A.red}⛔ 已拒绝${A.reset} ${interruptReq.actionRequests.map((r) => r.name).join('、')}`,
      );
    }

    const resume: HITLResponse = {
      decisions: interruptReq.actionRequests.map(() =>
        decision === 'approve'
          ? { type: 'approve' }
          : {
              type: 'reject',
              message: '用户在 CLI 审批中拒绝了该操作。请放弃此步骤，或换一种不需要该操作的方式完成任务。',
            },
      ),
    };
    input = new Command({ resume });
    // resume 后工具继续执行 / 模型继续思考，显示等待态
    tuiSetThinking(true);
  }

  tuiFinish(lastAnswer || '（无回复）');
  tuiShowCursor();
  console.log('');
}

// --------------------------------- REPL -----------------------------------

async function main(): Promise<void> {
  if (oneShotTask) {
    // 单任务模式：命令行参数即任务，跑完退出
    await runTask(oneShotTask);
    return;
  }

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  activeRli = rl;

  console.log(A.bold);
  console.log('🧑‍💻 DeepAgents Coding Agent');
  console.log(`   模式：${backendMode === 'sandbox' ? '☁️ LangSmith 云沙箱' : '💻 本机（真实磁盘 + shell）'}`);
  console.log(`   工作目录：${rootDir}`);
  console.log('   输入任务描述开始；/exit 或 Ctrl+D 退出。');
  console.log(A.reset);

  for (;;) {
    const promptText = `${A.cyan}❯${A.reset} `;
    const questionPromise = rl.question(promptText).catch(() => null);
    // question 收到 Enter 后会重绘一次提示符；立刻把 prompt 置空，
    // 让那次重绘输出空串，避免 TUI 中残留一行 `❯`
    rl.setPrompt('');
    const answer = await questionPromise;
    if (answer === null) break;
    const task = answer.trim();
    if (!task) continue;
    if (task === '/exit' || task === '/quit') break;

    rl.pause(); // 暂停行编辑，把 stdin 交给审批 raw mode
    try {
      await runTask(task);
    } catch (error) {
      tuiShowCursor();
      const message = error instanceof Error ? error.message : String(error);
      console.error(`${A.red}任务执行出错：${message}${A.reset}`);
    }
    rl.resume();
    // 实测 Node v26 两个坑（readline 不再自行管理 tty 状态）：
    // 1) pause() 不会停止输入累积——任务执行期间的误触按键、审批 raw mode 的
    //    y/n/方向键都会被 readline 静默收进行缓冲，预填进下一条输入，必须清空；
    // 2) pause/resume/question 都不会恢复 raw mode——审批 cleanup 关掉后 tty 回到
    //    熟模式，方向键被直接回显成 ^[[D/^[[C 且无法移动光标，必须显式开回。
    const rw = rl as unknown as { line: string; cursor: number };
    rw.line = '';
    rw.cursor = 0;
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
    }
  }

  rl.close();
  tuiShowCursor();
}

process.on('SIGINT', () => {
  tuiShowCursor();
  process.exit(0);
});

main().catch((error: unknown) => {
  tuiShowCursor();
  const message = error instanceof Error ? error.message : String(error);
  console.error(`\n${A.red}启动失败：${message}${A.reset}`);
  process.exitCode = 1;
});
