import { tuiStore } from './store.js';
import type { Banner, Recap, Todo } from './types.js';

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
  tuiStore.setState({
    todos: [],
    finalAnswer: null,
    thinking: false,
    logs: [],
    approval: null,
    question: null,
  });
}

export function tuiShowBanner(banner: Banner | null): void {
  tuiStore.setState({ banner });
}

export function tuiShowStartLine(startLine: string | null): void {
  tuiStore.setState({ startLine });
}

export function tuiShowRecap(recap: Recap | null): void {
  tuiStore.setState({ recap });
}

export function tuiEnterRepl(): void {
  tuiStore.setState({
    inputMode: 'repl',
    replInput: '',
    replCursor: 0,
    thinking: false,
  });
}

export function tuiEnterTask(): void {
  tuiStore.setState({ inputMode: 'none' });
}
