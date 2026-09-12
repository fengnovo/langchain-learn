/**
 * E2B 云沙箱适配器：把 E2B Sandbox 包装成 deepagents BaseSandbox。
 *
 * 用途：当未开通 LangSmith Sandbox 时，用 E2B 作为「Sandbox as tools」
 * 的云沙箱后端。E2B 提供隔离的 Linux 环境 + 文件系统 + 命令执行，
 * 按量计费（有免费额度），用完即 kill()。
 *
 * 安装：pnpm add e2b
 * 配置：在 .env 中加 E2B_API_KEY=your_key（https://e2b.dev/dashboard 创建）
 *
 * 接口对应关系：
 *   - E2B sandbox.sandboxId      → BaseSandbox.id
 *   - E2B sandbox.commands.run   → BaseSandbox.execute（stdout+stderr 合并）
 *   - E2B sandbox.files.write    → BaseSandbox.uploadFiles
 *   - E2B sandbox.files.read     → BaseSandbox.downloadFiles
 *   - E2B sandbox.kill           → close()
 *
 * 设计要点：BaseSandbox 只要求实现 4 个抽象成员（id/execute/upload/download），
 * 其他方法（ls/read/grep/glob/write/delete/edit）由基类基于 execute() 与
 * upload/download 默认实现，无需重写。
 */
import { CommandExitError, Sandbox as E2BSandboxInstance } from 'e2b';
import {
  BaseSandbox,
  type ExecuteResponse,
  type FileDownloadResponse,
  type FileOperationError,
  type FileUploadResponse,
} from 'deepagents';

export interface E2BSandboxOptions {
  /** E2B API Key。不传则读 process.env.E2B_API_KEY。 */
  apiKey?: string;
  /** 沙箱模板名。默认 'base'（裸 Linux 环境）。 */
  template?: string;
  /** 沙箱最长存活时间（毫秒）。默认 600_000 = 10 分钟。 */
  sandboxTimeoutMs?: number;
  /** 创建沙箱时注入的环境变量。 */
  envs?: Record<string, string>;
}

/** E2B 命令输出截断阈值，与 LocalShellBackend 的 maxOutputBytes 对齐。 */
const MAX_OUTPUT_BYTES = 200_000;

/**
 * 把 E2B 抛出的错误信息启发式映射到 deepagents 标准的 FileOperationError。
 * E2B SDK 没有标准化错误码，只能按 message 关键字判断。
 */
function classifyFileError(message: string): FileOperationError {
  const m = message.toLowerCase();
  if (m.includes('not found') || m.includes('no such file')) return 'file_not_found';
  if (m.includes('permission') || m.includes('denied')) return 'permission_denied';
  if (m.includes('is a directory') || m.includes('isdir')) return 'is_directory';
  return 'invalid_path';
}

export class E2BSandbox extends BaseSandbox {
  #sandbox: E2BSandboxInstance;
  #isRunning = true;

  private constructor(sandbox: E2BSandboxInstance) {
    super();
    this.#sandbox = sandbox;
  }

  /** 推荐入口：创建一个新的 E2B 沙箱并包装为 deepagents backend。 */
  static async create(options: E2BSandboxOptions = {}): Promise<E2BSandbox> {
    const apiKey = options.apiKey?.trim() || process.env.E2B_API_KEY?.trim();
    if (!apiKey) {
      throw new Error(
        'E2B 沙箱模式需要 E2B_API_KEY（在 .env 中配置，' +
          '可在 https://e2b.dev/dashboard 创建）。',
      );
    }

    const template = options.template ?? 'base';
    const sandboxTimeoutMs = options.sandboxTimeoutMs ?? 600_000; // 10 分钟

    const sandbox = await E2BSandboxInstance.create(template, {
      apiKey,
      timeoutMs: sandboxTimeoutMs,
      envs: options.envs,
    });

    return new E2BSandbox(sandbox);
  }

  /** E2B sandboxId 作为 backend id。 */
  get id(): string {
    return this.#sandbox.sandboxId;
  }

  get isRunning(): boolean {
    return this.#isRunning;
  }

  /**
   * 在 E2B 沙箱中执行 shell 命令。
   *
   * E2B commands.run 默认 timeoutMs=60_000；常驻服务（如 http.server）
   * 不会退出会触发 deadline_exceeded。这里把 timeoutMs 放大到 180s，
   * 并在命令以 `nohup ... &` 或 `... &` 结尾时自动切 background 模式
   * （返回 handle 不等结果，避免阻塞 Agent 循环）。
   */
  async execute(command: string): Promise<ExecuteResponse> {
    const isBackground = /\bnohup\b|\&\s*$/.test(command);

    if (isBackground) {
      // 后台命令：启动后立即返回，不等退出
      await this.#sandbox.commands.run(command, {
        background: true,
        timeoutMs: 0,
      });
      return {
        output: `[background started] ${command}`,
        exitCode: 0,
        truncated: false,
      };
    }

    // E2B commands.run 在退出码非 0 时会抛 CommandExitError（而非返回 exitCode）。
    // deepagents 的契约是「返回带 exitCode 的结果」，让上层决定是否视为失败，
    // 因此这里把 CommandExitError 转成普通结果，避免整个 Agent 任务中断。
    try {
      const result = await this.#sandbox.commands.run(command, {
        timeoutMs: 180_000,
      });
      return this.#toExecuteResponse(result.stdout ?? '', result.stderr ?? '', result.exitCode ?? 0);
    } catch (e) {
      if (!(e instanceof CommandExitError)) throw e;
      return this.#toExecuteResponse(e.stdout ?? '', e.stderr ?? '', e.exitCode ?? 1);
    }
  }

  /**
   * 合并 stdout/stderr 并做字节截断，返回 deepagents 约定的 ExecuteResponse。
   */
  #toExecuteResponse(stdout: string, stderr: string, exitCode: number): ExecuteResponse {
    const combined = stderr.length > 0 ? `${stdout}\n${stderr}` : stdout;

    let output = combined;
    let truncated = false;
    if (Buffer.byteLength(combined, 'utf8') > MAX_OUTPUT_BYTES) {
      output = Buffer.from(combined, 'utf8').subarray(0, MAX_OUTPUT_BYTES).toString('utf8');
      truncated = true;
    }

    return { output, exitCode, truncated };
  }

  /**
   * 获取沙箱内端口对应的公网访问地址。
   *
   * 用法：Agent 在沙箱里起了 HTTP 服务后，调用此方法拿到外网可访问的 URL，
   * 回复给用户在宿主机浏览器打开。
   *
   * @example
   * const url = sandbox.getHost(3000); // → 'https://3000-xxx.e2b.app'
   */
  getHost(port: number): string {
    return this.#sandbox.getHost(port);
  }

  /**
   * 上传多个文件到 E2B 沙箱。
   *
   * E2B files.write 单文件重载接 string|ArrayBuffer|Blob|ReadableStream，
   * 不直接接 Uint8Array；这里拷贝到纯 ArrayBuffer 再传（避开
   * TS 5.7+ 对 Uint8Array<ArrayBufferLike> 与 BlobPart 的严格区分）。
   * 逐个上传以满足 deepagents 的 partial success 要求（单个失败不阻断其他）。
   */
  async uploadFiles(files: Array<[string, Uint8Array]>): Promise<FileUploadResponse[]> {
    const results: FileUploadResponse[] = [];
    for (const [path, content] of files) {
      try {
        const ab = new ArrayBuffer(content.byteLength);
        new Uint8Array(ab).set(content);
        await this.#sandbox.files.write(path, ab);
        results.push({ path, error: null });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        results.push({ path, error: classifyFileError(msg) });
      }
    }
    return results;
  }

  /**
   * 从 E2B 沙箱下载多个文件。
   *
   * E2B files.read 必须显式传 { format: 'bytes' } 才返回 Uint8Array
   * （默认重载返回 string）。同样支持 partial success。
   */
  async downloadFiles(paths: string[]): Promise<FileDownloadResponse[]> {
    const results: FileDownloadResponse[] = [];
    for (const path of paths) {
      try {
        const content = await this.#sandbox.files.read(path, { format: 'bytes' });
        results.push({ path, content, error: null });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        results.push({ path, content: null, error: classifyFileError(msg) });
      }
    }
    return results;
  }

  /** 销毁沙箱（不可逆）。E2B 按量计费，务必调用。 */
  async close(): Promise<void> {
    if (!this.#isRunning) return;
    try {
      await this.#sandbox.kill();
    } finally {
      this.#isRunning = false;
    }
  }
}
