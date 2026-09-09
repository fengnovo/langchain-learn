import { spawnSync } from 'node:child_process';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { resolve, relative, basename } from 'node:path';
import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';

dotenv.config({ override: true });

const client = new Anthropic({
  // 使用 authToken：兼容端点期望 Authorization: Bearer <key>，
  // apiKey 只发送 X-Api-Key 头，腾讯云 TokenHub 无法识别。
  authToken: process.env.TX_ANTHROPIC_API_KEY,
  baseURL: process.env.TX_ANTHROPIC_BASE_URL,
});
const MODEL = process.env.TX_ANTHROPIC_MODEL as string;
const CWD = process.cwd();
const SYSTEM = `You are a coding agent at ${CWD}`;

// 定义模型可调用的 bash 工具及其参数结构。
const TOOLS: Anthropic.Tool[] = [
  {
    name: 'bash',
    description: 'Run a shell command.',
    input_schema: {
      type: 'object',
      properties: { command: { type: 'string' } },
      required: ['command'],
    },
  },
];

// 危险程度判定：blocked = 直接拒绝；confirm = 需用户确认；ok = 直接执行。
type Verdict = 'blocked' | 'confirm' | 'ok';

// 项目关键文件：即使不带 -r/-f，删除/移动它们也必须确认。
const PROTECTED_NAMES: RegExp[] = [
  /^\.env(\..*)?$/,
  /^package(-lock)?\.json$/,
  /^pnpm-lock\.yaml$/,
  /^yarn\.lock$/,
  /^tsconfig(\..*)?\.json$/,
  /^node_modules$/,
];

function unquote(s: string): string {
  return s.trim().replace(/^["']|["']$/g, '');
}

/**
 * 评估命令的危险程度。
 * - blocked：硬性黑名单（rm -rf /、删 cwd 或其父目录等），一律拒绝。
 * - confirm：破坏性操作（rm -r/-f、删除受保护文件、git reset --hard 等），
 *   必须经用户在终端输入 y 确认后才执行。
 */
export function assessDanger(command: string): Verdict {
  // 1) 硬性黑名单：无论路径如何都直接拦截。
  const hardBlock: RegExp[] = [
    /\brm\s+-[rRfFiIvV]*\s+\/\s*(?:$|[;&|])/, // rm -rf /
    /\brm\s+-[rRfFiIvV]*\s+~(?:\/|$|\s)/, // rm -rf ~
    /\brm\s+-[rRfFiIvV]*\s+\*/, // rm -rf *
    /\brm\s+-[rRfFiIvV]*\s+\.\/?(?:\s|$|[;&|])/, // rm -rf . 或 rm -rf ./
    /\brm\s+-[rRfFiIvV]*\s+\.\.\/?(?:\s|$|[;&|])/, // rm -rf .. 或 rm -rf ../
    /\brm\s+-[rRfFiIvV]*\s+\$(?:HOME|\{HOME\})/, // rm -rf $HOME
    /\bsudo\b/,
    /\bshutdown\b/,
    /\breboot\b/,
    /\bmkfs\b/,
    /\bdd\s+if=/,
    /\bchmod\s+-R\s+777\b/,
    /:\(\)\s*\{\s*:\s*\|\s*:\s*&\s*\}\s*;/, // fork bomb
    /\bgit\s+clean\s+-[fdx]+/, // git clean -fdx
    /\bfind\b[^;&|]*\s-delete\b/, // find ... -delete
  ];
  if (hardBlock.some((pattern) => pattern.test(command))) {
    return 'blocked';
  }

  // 2) 逐段解析（按 && ; | 切分），跟踪 cd，检查每个 rm 目标。
  let baseDir = CWD;
  for (const segment of command.split(/&&|\|\||;|\|/)) {
    const cdMatch = segment.match(/^\s*cd\s+(.+?)\s*$/);
    if (cdMatch) {
      baseDir = resolve(unquote(cdMatch[1] ?? ''));
      continue;
    }

    const rmMatch = segment.match(/\brm\s+(-[^\s]*)?\s*(.*)$/);
    if (rmMatch) {
      const flags = rmMatch[1] ?? '';
      const targets = (rmMatch[2] ?? '')
        .split(/\s+/)
        .filter((t) => t.length > 0);

      for (const rawTarget of targets) {
        if (rawTarget.startsWith('-')) continue; // 跳过 rm 的标志位

        const target = unquote(rawTarget);
        const resolved = resolve(baseDir, target);
        const rel = relative(resolved, CWD);

        // 删除 cwd 本身或其任意祖先目录：直接拒绝。
        if (rel === '' || (!rel.startsWith('..') && !resolved.endsWith('*'))) {
          return 'blocked';
        }

        const base = basename(target);
        const destructiveFlag = /[rRfF]/.test(flags);
        const protectedHit = PROTECTED_NAMES.some((re) => re.test(base));
        // 递归/强制删除，或触及受保护文件：必须人工确认。
        if (destructiveFlag || protectedHit) {
          return 'confirm';
        }
      }
    }
  }

  // 3) 其他不可逆操作：也需确认。
  if (/\bgit\s+reset\s+--hard\b/.test(command)) return 'confirm';
  if (
    /\bmv\b[^;&|]*(?:\.env|package\.json|pnpm-lock\.yaml|tsconfig)/.test(
      command,
    )
  ) {
    return 'confirm';
  }

  return 'ok';
}

// 执行 shell 命令；破坏性命令需先经 ask 回调获得用户确认。
export async function run_bash(
  command: string,
  ask: (question: string) => Promise<string>,
): Promise<string> {
  const verdict = assessDanger(command);

  if (verdict === 'blocked') {
    return 'Error: Dangerous command blocked by safety policy.';
  }

  if (verdict === 'confirm') {
    const answer = (
      await ask(
        `\x1b[31m⚠️  破坏性命令，确认执行吗？\n    $ ${command}\n  输入 y 确认，其他任意键拒绝: \x1b[0m`,
      )
    )
      .trim()
      .toLowerCase();
    if (answer !== 'y' && answer !== 'yes') {
      return 'Error: User rejected this command. Do not retry destructive commands unless the user explicitly confirms in chat.';
    }
  }

  try {
    const result = spawnSync(command, {
      shell: true,
      cwd: CWD,
      encoding: 'utf8',
      timeout: 120_000,
    });

    if (result.error) {
      if (result.error.message.toLowerCase().includes('timeout')) {
        return 'Error: Timeout (120s)';
      }
      if (result.error instanceof Error) {
        return `Error: ${result.error}`;
      }
    }

    const out = `${result.stdout ?? ''}${result.stderr ?? ''}`.trim();
    return out ? out.slice(0, 50_000) : '(no output)';
  } catch (error) {
    if (error instanceof Error) {
      return `Error: ${error}`;
    }
    return `Error: ${String(error)}`;
  }
}

// 持续调用模型并执行工具，直到模型不再请求工具。
async function agent_loop(
  messages: Anthropic.MessageParam[],
  ask: (question: string) => Promise<string>,
): Promise<void> {
  while (true) {
    const response = await client.messages.create({
      model: MODEL,
      system: SYSTEM,
      messages,
      tools: TOOLS,
      max_tokens: 8000,
    });

    // 将模型回复加入对话历史。
    messages.push({ role: 'assistant', content: response.content });

    // 模型未调用工具时结束本轮循环。
    if (response.stop_reason !== 'tool_use') {
      return;
    }

    // 逐个执行工具调用并收集结果。
    const results: Anthropic.MessageParam['content'] = [];
    for (const block of response.content) {
      if (block.type === 'tool_use') {
        const toolInput = block.input as { command?: unknown };
        const command = String(toolInput.command);
        console.log(`\x1b[33m$ ${command}\x1b[0m`);
        const outputText = await run_bash(command, ask);
        console.log(outputText.slice(0, 200));
        results.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: outputText,
        });
      }
    }

    // 将工具结果反馈给模型，继续下一轮循环。
    messages.push({ role: 'user', content: results });
  }
}

// 启动交互式命令行会话。
async function main(): Promise<void> {
  console.log('s01: Agent Loop');
  console.log('输入问题，回车发送。输入 q 退出。\n');

  const readline = createInterface({ input, output });
  const ask = (question: string) => readline.question(question);
  const history: Anthropic.MessageParam[] = [];

  try {
    while (true) {
      let query: string;
      try {
        query = await readline.question('\x1b[36ms01 >> \x1b[0m');
      } catch {
        break;
      }

      if (['q', 'exit', ''].includes(query.trim().toLowerCase())) {
        break;
      }

      history.push({ role: 'user', content: query });
      await agent_loop(history, ask);

      // 输出模型最终返回的文本。
      const responseContent = history[history.length - 1]?.content;
      if (Array.isArray(responseContent)) {
        for (const block of responseContent) {
          if (typeof block === 'object' && block !== null && 'text' in block) {
            console.log(block.text);
          }
        }
      }
      console.log();
    }
  } finally {
    readline.close();
  }
}

void main();
