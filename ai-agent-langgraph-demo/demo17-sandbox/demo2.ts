/**
 * 模式二：Sandbox as tools（云服务沙箱）
 *
 * 对应课件「模式二：SandBox as tool（云服务沙箱）」（Python 用 Daytona）：
 * Agent 运行在本地系统上；当需要执行代码时，Agent 通过工具调用（tool_call →
 * tool_message）把 execute / read_file / write_file 等操作落到远端沙箱里。
 * 云厂商（课件举例 E2B / Codespaces / AWS / Daytona）负责运行和管理沙箱环境，
 * 用户只需使用，不用操心底层基础设施。
 *
 * TypeScript deepagents 内置的云沙箱后端是 LangSmithSandbox
 * （两种创建方式与课件 Daytona 对应）：
 *   - 课件: sandbox = daytona.create()        → TS: await LangSmithSandbox.create({...})
 *   - 课件: backend = DaytonaSandbox(sandbox) → TS: create() 返回值本身就是 backend
 *   - 课件: sandbox.stop() 用完即停           → TS: await sandbox.close()
 *
 * 云沙箱按量计费，务必保证每次「用完即停」（finally 中 close）。
 *
 * 未配置 LANGSMITH_API_KEY 时，本示例用 LocalShellBackend 兜底演示：
 * 两种后端实现同一个 SandboxBackendProtocolV2 接口，对 Agent 代码完全透明——
 * 这正是「Sandbox as tools」的解耦意义：换沙箱不改 Agent。
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { AIMessage, ToolMessage } from '@langchain/core/messages';
import type { ToolCall } from '@langchain/core/messages/tool';
import {
  createDeepAgent,
  LangSmithSandbox,
  LocalShellBackend,
  type SandboxBackendProtocolV2,
} from 'deepagents';
import { model } from './model.js';

// 两种沙箱后端都支持「用完即停」的统一接口
// （SandboxBackendProtocolV2 只约定 execute + id，close/isRunning 由实现类提供）
type StoppableBackend = SandboxBackendProtocolV2 & {
  close(): Promise<void>;
  readonly isRunning: boolean;
};

dotenv.config({
  path: fileURLToPath(new URL('../.env', import.meta.url)),
  quiet: true,
});

async function main(): Promise<void> {
  // ===== 1. 创建沙箱（对应课件「创建沙盒」）=====
  let backend: StoppableBackend;
  let label: string;
  const apiKey = process.env.LANGSMITH_API_KEY?.trim();

  if (apiKey) {
    // 云服务沙箱：LangSmith 帮我们运行和管理隔离沙箱环境
    console.log('===== 模式二：Sandbox as tools（LangSmith 云沙箱） =====');
    const sandbox = await LangSmithSandbox.create({
      apiKey,
      defaultTimeout: 120,
    });
    backend = sandbox;
    label = `LangSmithSandbox(id=${sandbox.id})`;
  } else {
    // 兜底：无云 key 时用本地 shell 沙箱演示同一流程（接口一致）
    console.log('===== 模式二：Sandbox as tools（未配置 LANGSMITH_API_KEY，用 LocalShellBackend 本地兜底） =====');
    backend = await LocalShellBackend.create({
      rootDir: path.resolve(
        path.dirname(fileURLToPath(import.meta.url)),
        'workspace-cloud',
      ),
      env: { PATH: process.env.SANDBOX_PATH ?? '/usr/local/bin:/usr/bin:/bin' },
      inheritEnv: false,
      timeout: 120,
    });
    label = `LocalShellBackend(id=${backend.id})`;
  }

  try {
    // ===== 2. 创建 DeepAgent（对应课件「创建Deepagents」）=====
    const agent = createDeepAgent({
      model,
      backend, // 传入沙盒后端
      systemPrompt: '你是一位拥有沙盒访问权限的 Python 编码助手。',
    });
    console.log(`沙箱后端: ${label}\n`);

    // ===== 3. 交互与观察（对应课件「交互与观察」）=====
    const result = await agent.invoke({
      messages: [
        { role: 'user', content: '编写一个 python 代码计算：57 的十一次方。' },
      ],
    });

    for (const mes of result.messages) {
      const content = typeof mes.content === 'string' ? mes.content : JSON.stringify(mes.content);
      if (AIMessage.isInstance(mes) && mes.tool_calls?.length) {
        // tool_call：Agent 发往沙箱的工具调用
        for (const tc of mes.tool_calls as ToolCall[]) {
          console.log(`[ai tool_call] ${tc.name} ${tc.args ? JSON.stringify(tc.args).slice(0, 200) : ''}`);
        }
        if (content) console.log(`[ai] ${content.slice(0, 300)}`);
      } else if (ToolMessage.isInstance(mes)) {
        // tool_message：沙箱返回的执行结果
        console.log(`[tool_message] ${content.slice(0, 200)}`);
      } else {
        console.log(`[${mes.getType()}] ${content.slice(0, 400)}`);
      }
    }
  } finally {
    // ===== 4. 用完即停（对应课件 sandbox.stop()：停止并销毁云端沙箱）=====
    await backend.close();
    console.log(`\n沙箱已销毁（isRunning=${backend.isRunning}），云沙箱按量计费，务必用完即停。`);
  }
}

main().catch((e) => {
  console.error('执行失败:', e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
