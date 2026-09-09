import { spawnSync } from 'node:child_process';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { resolve, relative, basename } from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
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
const SYSTEM = `You are a coding agent at ${CWD}. Use bash to solve tasks. Act, don't explain.
Never delete the current working directory, its parent directories, or the project files inside it (source code, .env, package.json, lockfiles). Destructive or sensitive commands (deleting/overwriting files, killing processes, disk operations, force-pushing git, sending data to the network) will prompt the user for confirmation and cannot be bypassed — do not try to work around them with alternate command names, flags, or obfuscation. After a destructive command is rejected, do NOT retry variants of it; wait for the user's next instruction.`;

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

// 项目关键文件：即使不带 -r/-f，删除/移动/覆盖它们也必须确认。
const PROTECTED_NAMES: RegExp[] = [
  /^\.env(\..*)?$/,
  /^package(-lock)?\.json$/,
  /^pnpm-lock\.yaml$/,
  /^pnpm-workspace\.yaml$/,
  /^yarn\.lock$/,
  /^tsconfig(\..*)?\.json$/,
  /^Dockerfile$/,
  /^node_modules$/,
];

function unquote(s: string): string {
  return s.trim().replace(/^["']|["']$/g, '');
}

/**
 * 评估命令的危险程度。
 * - blocked：硬性黑名单（rm -rf /、删 cwd 或其父目录等），一律拒绝。
 * - confirm：破坏性操作（工作区内任何删除、rm -r/-f、受保护文件、
 *   杀进程、磁盘操作、git 高危、凭据外传、混淆执行等），必须人工确认。
 */
export function assessDanger(command: string): Verdict {
  // 1) 硬性黑名单：威胁系统/工作目录存续或无法挽回，一律拒绝。
  const hardBlock: RegExp[] = [
    // —— 提权 / 系统控制 ——
    /\bsudo\b/,
    /\bshutdown\b/,
    /\breboot\b/,
    // —— 磁盘 / 文件系统毁灭 ——
    /\bmkfs\b/,
    /\bdd\b[^;&|]*\bof=\/dev\/(disk|rdisk|sd|nvme|hd)/, // dd 写入块设备
    />>?\s*\/dev\/(disk|rdisk|sd|nvme|hd)/, // 重定向覆盖块设备
    /\bdiskutil\s+(eraseDisk|eraseVolume|reformat|partitionDisk|zeroDisk)\b/, // macOS 抹盘
    // —— 递归删除关键路径 ——
    /\brm\s+-[rRfFiIvV]*\s+\/\s*(?:$|[;&|])/, // rm -rf /
    /\brm\s+-[rRfFiIvV]*\s+~(?:\/|$|\s)/, // rm -rf ~
    /\brm\s+-[rRfFiIvV]*\s+\*/, // rm -rf *
    /\brm\s+-[rRfFiIvV]*\s+\.\/?(?:\s|$|[;&|])/, // rm -rf . 或 ./
    /\brm\s+-[rRfFiIvV]*\s+\.\.\/?(?:\s|$|[;&|])/, // rm -rf .. 或 ../
    /\brm\s+-[rRfFiIvV]*\s+\$(?:HOME|\{HOME\})/, // rm -rf $HOME
    /\bchmod\s+-R\s+0?777\b/, // 递归放开全部权限
    // —— 杀掉当前用户的全部进程 ——
    /\bkill\s+(?:-\S+\s+)*(-1|65535)(?:\s|$|[;&|])/,
    // —— fork bomb ——
    /:\(\)\s*\{\s*:\s*\|\s*:\s*&\s*\}\s*;/,
    // —— 远程脚本直接管道执行 ——
    /(?:curl|wget|httpie|http)\b[^;&|]*\|\s*(?:sudo\s+)?(?:bash|sh|zsh|fish|dash)\b/,
    /(?:bash|sh|zsh|fish|dash)\s+<\(\s*(?:curl|wget|httpie|http)\b/,
    // —— git 不可恢复清理 ——
    /\bgit\s+clean\s+-\w*[fdx]/,
    /\bfind\b[^;&|]*\s-delete\b/,
  ];
  if (hardBlock.some((pattern) => pattern.test(command))) {
    return 'blocked';
  }

  // 2) 逐段解析（按 && ; | 切分），跟踪 cd，检查删除类命令的每个目标。
  let baseDir = CWD;
  for (const segment of command.split(/&&|\|\||;|\|/)) {
    const cdMatch = segment.match(/^\s*cd\s+(.+?)\s*$/);
    if (cdMatch) {
      baseDir = resolve(unquote(cdMatch[1] ?? ''));
      continue;
    }

    // rm / shred / srm / unlink：按目标路径判定。
    const delMatch = segment.match(/\b(rm|shred|srm|unlink)\s+(-[^\s]*)?\s*(.*)$/);
    if (delMatch) {
      const tool = delMatch[1] ?? 'rm';
      const flags = delMatch[2] ?? '';
      const targets = (delMatch[3] ?? '')
        .split(/\s+/)
        .filter((t) => t.length > 0);

      for (const rawTarget of targets) {
        if (rawTarget.startsWith('-')) continue; // 跳过标志位

        const target = unquote(rawTarget);
        const resolved = resolve(baseDir, target);
        const relToCwd = relative(resolved, CWD);

        // 删除 cwd 本身或其任意祖先目录：直接拒绝。
        if (relToCwd === '' || (!relToCwd.startsWith('..') && !target.includes('*'))) {
          return 'blocked';
        }

        const inside = !relative(CWD, resolved).startsWith('..');
        const protectedHit = PROTECTED_NAMES.some((re) => re.test(basename(target)));
        const recursiveOrForce = /[rRfF]/.test(flags);
        const unrecoverable = tool === 'shred' || tool === 'srm';
        // 工作区内的任何删除（即使是无标志的 rm 单个文件）、受保护文件、
        // 递归/强制删除、不可恢复擦写：都必须人工确认。
        if (inside || protectedHit || recursiveOrForce || unrecoverable) {
          return 'confirm';
        }
      }
    }
  }

  // 3) 数据销毁 / 批量删除的其他形态（换命令名绕过 rm 的手法）。
  if (/\b(truncate|shred|srm)\b/.test(command)) return 'confirm';
  if (/\bfind\b[^;&|]*-exec\b[^;&|]*\brm\b/.test(command)) return 'confirm'; // find -exec rm
  if (/\bxargs\b[^;&|]*\brm\b/.test(command)) return 'confirm'; // xargs rm
  if (/\brsync\b[^;&|]*--delete/.test(command)) return 'confirm';

  // 4) 进程 / 服务 / 计划任务。
  if (/\b(kill|killall|pkill)\b/.test(command)) return 'confirm';
  if (/\blaunchctl\s+(unload|remove|disable|bootchange)\b/.test(command)) return 'confirm';
  if (/\bcrontab\s+-r\b/.test(command)) return 'confirm';

  // 5) 权限 / 属主递归修改；chmod +x 给脚本加可执行权限（常为执行自建脚本的前置步骤）。
  if (/\bchmod\s+-R\b/.test(command)) return 'confirm';
  if (/\bchown\s+-R\b/.test(command)) return 'confirm';
  if (/\bchmod\b[^;&|]*\+x\b/.test(command)) return 'confirm';

  // 6) git 高风险操作。
  if (/\bgit\s+reset\s+--hard\b/.test(command)) return 'confirm';
  if (/\bgit\s+(checkout|restore)\s+(--\s+)?\.(\s|$|[;&|])/.test(command)) return 'confirm';
  if (/\bgit\s+push\b[^;&|]*(--force|\s-f\b)/.test(command)) return 'confirm';
  if (/\bgit\s+branch\s+-D\b/.test(command)) return 'confirm';
  if (/\bgit\s+stash\s+clear\b/.test(command)) return 'confirm';
  if (/\bgit\s+(filter-branch|update-ref)\b/.test(command)) return 'confirm';

  // 7) 网络外传：把密钥/环境文件或带密钥字段的数据发往网络（凭据外泄风险）。
  if (
    /\b(curl|wget|httpie|http|nc|ncat)\b/.test(command) &&
    /(-X\s*(POST|PUT)|--data(-raw|-binary)?|\.env|API_KEY|SECRET|TOKEN|PASSWORD)/i.test(command)
  ) {
    return 'confirm';
  }

  // 8) 命令混淆 / 任意代码执行入口（可用来藏破坏性操作绕过上面的解析）。
  if (/\beval\s+/.test(command)) return 'confirm';
  if (/\b(bash|sh|zsh|fish|dash)\s+(-c|--command)\b/.test(command)) return 'confirm';
  if (/\b(python3?|node|deno|bun|perl|ruby|php)\s+(-e|-c)\b/.test(command)) return 'confirm';

  // 9) 覆盖写入 / 移动受保护文件（不用 rm 也能毁掉 .env、package.json 等）。
  const writeRe = /(?:>>?|tee(?:\s+-[a-zA-Z]+)*)\s+([^\s;|&<>]+)/g;
  let wm: RegExpExecArray | null;
  while ((wm = writeRe.exec(command)) !== null) {
    const target = unquote(wm[1] ?? '');
    if (PROTECTED_NAMES.some((re) => re.test(basename(target)))) {
      return 'confirm';
    }
  }
  if (
    /\bmv\b[^;&|]*(?:\.env|package\.json|pnpm-lock|yarn\.lock|tsconfig|Dockerfile|node_modules)/.test(
      command,
    )
  ) {
    return 'confirm';
  }
  if (/\bdefaults\s+delete\b/.test(command)) return 'confirm'; // macOS 系统设置删除

  return 'ok';
}

// —— 脚本文件内容审查 ——
// 模型可能先把破坏性命令写进脚本文件再执行（bash x.sh / node x.js / python x.py），
// 顶层命令本身没有任何危险特征，因此在执行前读取脚本内容做二次审查。

// 从命令中提取最后一个 cd 的目录，作为脚本相对路径的解析基准。
function resolveBaseDir(command: string): string {
  let baseDir = CWD;
  const cdMatches = command.match(/(?:^|[;&|]\s*)cd\s+([^;&|]+)/g);
  if (cdMatches) {
    const lastCd = cdMatches[cdMatches.length - 1];
    if (lastCd) {
      baseDir = resolve(unquote(lastCd.replace(/^.*?cd\s+/, '').trim()));
    }
  }
  return baseDir;
}

// 扫描单个脚本文件的内容。
function scanScriptContent(scriptPath: string, content: string): Verdict {
  // shell 脚本：逐行当作命令跑 assessDanger（跳过空行和注释行）。
  if (/\.(sh|bash|zsh)$/i.test(scriptPath)) {
    for (const rawLine of content.split('\n')) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;
      const v = assessDanger(line);
      if (v === 'blocked') return 'blocked';
      if (v === 'confirm') return 'confirm';
    }
    return 'ok';
  }

  // JS/TS/Python/Perl/Ruby/PHP 等：扫描文件删除 API 与 shell 调用 API。
  const dangerousApi =
    /\b(rmSync|fs\.rm|fs\.rmdir|fsPromises\.rm|rmdirSync|unlinkSync|fse\.remove|removeSync|shutil\.rmtree|os\.remove|os\.unlink|os\.rmdir|\.unlink\s*\(|child_process|spawnSync|spawn\s*\(|execSync|execFile|os\.system|subprocess\.\w+|shell\s*=\s*True|Deno\.remove|Bun\.spawn)\b/;
  if (dangerousApi.test(content)) return 'confirm';

  // 代码字符串里内嵌明显的 shell 破坏命令（如 execSync("rm -rf ...")）。
  if (/\brm\s+-[rRfF]/.test(content) || /\b(mkfs|dd\s+if=|git\s+clean\s+-[fdx])/.test(content)) {
    return 'confirm';
  }

  return 'ok';
}

// 找出命令中"被解释器/直接执行的脚本文件"，读取内容审查。
export function inspectExecutedScripts(command: string): Verdict {
  const baseDir = resolveBaseDir(command);
  const candidates = new Set<string>();

  // bash/sh/zsh script.sh | source script.sh | . script.sh
  const shellRunner =
    /(?:^|[;&|(]\s*)(?:bash|sh|zsh|fish|dash|source|\.)\s+(?:-\S+\s+)*["']?([^\s;"'|&<>]+\.sh)["']?/gi;
  // node/tsx/deno/bun/python/perl/ruby/php script.xxx
  const codeRunner =
    /(?:^|[;&|(]\s*)(?:node|tsx|deno|bun|python3?|perl|ruby|php)\s+(?:-\S+(?:\s+\S+)*\s+)?["']?([^\s;"'|&<>]+\.(?:js|mjs|cjs|ts|mts|cts|py|pl|rb|php))["']?/gi;
  // 直接执行：./script.sh 或绝对路径 /path/script.sh
  const directExec = /(?:^|[;&|(]\s*)(\.{0,2}\/[^\s;"'|&<>]+\.sh)\b/gi;

  let m: RegExpExecArray | null;
  for (const re of [shellRunner, codeRunner, directExec]) {
    while ((m = re.exec(command)) !== null) {
      if (m[1]) candidates.add(resolve(baseDir, unquote(m[1])));
    }
  }

  let worst: Verdict = 'ok';
  for (const scriptPath of candidates) {
    if (!existsSync(scriptPath)) continue; // 文件不存在时 shell 自己会报错，无需拦截
    let content: string;
    try {
      content = readFileSync(scriptPath, 'utf8');
    } catch {
      return 'confirm'; // 存在但读不了（权限/编码异常）：fail-closed，交用户确认
    }
    const v = scanScriptContent(scriptPath, content);
    if (v === 'blocked') return 'blocked';
    if (v === 'confirm') worst = 'confirm';
  }
  return worst;
}

// 执行 shell 命令；破坏性命令需先经 ask 回调获得用户确认。
// 返回值以 REJECTED_MARKER 开头表示用户拒绝，供 agent_loop 熔断统计。
const REJECTED_MARKER = 'Error: User rejected this command.';
const BLOCKED_MARKER = 'Error: Dangerous command blocked by safety policy.';

export async function run_bash(
  command: string,
  ask: (question: string) => Promise<string>,
): Promise<string> {
  // 顶层命令判定 + 被执行脚本文件的内容审查，取更严格的级别。
  const directVerdict = assessDanger(command);
  const scriptVerdict =
    directVerdict === 'blocked' ? 'ok' : inspectExecutedScripts(command);
  const verdict: Verdict =
    directVerdict === 'blocked' || scriptVerdict === 'blocked'
      ? 'blocked'
      : directVerdict === 'confirm' || scriptVerdict === 'confirm'
        ? 'confirm'
        : 'ok';

  if (verdict === 'blocked') {
    return BLOCKED_MARKER;
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
      return `${REJECTED_MARKER} Do not retry destructive commands unless the user explicitly confirms in chat.`;
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
// 熔断：同一轮对话中累计 MAX_REJECTIONS 次拒绝/拦截后强制停止，
// 防止模型不断换命令名/变体重试破坏性操作。
const MAX_REJECTIONS = 3;

async function agent_loop(
  messages: Anthropic.MessageParam[],
  ask: (question: string) => Promise<string>,
): Promise<void> {
  let rejected = 0;

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

        if (outputText.startsWith(REJECTED_MARKER) || outputText.startsWith(BLOCKED_MARKER)) {
          rejected += 1;
        }
      }
    }

    // 将工具结果反馈给模型，继续下一轮循环。
    messages.push({ role: 'user', content: results });

    if (rejected >= MAX_REJECTIONS) {
      console.log(
        '\x1b[31m🛑 安全熔断：本轮已有 ' +
          String(rejected) +
          ' 条危险命令被拒绝/拦截，已停止执行。请明确你的真实意图后再试。\x1b[0m',
      );
      return;
    }
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
