/**
 * TUI 层：终端整屏渲染 + 审批键盘交互。
 *
 * - 任务清单：pending 灰色 ○ / in_progress 青色 ► / completed 绿色 ✓ + 删除线
 * - 审批菜单：↑/↓ 移动、Enter 确认、y 批准、n 拒绝、a 本轮会话全部批准
 */

export const A = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  strike: '\x1b[9m',
  inverse: '\x1b[7m',
  hideCursor: '\x1b[?25l',
  showCursor: '\x1b[?25h',
  clearScreen: '\x1b[2J\x1b[H',
} as const;

export type TodoStatus = 'pending' | 'in_progress' | 'completed';

export interface Todo {
  content: string;
  status: TodoStatus;
}

export interface ApprovalRequest {
  name: string;
  summary: string;
}

export type ApprovalDecision = 'approve' | 'reject' | 'approve-all';

interface UiState {
  header: string;
  todos: Todo[];
  logs: string[];
  approval: { requests: ApprovalRequest[]; selected: number } | null;
  finalAnswer: string | null;
  thinking: boolean;
}

const state: UiState = {
  header: '',
  todos: [],
  logs: [],
  approval: null,
  finalAnswer: null,
  thinking: false,
};

/**
 * 渲染去重：values 流在每个中间件节点都会吐快照（可见内容往往没变），
 * 只有签名变化时才真正清屏重绘，避免「你好」这种任务刷屏。
 */
let lastSignature = '';

const SEP = '─'.repeat(72);

export function tuiSetHeader(header: string): void {
  state.header = header;
}

export function tuiSetTodos(todos: Todo[]): void {
  state.todos = todos;
}

export function tuiLog(line: string): void {
  state.logs.push(line);
  render();
}

export function tuiFinish(answer: string): void {
  state.thinking = false;
  state.finalAnswer = answer;
  render();
}

export function tuiSetThinking(on: boolean): void {
  state.thinking = on;
  render();
}

export function tuiResetTask(): void {
  state.todos = [];
  state.finalAnswer = null;
  state.thinking = false;
  lastSignature = ''; // 新任务强制下一帧渲染
}

export function render(): void {
  // 可见内容签名：todos、日志条数/末条、审批高亮、思考态、最终回复
  const signature = JSON.stringify({
    t: state.todos,
    logs: state.logs.length,
    lastLog: state.logs[state.logs.length - 1] ?? '',
    approval: state.approval ? state.approval.selected : null,
    thinking: state.thinking,
    answer: state.finalAnswer,
  });
  if (signature === lastSignature) return;
  lastSignature = signature;

  const lines: string[] = [];

  lines.push(`${A.bold}🧑‍💻 ${state.header}${A.reset}`);
  lines.push(SEP);

  // 任务清单
  lines.push(`${A.bold}📋 任务清单${A.reset}`);
  if (state.todos.length === 0) {
    lines.push(`  ${A.dim}（简单对话无需清单；复杂任务会自动拆解并显示在这里）${A.reset}`);
  } else {
    for (const t of state.todos) {
      if (t.status === 'completed') {
        lines.push(`  ${A.green}✓${A.reset} ${A.dim}${A.strike}${t.content}${A.reset}`);
      } else if (t.status === 'in_progress') {
        lines.push(`  ${A.yellow}►${A.reset} ${A.cyan}${t.content}${A.reset}`);
      } else {
        lines.push(`  ${A.dim}○${A.reset} ${t.content}`);
      }
    }
  }
  lines.push(SEP);

  // 执行日志（保留最近 10 条）
  lines.push(`${A.bold}📜 执行日志${A.reset}`);
  const tail = state.logs.slice(-10);
  if (tail.length === 0) {
    lines.push(`  ${A.dim}（暂无）${A.reset}`);
  } else {
    lines.push(...tail.map((l) => `  ${l}`));
  }
  lines.push(SEP);

  // 审批菜单 / 最终回复
  const ap = state.approval;
  if (ap) {
    lines.push(`${A.bold}${A.yellow}⚠️  工具调用需要人工审批${A.reset}`);
    for (const r of ap.requests) {
      lines.push(`  ${A.magenta}→${A.reset} ${A.bold}${r.name}${A.reset}  ${r.summary}`);
    }
    lines.push('');
    const options = [
      `${A.green}✅ 批准${A.reset}        ${A.dim}(y / Enter)${A.reset}`,
      `${A.red}⛔ 拒绝${A.reset}        ${A.dim}(n)${A.reset}`,
      `${A.yellow}⚡ 本次会话全部批准${A.reset}  ${A.dim}(a)${A.reset}`,
    ];
    options.forEach((opt, i) => {
      const marker = ap.selected === i ? `${A.inverse} ❯ ${A.reset} ` : '   ';
      const highlight = ap.selected === i ? A.inverse : '';
      lines.push(`${marker}${highlight} ${opt} ${A.reset}`);
    });
    lines.push('');
    lines.push(`${A.dim}↑/↓ 选择 · Enter 确认 · y 批准 · n 拒绝 · a 全部批准 · Ctrl+C 退出${A.reset}`);
  } else if (state.finalAnswer) {
    lines.push(`${A.bold}${A.green}✅ 任务完成，最终回复：${A.reset}`);
    lines.push(state.finalAnswer);
  } else if (state.thinking) {
    lines.push(`${A.yellow}🤔 模型思考中…${A.reset}`);
  }

  process.stdout.write(A.hideCursor + A.clearScreen + lines.join('\n') + '\n');
}

function setRawMode(on: boolean): void {
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(on);
  }
}

/** 恢复光标（退出 / 切回行输入前调用）。 */
export function tuiShowCursor(): void {
  setRawMode(false);
  process.stdout.write(A.showCursor);
}

/**
 * 审批菜单：↑/↓ 移动高亮，Enter 确认，y 批准，n 拒绝，a 全部批准。
 * 非 TTY 环境自动批准，避免流程挂死。
 * onDone：审批结束后的清理回调（用于清空 readline 缓冲，防止按键残留）。
 */
export function askApproval(
  requests: ApprovalRequest[],
  onDone?: () => void,
): Promise<ApprovalDecision> {
  return new Promise((resolve) => {
    if (!process.stdin.isTTY) {
      tuiLog(`${A.dim}（非 TTY 环境，无法交互，自动批准）${A.reset}`);
      resolve('approve');
      return;
    }

    state.approval = { requests, selected: 0 };
    render();
    setRawMode(true);
    process.stdin.resume();

    const cleanup = (): void => {
      process.stdin.removeListener('data', onData);
      setRawMode(false);
      onDone?.();
    };

    const onData = (data: Buffer): void => {
      const key = data.toString();
      let decided: ApprovalDecision | null = null;

      switch (key) {
        case '\u001b[A': // ↑
          state.approval!.selected = (state.approval!.selected + 2) % 3;
          break;
        case '\u001b[B': // ↓
          state.approval!.selected = (state.approval!.selected + 1) % 3;
          break;
        case '\r': // Enter
        case '\n':
          decided = (['approve', 'reject', 'approve-all'] as const)[state.approval!.selected];
          break;
        case 'y':
        case 'Y':
          decided = 'approve';
          break;
        case 'n':
        case 'N':
          decided = 'reject';
          break;
        case 'a':
        case 'A':
          decided = 'approve-all';
          break;
        case '\u0003': // Ctrl+C
          cleanup();
          tuiShowCursor();
          process.exit(1);
      }

      if (decided) {
        cleanup();
        state.approval = null;
        resolve(decided);
      } else {
        render();
      }
    };

    process.stdin.on('data', onData);
  });
}
