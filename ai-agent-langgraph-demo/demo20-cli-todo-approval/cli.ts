import { existsSync, mkdirSync, readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { AIMessage, HumanMessage, ToolMessage } from '@langchain/core/messages';
import { Command } from '@langchain/langgraph';
import { SqliteSaver } from '@langchain/langgraph-checkpoint-sqlite';
import { MultiServerMCPClient } from '@langchain/mcp-adapters';
import {
  humanInTheLoopMiddleware,
  modelCallLimitMiddleware,
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
  askReplInput,
  pickSession,
  startTui,
  stopTui,
  tuiEnterRepl,
  tuiEnterTask,
  tuiFinish,
  tuiLog,
  tuiResetTask,
  tuiSetHeader,
  tuiSetThinking,
  tuiSetTodos,
  tuiShowBanner,
  tuiShowRecap,
  tuiShowStartLine,
  type ApprovalDecision,
  type Todo,
} from './tui.js';
import { SessionStore, formatRelative, titleOf } from './sessions.js';

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

// 可扩展资源目录：与 workspace 同级（都在 demo20-cli-todo-approval/ 下），
// agent 只读取、不生成；没有就不加载：
//   skills/<技能名>/SKILL.md  Agent Skills（目录存在才挂载）
//   mcp/mcp.json              MCP 服务器配置（文件存在才连接，工具并入 agent）
//   AGENTS.md                 长期记忆（启动时注入 system prompt；不存在静默跳过）
//
// 路径说明：backend 的 root 是 workspace/，且 LocalShellBackend 为
// virtualMode:false（相对路径按 root 解析、允许 .. 跳出），所以宿主目录
// demoDir/skills 在 backend 视角就是 ../skills/。
const skillsHostDir = path.join(demoDir, 'skills');
const mcpConfigPath = path.join(demoDir, 'mcp', 'mcp.json');
const memoryHostFile = path.join(demoDir, 'AGENTS.md');

// 会话持久化：对话状态（消息/todos/中断点）落 sessions/checkpoints.db，
// 会话列表元数据落 sessions/index.json——进程退出后可恢复历史会话。
const sessionStore = new SessionStore(demoDir);

function countSkills(dir: string): number {
  if (!existsSync(dir)) return 0;
  return readdirSync(dir, { withFileTypes: true }).filter(
    (entry) => entry.isDirectory() && existsSync(path.join(dir, entry.name, 'SKILL.md')),
  ).length;
}

// ------------------------------ Agent 构建 --------------------------------

const { backend, mode: backendMode } = await createBackend(rootDir);

// Skills：宿主目录存在才传给 agent（backend 视角 ../skills/）
const skillCount = countSkills(skillsHostDir);
const skillSources = skillCount > 0 ? ['../skills/'] : [];

// Memory：长期记忆文件（AGENTS.md）。middleware 读取失败（文件不存在）会静默跳过，
// agent 之后可通过 write_file 自行创建，所以这里无条件挂载。
const memorySources = ['../AGENTS.md'];

// MCP：mcp/mcp.json 存在才连接。配置格式同 MultiServerMCPClient 的 ClientConfig：
//   { "servers": { "名字": { "transport": "stdio", "command": "...", "args": [...] } } }
const mcpTools: unknown[] = [];
let mcpStatus = '未配置（mcp/mcp.json 不存在）';
if (existsSync(mcpConfigPath)) {
  try {
    const mcpConfig = JSON.parse(readFileSync(mcpConfigPath, 'utf8')) as {
      servers?: Record<string, unknown>;
    };
    const mcpClient = new MultiServerMCPClient(mcpConfig as never);
    const tools = await mcpClient.getTools();
    mcpTools.push(...tools);
    mcpStatus = `已连接 ${Object.keys(mcpConfig.servers ?? {}).length} 个服务器、${tools.length} 个工具`;
  } catch (error) {
    mcpStatus = `加载失败：${error instanceof Error ? error.message : String(error)}`;
  }
}

// 持久化 checkpointer：对话状态写入 SQLite，进程重启后按 thread_id 恢复
const checkpointer = SqliteSaver.fromConnString(sessionStore.dbPath);

const agent = createDeepAgent({
  model,
  checkpointer,
  // 真实磁盘 + 本机 shell（或云沙箱）
  backend: backend as never,
  // MCP 服务器工具（mcp/mcp.json 存在时才有内容）
  tools: mcpTools as never,
  // Agent Skills：demo20-cli-todo-approval/skills/（backend 视角 ../skills/）
  skills: skillSources,
  // 长期记忆：demo20-cli-todo-approval/AGENTS.md（backend 视角 ../AGENTS.md）
  memory: memorySources,
  // 注：上下文摘要（summarization）由 createDeepAgent 默认栈内置
  // （createSummarizationMiddleware），trigger/keep 按模型 profile 自动计算，
  // 被压缩的历史写入 backend 的 /conversation_history/session_<id>.md
  // （磁盘 workspace/conversation_history/），无需也不应重复挂载。
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
    '8. 长期记忆：工作目录上级有 AGENTS.md（backend 路径 ../AGENTS.md），每次启动会注入你的上下文。' +
      '学到用户偏好、项目约定、反复踩的坑时，用 write_file 更新它（追加/修订对应条目）；临时信息不要写。',
  ].join('\n'),
  middleware: [
    // 任务规划：write_todos 工具 + todos 状态
    todoListMiddleware(),
    // 模型调用上限：run = 单次任务、thread = 整个会话；超限优雅结束而非死循环烧钱
    modelCallLimitMiddleware({ runLimit: 60, threadLimit: 300, exitBehavior: 'end' }),
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

// 当前会话线程 ID：启动时由会话选择器决定（新会话或恢复历史会话）
let activeThreadId = `demo20-${Date.now()}`;
const config = {
  configurable: { thread_id: activeThreadId },
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
      // 模型开口后不立刻关闭「思考中」：纯对话时紧接 tuiFinish 最终帧、
      // 工具调用时紧接工具日志/审批帧，中间插一个底部空白的帧只会造成刷屏。
      // thinking 统一由 ToolMessage（进入下一轮）和 tuiFinish（任务结束）管理。
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
  // Ink 声明式渲染：store 变更后 React 自动 diff，无需手动 render()
  return interrupts?.[0]?.value ?? null;
}

// ------------------------------- 任务执行 ---------------------------------

async function runTask(userInput: string): Promise<void> {
  tuiResetTask();
  tuiEnterTask();
  lastAnswer = '';
  // Ink 声明式渲染：store 变更后 React 自动 diff，无需手动 render()
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

  // 记录/更新会话索引（新会话用首条输入作标题），下次启动可在历史列表看到
  sessionStore.recordTask(activeThreadId, titleOf(userInput));
}

// --------------------------------- REPL -----------------------------------

/** 恢复历史会话后，从 checkpoint 取出上一轮「你问 / 助手答」做个简短回顾。
 *  同时预加载 seenMsgIds——进程重启后 seenMsgIds 是空的，而 stream 的第一个
 *  values chunk 包含全部历史消息；不预加载的话 ingest 会把每条历史消息当新消息
 *  重新 tuiLog + render，导致恢复会话时剧烈刷屏。
 */
async function printRecap(): Promise<void> {
  try {
    const snapshot = (await agent.getState(config)) as {
      values?: { messages?: unknown[] };
    };
    const messages = snapshot.values?.messages ?? [];
    // 预加载：把 checkpoint 里所有消息 ID 标记为已见，stream 产出时直接跳过
    for (const m of messages) {
      const id = (m as { id?: string }).id;
      if (id) seenMsgIds.add(id);
    }
    let lastHuman = '';
    let lastAi = '';
    for (const m of messages) {
      if (m instanceof HumanMessage) {
        const t = textOf(m.content).trim();
        if (t) lastHuman = t;
      } else if (m instanceof AIMessage) {
        const t = textOf(m.content).trim();
        if (t) lastAi = t;
      }
    }
    if (!lastHuman && !lastAi) return;
    // 通过 store 推送回顾信息，Ink 统一渲染（不再 console.log）
    tuiShowRecap({
      human: lastHuman.slice(0, 80),
      ai: lastAi.length > 200 ? `${lastAi.slice(0, 200)}…` : lastAi,
    });
  } catch {
    // 回顾失败不阻塞进入会话
  }
}

async function main(): Promise<void> {
  // 启动 Ink TUI（接管 stdout/stdin，声明式渲染 + React diff）
  startTui();

  if (oneShotTask) {
    // 单任务模式：命令行参数即任务，跑完退出（每次新会话，仍会记入历史）
    tuiShowBanner({
      mode: backendMode === 'sandbox' ? '☁️ LangSmith 云沙箱' : '💻 本机（真实磁盘 + shell）',
      cwd: rootDir,
      skills: skillCount > 0 ? `${skillCount} 个技能（${skillsHostDir}）` : `未配置（放 SKILL.md 到 ${skillsHostDir}/<技能名>/）`,
      mcp: mcpStatus,
      memory: `${memoryHostFile}${existsSync(memoryHostFile) ? '' : '（尚不存在，agent 可自行创建）'}`,
    });
    await runTask(oneShotTask);
    stopTui();
    return;
  }

  // 启动横幅（通过 store 推送，Ink 渲染——不再 console.log）
  tuiShowBanner({
    mode: backendMode === 'sandbox' ? '☁️ LangSmith 云沙箱' : '💻 本机（真实磁盘 + shell）',
    cwd: rootDir,
    skills: skillCount > 0 ? `${skillCount} 个技能（${skillsHostDir}）` : `未配置（放 SKILL.md 到 ${skillsHostDir}/<技能名>/）`,
    mcp: mcpStatus,
    memory: `${memoryHostFile}${existsSync(memoryHostFile) ? '' : '（尚不存在，agent 可自行创建）'}`,
  });

  // 会话选择：首项「开始新会话」默认高亮，直接回车即新会话；
  // ↑/↓ 选历史会话回车则恢复（对话状态从 SQLite 读回）。
  const sessions = sessionStore.list();
  const pickerItems = [
    { title: '🆕 开始新会话', subtitle: '' },
    ...sessions.map((s) => ({
      title: `💬 ${s.title}`,
      subtitle: `${s.tasks} 个任务 · ${formatRelative(s.updatedAt)}`,
    })),
  ];
  const picked = await pickSession(pickerItems);

  if (picked === 0) {
    activeThreadId = `demo20-${Date.now()}`;
    config.configurable.thread_id = activeThreadId;
    tuiShowStartLine('▶ 开始新会话');
  } else {
    const meta = sessions[picked - 1];
    activeThreadId = meta.threadId;
    config.configurable.thread_id = activeThreadId;
    tuiShowStartLine(
      `▶ 恢复会话：${meta.title}（${meta.tasks} 个任务，最后活跃 ${formatRelative(meta.updatedAt)}）`,
    );
    await printRecap();
  }

  // REPL 主循环：Ink 行输入接管（取代 node:readline，不再有 raw mode 冲突）
  for (;;) {
    tuiEnterRepl();
    const answer = await askReplInput();
    const task = answer.trim();
    if (!task) continue;
    if (task === '/exit' || task === '/quit') break;

    try {
      await runTask(task);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      tuiLog(`${A.red}任务执行出错：${message}${A.reset}`);
    }
  }

  stopTui();
}

process.on('SIGINT', () => {
  stopTui();
  process.exit(0);
});

main().catch((error: unknown) => {
  stopTui();
  const message = error instanceof Error ? error.message : String(error);
  console.error(`\n${A.red}启动失败：${message}${A.reset}`);
  process.exitCode = 1;
});
