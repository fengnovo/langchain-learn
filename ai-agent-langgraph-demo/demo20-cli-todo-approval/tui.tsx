/**
 * TUI 层（Ink 重写版）：声明式 React 渲染，React reconciler 自动 diff，
 * 从根本上解决 ANSI 手写渲染导致的刷屏问题（Trae CN 内嵌终端不支持
 * DECSC/DECRC 光标保存/恢复码，手写原地刷新会退化为追加输出）。
 *
 * - 外部 store（tuiStore）+ useSyncExternalStore：cli.ts 可直接 push 状态
 * - Ink 接管 stdout/stdin，组件树变更自动 diff，只输出变化部分
 * - 任务清单：pending 灰色 ○ / in_progress 青色 ► / completed 绿色 ✓ + 删除线
 * - 审批菜单 / 会话选择器 / REPL 行输入：useInput 自实现（不依赖外部 ink-* 包）
 * - 任意时刻只有一个输入组件挂载（按 inputMode 条件渲染），避免 useInput 冲突
 */

import React, { useCallback, useRef, useSyncExternalStore } from 'react';
import { render as inkRender, Box, Text, useInput } from 'ink';

import { editReplBuffer, splitReplCursor } from './repl-input.js';

// 非 TTY 环境（如管道、CI）不激活 useInput，避免 Raw mode 报错
const IS_TTY = process.stdin.isTTY ?? false;

// ------------------------------ 颜色常量 ----------------------------------

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
} as const;

// ------------------------------ 类型定义 ----------------------------------

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

export interface SessionPickerItem {
  title: string;
  subtitle: string;
}

// ------------------------------ TUI Store ---------------------------------

type InputMode = 'repl' | 'approval' | 'session' | 'none';

interface Banner {
  mode: string;
  cwd: string;
  skills: string;
  mcp: string;
  memory: string;
}

interface TuiState {
  header: string;
  todos: Todo[];
  logs: string[];
  approval: { requests: ApprovalRequest[]; selected: number } | null;
  finalAnswer: string | null;
  thinking: boolean;
  inputMode: InputMode;
  sessionItems: SessionPickerItem[];
  sessionSelected: number;
  banner: Banner | null;
  replInput: string;
  replCursor: number;
  replPrompt: string;
  startLine: string | null;
  recap: { human: string; ai: string } | null;
}

const initialState: TuiState = {
  header: '',
  todos: [],
  logs: [],
  approval: null,
  finalAnswer: null,
  thinking: false,
  inputMode: 'none',
  sessionItems: [],
  sessionSelected: 0,
  banner: null,
  replInput: '',
  replCursor: 0,
  replPrompt: '❯ ',
  startLine: null,
  recap: null,
};

class TuiStore {
  private state: TuiState = initialState;
  private listeners = new Set<() => void>();

  getState = (): TuiState => this.state;

  setState = (partial: Partial<TuiState>): void => {
    this.state = { ...this.state, ...partial };
    for (const l of this.listeners) l();
  };

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };
}

export const tuiStore = new TuiStore();

// ------------------------------ 命令式 API（供 cli.ts 调用）------------------

export function tuiSetHeader(header: string): void {
  tuiStore.setState({ header });
}

export function tuiSetTodos(todos: Todo[]): void {
  tuiStore.setState({ todos });
}

export function tuiLog(line: string): void {
  const logs = [...tuiStore.getState().logs, line];
  if (logs.length > 50) logs.splice(0, logs.length - 50);
  tuiStore.setState({ logs });
}

export function tuiFinish(answer: string): void {
  tuiStore.setState({ thinking: false, finalAnswer: answer });
}

export function tuiSetThinking(on: boolean): void {
  tuiStore.setState({ thinking: on });
}

export function tuiResetTask(): void {
  tuiStore.setState({ todos: [], finalAnswer: null, thinking: false, logs: [] });
}

export function tuiShowBanner(banner: Banner | null): void {
  tuiStore.setState({ banner });
}

export function tuiShowStartLine(line: string | null): void {
  tuiStore.setState({ startLine: line });
}

export function tuiShowRecap(recap: { human: string; ai: string } | null): void {
  tuiStore.setState({ recap });
}

/** 进入 REPL 模式（Ink 行输入接管）。 */
export function tuiEnterRepl(): void {
  tuiStore.setState({
    inputMode: 'repl',
    replInput: '',
    replCursor: 0,
    thinking: false,
  });
}

/** 进入任务执行模式（禁用 REPL 输入，显示思考态）。 */
export function tuiEnterTask(): void {
  tuiStore.setState({ inputMode: 'none' });
}

const SEP = '─'.repeat(72);

// ------------------------------ 自实现会话选择器 --------------------------

interface SessionPickerProps {
  items: SessionPickerItem[];
  onPick: (index: number) => void;
}

function SessionPicker({ items, onPick }: SessionPickerProps): JSX.Element {
  const state = useSyncExternalStore(tuiStore.subscribe, tuiStore.getState);
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;

  const handler = useCallback((input: string, key: {
    ctrl: boolean; upArrow: boolean; downArrow: boolean; return: boolean;
  }) => {
    if (key.ctrl && input === 'c') {
      process.exit(0);
      return;
    }
    const cur = tuiStore.getState().sessionSelected;
    if (key.upArrow) {
      tuiStore.setState({ sessionSelected: (cur + items.length - 1) % items.length });
    } else if (key.downArrow) {
      tuiStore.setState({ sessionSelected: (cur + 1) % items.length });
    } else if (key.return) {
      onPickRef.current(cur);
    }
  }, [items.length]);

  useInput(handler, { isActive: IS_TTY });

  return (
    <Box flexDirection="column">
      <Text bold>📚 选择会话</Text>
      <Text color="gray">{SEP}</Text>
      {items.map((item, i) => (
        <Box key={i}>
          <Text color={i === state.sessionSelected ? 'cyan' : 'gray'}>
            {i === state.sessionSelected ? '❯ ' : '  '}
          </Text>
          <Text bold={i === state.sessionSelected}>{item.title}</Text>
          {item.subtitle ? <Text dimColor>  {item.subtitle}</Text> : <Text>{' '}</Text>}
        </Box>
      ))}
      <Text>{' '}</Text>
      <Text dimColor>↑/↓ 选择 · Enter 确认（默认开始新会话）· Ctrl+C 退出</Text>
    </Box>
  );
}

// ------------------------------ 自实现审批菜单 ----------------------------

interface ApprovalMenuProps {
  requests: ApprovalRequest[];
  selected: number;
  onDecide: (decision: ApprovalDecision) => void;
}

function ApprovalMenu({ requests, selected, onDecide }: ApprovalMenuProps): JSX.Element {
  const onDecideRef = useRef(onDecide);
  onDecideRef.current = onDecide;

  const handler = useCallback((input: string, key: {
    ctrl: boolean; upArrow: boolean; downArrow: boolean; return: boolean;
  }) => {
    if (key.ctrl && input === 'c') {
      process.exit(0);
      return;
    }
    if (input === 'y' || input === 'Y') onDecideRef.current('approve');
    else if (input === 'n' || input === 'N') onDecideRef.current('reject');
    else if (input === 'a' || input === 'A') onDecideRef.current('approve-all');
    else if (key.upArrow) {
      const cur = tuiStore.getState().approval?.selected ?? 0;
      tuiStore.setState({ approval: { requests, selected: (cur + 2) % 3 } });
    } else if (key.downArrow) {
      const cur = tuiStore.getState().approval?.selected ?? 0;
      tuiStore.setState({ approval: { requests, selected: (cur + 1) % 3 } });
    } else if (key.return) {
      const cur = tuiStore.getState().approval?.selected ?? 0;
      const decisions: ApprovalDecision[] = ['approve', 'reject', 'approve-all'];
      onDecideRef.current(decisions[cur]);
    }
  }, [requests]);

  useInput(handler, { isActive: IS_TTY });

  const options = [
    { label: '✅ 批准        (y / Enter)', color: 'green' as const },
    { label: '⛔ 拒绝        (n)', color: 'red' as const },
    { label: '⚡ 本次会话全部批准  (a)', color: 'yellow' as const },
  ];

  return (
    <Box flexDirection="column">
      <Text bold color="yellow">
        ⚠️ 工具调用需要人工审批
      </Text>
      {requests.map((r, i) => (
        <Box key={i}>
          <Text color="magenta">→</Text>
          <Text>{' '}</Text>
          <Text bold>{r.name}</Text>
          <Text>  {r.summary}</Text>
        </Box>
      ))}
      <Text>{' '}</Text>
      {options.map((opt, i) => (
        <Box key={i}>
          <Text color={i === selected ? 'cyan' : 'gray'}>{i === selected ? '❯ ' : '  '}</Text>
          <Text color={opt.color} inverse={i === selected}>
            {' '}
            {opt.label}{' '}
          </Text>
        </Box>
      ))}
      <Text>{' '}</Text>
      <Text dimColor>↑/↓ 选择 · Enter 确认 · y 批准 · n 拒绝 · a 全部批准 · Ctrl+C 退出</Text>
    </Box>
  );
}

// ------------------------------ 自实现 REPL 行输入 ------------------------

interface ReplInputProps {
  onSubmit: (text: string) => void;
}

function ReplInput({ onSubmit }: ReplInputProps): JSX.Element {
  const state = useSyncExternalStore(tuiStore.subscribe, tuiStore.getState);
  // 用 ref 存 onSubmit，handler 引用稳定（useCallback 空依赖）
  const onSubmitRef = useRef(onSubmit);
  onSubmitRef.current = onSubmit;

  const handler = useCallback((input: string, key: {
    ctrl: boolean; meta: boolean; return: boolean;
    backspace: boolean; delete: boolean;
    leftArrow: boolean; rightArrow: boolean; upArrow: boolean; downArrow: boolean;
  }) => {
    if (key.ctrl && input === 'c') {
      process.exit(0);
      return;
    }
    // 从 store 直读最新值，避免 stale closure
    const current = tuiStore.getState();
    const cur = current.replInput;

    if (key.return) {
      tuiStore.setState({ replInput: '', replCursor: 0 });
      if (cur.trim()) onSubmitRef.current(cur);
      return;
    }
    const next = editReplBuffer(
      { value: cur, cursor: current.replCursor },
      input,
      key,
    );
    if (next.value !== cur || next.cursor !== current.replCursor) {
      tuiStore.setState({ replInput: next.value, replCursor: next.cursor });
    }
  }, []);

  useInput(handler, { isActive: IS_TTY });

  const view = splitReplCursor({ value: state.replInput, cursor: state.replCursor });
  return (
    <Box>
      <Text color="cyan">{state.replPrompt}</Text>
      <Text>{view.before}</Text>
      <Text inverse color="white">
        {view.cursorText}
      </Text>
      <Text>{view.after}</Text>
    </Box>
  );
}

// ------------------------------ 任务执行空闲态（只处理 Ctrl+C）-----------

function IdleInput(): JSX.Element {
  const handler = useCallback((input: string, key: { ctrl: boolean }) => {
    if (key.ctrl && input === 'c') process.exit(0);
  }, []);
  useInput(handler, { isActive: IS_TTY });
  return <Text>{' '}</Text>;
}

// ------------------------------ 任务清单组件 ------------------------------

function TodoList({ todos }: { todos: Todo[] }): JSX.Element {
  return (
    <Box flexDirection="column">
      <Text bold>📋 任务清单</Text>
      {todos.length === 0 ? (
        <Text dimColor>  （简单对话无需清单；复杂任务会自动拆解并显示在这里）</Text>
      ) : (
        todos.map((t, i) => {
          if (t.status === 'completed') {
            return (
              <Box key={i}>
                <Text color="green">✓</Text>
                <Text>{' '}</Text>
                <Text dimColor strikethrough>
                  {t.content}
                </Text>
              </Box>
            );
          }
          if (t.status === 'in_progress') {
            return (
              <Box key={i}>
                <Text color="yellow">►</Text>
                <Text>{' '}</Text>
                <Text color="cyan">{t.content}</Text>
              </Box>
            );
          }
          return (
            <Box key={i}>
              <Text dimColor>○</Text>
              <Text> {t.content}</Text>
            </Box>
          );
        })
      )}
    </Box>
  );
}

// ------------------------------ 执行日志组件 ------------------------------

function LogList({ logs }: { logs: string[] }): JSX.Element {
  const tail = logs.slice(-10);
  return (
    <Box flexDirection="column">
      <Text bold>📜 执行日志</Text>
      {tail.length === 0 ? (
        <Text dimColor>  （暂无）</Text>
      ) : (
        tail.map((l, i) => (
          <Box key={i}>
            <Text>  {l}</Text>
          </Box>
        ))
      )}
    </Box>
  );
}

// ------------------------------ 主 App 组件 --------------------------------

function App(): JSX.Element {
  const state = useSyncExternalStore(tuiStore.subscribe, tuiStore.getState);

  const handleApprovalDecision = (decision: ApprovalDecision): void => {
    tuiStore.setState({ approval: null });
    if (pendingApprovalResolver) {
      const r = pendingApprovalResolver;
      pendingApprovalResolver = null;
      r(decision);
    }
  };

  const handleSessionPick = (index: number): void => {
    tuiStore.setState({ inputMode: 'none', sessionItems: [], sessionSelected: 0 });
    if (pendingSessionResolver) {
      const r = pendingSessionResolver;
      pendingSessionResolver = null;
      r(index);
    }
  };

  const handleReplSubmit = (text: string): void => {
    if (pendingReplResolver) {
      const r = pendingReplResolver;
      pendingReplResolver = null;
      r(text);
    }
  };

  // ----- 会话选择器模式（独占屏幕）-----
  if (state.inputMode === 'session') {
    return <SessionPicker items={state.sessionItems} onPick={handleSessionPick} />;
  }

  // ----- 主界面 -----
  return (
    <Box flexDirection="column">
      {/* 启动横幅 */}
      {state.banner && (
        <Box flexDirection="column">
          <Text bold>🧑‍💻 DeepAgents Coding Agent</Text>
          <Text>   模式：{state.banner.mode}</Text>
          <Text>   工作目录：{state.banner.cwd}</Text>
          <Text>   Skills：{state.banner.skills}</Text>
          <Text>   MCP：{state.banner.mcp}</Text>
          <Text>   记忆：{state.banner.memory}</Text>
          <Text>{' '}</Text>
        </Box>
      )}

      {/* 启动行 */}
      {state.startLine && (
        <Box>
          <Text dimColor>{state.startLine}</Text>
        </Box>
      )}

      {/* 上次对话回顾 */}
      {state.recap && (
        <Box flexDirection="column">
          <Text dimColor>💬 上次对话（直接输入即可继续）：</Text>
          <Text dimColor>  你：{state.recap.human}</Text>
          <Text dimColor>  助手：{state.recap.ai}</Text>
          <Text>{' '}</Text>
        </Box>
      )}

      {/* Header */}
      <Text bold>🧑‍💻 {state.header}</Text>
      <Text color="gray">{SEP}</Text>

      {/* 任务清单 */}
      <TodoList todos={state.todos} />
      <Text color="gray">{SEP}</Text>

      {/* 执行日志 */}
      <LogList logs={state.logs} />
      <Text color="gray">{SEP}</Text>

      {/* 底部：审批菜单 / 思考态 / 最终回复 + REPL 输入 */}
      {state.approval ? (
        <ApprovalMenu
          requests={state.approval.requests}
          selected={state.approval.selected}
          onDecide={handleApprovalDecision}
        />
      ) : state.thinking ? (
        <Text color="yellow">🤔 模型思考中…</Text>
      ) : (
        <Box flexDirection="column">
          {state.finalAnswer && (
            <Box flexDirection="column">
              <Text bold color="green">
                ✅ 任务完成，最终回复：
              </Text>
              <Text>{state.finalAnswer}</Text>
              {state.inputMode === 'repl' && <Text>{' '}</Text>}
            </Box>
          )}
          {state.inputMode === 'repl' ? (
            <ReplInput onSubmit={handleReplSubmit} />
          ) : (
            <IdleInput />
          )}
        </Box>
      )}
    </Box>
  );
}

// ------------------------------ cli.ts ↔ TUI 桥接 --------------------------

let pendingApprovalResolver: ((d: ApprovalDecision) => void) | null = null;
let pendingSessionResolver: ((i: number) => void) | null = null;
let pendingReplResolver: ((t: string) => void) | null = null;

/** cli.ts 调用：弹出审批菜单，等用户决定后 resolve。 */
export function askApproval(requests: ApprovalRequest[]): Promise<ApprovalDecision> {
  return new Promise((resolve) => {
    pendingApprovalResolver = resolve;
    tuiStore.setState({
      inputMode: 'approval',
      approval: { requests, selected: 0 },
    });
  });
}

/** cli.ts 调用：弹出会话选择器，等用户选择后 resolve。 */
export function pickSession(items: SessionPickerItem[]): Promise<number> {
  return new Promise((resolve) => {
    pendingSessionResolver = resolve;
    tuiStore.setState({
      inputMode: 'session',
      sessionItems: items,
      sessionSelected: 0,
    });
  });
}

/** cli.ts 调用：进入 REPL 模式，等用户输入一行后 resolve。 */
export function askReplInput(): Promise<string> {
  return new Promise((resolve) => {
    pendingReplResolver = resolve;
    tuiStore.setState({ inputMode: 'repl', replInput: '', replCursor: 0, thinking: false });
  });
}

// ------------------------------ 启动 TUI ----------------------------------

let inkInstance: ReturnType<typeof inkRender> | null = null;

/** 启动 Ink 渲染（cli.ts 启动时调用一次）。 */
export function startTui(): void {
  if (inkInstance) return;
  inkInstance = inkRender(<App />);
}

/** 清理 TUI（进程退出前）。 */
export function stopTui(): void {
  if (inkInstance) {
    inkInstance.unmount();
    inkInstance = null;
  }
}
