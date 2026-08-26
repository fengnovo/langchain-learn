import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { AgentArtifact, HarnessResult } from "@demo/shared";
const execFileAsync = promisify(execFile);
/**
 * AI 输出质量门禁。
 * 这里检查的是“Agent 产物文本”。
 * 真正 AI Coding 系统可以把 files 写到 git worktree 后，
 * 再运行 eslint / tsc / test / playwright。
 */
export function validateArtifacts(
  artifacts: AgentArtifact[]
): HarnessResult {
  const all = artifacts.map((item) => item.content).join("\n");
  const checks = [
    {
      name: "dangerous-command",
      passed: !/rm\s+-rf|curl.+\|\s*sh|chmod\s+777/i.test(all),
      message: "不允许出现明显危险 shell 命令。"
    },
    {
      name: "secret-leak",
      passed: !/(api[_-]?key|secret)\s*[:=]\s*["'][^"']{8,}/i.test(all),
      message: "不允许在生成结果中硬编码疑似密钥。"
    },
    {
      name: "typescript-any",
      passed: !/\bany\b/.test(all),
      message: "示例团队规范禁止业务代码直接使用 any。"
    },
    {
      name: "role-coverage",
      passed: ["frontend", "backend", "qa"].every((role) =>
        artifacts.some((item) => item.role === role)
      ),
      message: "必须同时有 Frontend / Backend / QA 产物。"
    }
  ];
  return {
    passed: checks.every((item) => item.passed),
    checks
  };
}
/**
 * 安全执行命令的示范。
 * 绝对不要：
 *   exec(modelOutput)
 * 这里使用：
 *   command allowlist + execFile + args array
 * 不经过 shell 拼接。
 */
export async function runSafeCommand(
  command: "pnpm" | "git",
  args: string[]
): Promise<{ stdout: string; stderr: string }> {
  const allowlist = new Set(["pnpm", "git"]);
  if (!allowlist.has(command)) {
    throw new Error(`command not allowed: ${command}`);
  }
  const { stdout, stderr } = await execFileAsync(command, args, {
    timeout: 60_000,
    maxBuffer: 1024 * 1024
  });
  return { stdout, stderr };
}
