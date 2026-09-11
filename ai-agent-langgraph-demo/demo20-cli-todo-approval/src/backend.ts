/**
 * Backend 工厂：决定 agent 的文件操作与命令执行落在哪里。
 *
 * 通过环境变量 CODE_AGENT_BACKEND 切换：
 *   - 未设置 / 'local'（默认）：LocalShellBackend —— 文件真实落盘到 rootDir，
 *     shell 命令直接在宿主机执行（无沙箱隔离，所以危险操作前面有 HITL 审批）。
 *   - 'sandbox'：LangSmithSandbox —— LangSmith 云沙箱，需要账号开通 Sandbox 实验功能。
 *   - 'e2b'：E2BSandbox —— E2B 云沙箱，按量计费有免费额度，适合学习。
 *
 * E2B 与 LangSmithSandbox 都继承 BaseSandbox，对 Agent 代码完全透明。
 */

import { LangSmithSandbox, LocalShellBackend } from 'deepagents';
import { E2BSandbox } from './e2b-sandbox.js';

export type SandboxBackend = LocalShellBackend | LangSmithSandbox | E2BSandbox;

export interface BackendHandle {
  backend: SandboxBackend;
  mode: 'local' | 'sandbox' | 'e2b';
  /** 沙箱内的工作目录绝对路径。本地模式为 undefined（用 settings.cwd）。 */
  sandboxCwd?: string;
}

export async function createBackend(rootDir: string): Promise<BackendHandle> {
  const mode = process.env.CODE_AGENT_BACKEND?.trim().toLowerCase();

  if (mode === 'sandbox') {
    const apiKey = process.env.LANGSMITH_API_KEY?.trim();
    if (!apiKey) {
      throw new Error(
        'LangSmith 沙箱模式需要 LANGSMITH_API_KEY（在 .env 中配置，' +
          '可在 https://smith.langchain.com/settings 创建）。',
      );
    }
    try {
      const backend = await LangSmithSandbox.create({
        apiKey,
        defaultTimeout: 180,
      });
      return { backend, mode: 'sandbox' };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(
        `LangSmith 云沙箱创建失败：${message}\n` +
          '常见原因：① API Key 无效或过期；② 账号未开通 Sandbox 实验功能；\n' +
          '③ Key 关联多个 workspace 时需额外配置 LANGSMITH_WORKSPACE_ID。',
      );
    }
  }

  if (mode === 'e2b') {
    try {
      const backend = await E2BSandbox.create({
        sandboxTimeoutMs: 600_000, // 10 分钟
      });
      return { backend, mode: 'e2b', sandboxCwd: '/home/user' };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(
        `E2B 云沙箱创建失败：${message}\n` +
          '请检查 .env 中 E2B_API_KEY 是否配置（https://e2b.dev/dashboard 创建）。',
      );
    }
  }

  // 默认：本地 shell（真实磁盘 + 本机 shell）
  const backend = new LocalShellBackend({
    rootDir,
    virtualMode: false, // false = 文件真实写入磁盘
    timeout: 180, // 单条命令超时（秒）
    maxOutputBytes: 200_000, // 命令输出截断阈值
    inheritEnv: true, // 继承本机 PATH 等环境变量，保证 node/pnpm/git 可用
  });
  await backend.initialize(); // 确保 rootDir 存在
  return { backend, mode: 'local' };
}
