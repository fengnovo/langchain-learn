import '../langsmith.js';

import { existsSync, readFileSync } from 'node:fs';

import { tool } from '@langchain/core/tools';
import { interrupt } from '@langchain/langgraph';
import { SqliteSaver } from '@langchain/langgraph-checkpoint-sqlite';
import { MultiServerMCPClient } from '@langchain/mcp-adapters';
import {
  humanInTheLoopMiddleware,
  modelCallLimitMiddleware,
  todoListMiddleware,
} from 'langchain';
import { createDeepAgent } from 'deepagents';
import { z } from 'zod';

import { createBackend } from '../backend.js';
import { E2BSandbox } from '../e2b-sandbox.js';
import { model } from '../model.js';
import type { SessionStore } from '../sessions.js';
import type { UserQuestionAnswer, UserQuestionRequest } from '../tui/types.js';
import type { CliSettings } from './config.js';

function createAskUserTool() {
  return tool(
    ({ question, options, multiple, allowCustom }) => {
      const answer = interrupt<UserQuestionRequest, UserQuestionAnswer>({
        kind: 'ask_user',
        question,
        options,
        multiple,
        allowCustom,
      });
      return JSON.stringify({
        selectedOptions: answer.selections,
        customInput: answer.customText ?? null,
      });
    },
    {
      name: 'ask_user',
      description:
        '当任务存在会显著影响实现结果、且无法从项目上下文确定的选择时，用终端菜单询问用户；支持单选、多选和“其他”自定义输入。一次只问一个问题，不要用普通文本模拟选择菜单。',
      schema: z.object({
        question: z.string().min(1).describe('要向用户提出的简短、明确的问题'),
        options: z
          .array(
            z.object({
              label: z.string().min(1).describe('简短的选项名称'),
              description: z.string().optional().describe('该选项的影响或取舍'),
            }),
          )
          .min(2)
          .max(9)
          .describe('2 到 9 个互斥选项，推荐项放在第一项'),
        multiple: z.boolean().default(false).describe('是否允许用户勾选多个选项'),
        allowCustom: z.boolean().default(false).describe('是否显示“其他”并允许用户输入自定义答案'),
      }),
    },
  );
}

/**
 * E2B 专用工具：获取沙箱内端口对应的公网访问 URL。
 *
 * Agent 在 E2B 沙箱里起 HTTP 服务后调用此工具，把返回的 URL 直接回复给用户。
 */
function createGetPublicUrlTool(sandbox: E2BSandbox) {
  return tool(
    ({ port }) => {
      const url = sandbox.getHost(port);
      return JSON.stringify({ url, port });
    },
    {
      name: 'get_public_url',
      description:
        '获取 E2B 沙箱内指定端口对应的公网可访问 URL。在用 execute 起好 HTTP 服务（如 `python3 -m http.server 3000 &`）后调用此工具，把返回的 URL 回复给用户在浏览器打开。',
      schema: z.object({
        port: z.number().int().min(1).max(65535).describe('沙箱内 HTTP 服务监听的端口号'),
      }),
    },
  );
}

async function loadMcpTools(configPath: string): Promise<{
  tools: unknown[];
  status: string;
}> {
  if (!existsSync(configPath)) {
    return { tools: [], status: '未配置（mcp/mcp.json 不存在）' };
  }

  try {
    const config = JSON.parse(readFileSync(configPath, 'utf8')) as {
      servers?: Record<string, unknown>;
    };
    const client = new MultiServerMCPClient(config as never);
    const tools = await client.getTools();
    return {
      tools,
      status: `已连接 ${Object.keys(config.servers ?? {}).length} 个服务器、${tools.length} 个工具`,
    };
  } catch (error) {
    return {
      tools: [],
      status: `加载失败：${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/** 创建 Agent 及其运行配置，不包含 TUI、会话选择和任务循环。 */
export async function createAgentRuntime(settings: CliSettings, sessionStore: SessionStore) {
  const { backend, mode: backendMode, sandboxCwd } = await createBackend(settings.cwd);
  const skillSources = settings.skillCount > 0 ? ['../skills/'] : [];
  const mcp = await loadMcpTools(settings.mcpConfigPath);
  const checkpointer = SqliteSaver.fromConnString(sessionStore.dbPath);

  // 云沙箱模式下，Agent 实际操作的路径在沙箱内部（如 /home/user），
  // 而不是宿主机的 settings.cwd。本地模式两者一致。
  const agentCwd = sandboxCwd ?? settings.cwd;
  const isCloudSandbox = backendMode === 'e2b' || backendMode === 'sandbox';

  // memory 路径在云沙箱里读不到（沙箱看不到宿主机文件），
  // 云沙箱模式跳过 memory 加载；skills 仍可读因 deepagents 走本地 fs。
  const memorySources = isCloudSandbox ? [] : ['../AGENTS.md'];

  // E2B 模式下注入 get_public_url 工具，让 Agent 能查到端口对应的公网访问地址
  const extraTools = backend instanceof E2BSandbox ? [createGetPublicUrlTool(backend)] : [];

  const agent = createDeepAgent({
    model,
    checkpointer,
    backend: backend as never,
    tools: [createAskUserTool(), ...extraTools, ...mcp.tools] as never,
    skills: skillSources,
    memory: memorySources,
    systemPrompt: [
      `你是一个运行在终端里的编码助手（coding agent），工作目录是：${agentCwd}`,
      ...(isCloudSandbox
        ? [
            `【重要】你当前运行在云沙箱（${backendMode}）中，这是一个隔离的 Linux 容器。` +
              `宿主机路径（如 /Users/...）在沙箱内不存在。所有文件操作必须使用沙箱内路径：${agentCwd} 下。` +
              `沙箱销毁后文件会丢失，如需持久化请在回复中提示用户保存。`,
            ...(backendMode === 'e2b'
              ? [
                  '起常驻服务（如 HTTP server）时：命令以 `&` 结尾后台运行（如 `python3 -m http.server 3000 &`），' +
                    'execute 工具会立即返回不阻塞。起好之后调用 `get_public_url` 工具传端口号，' +
                    '它会返回一个公网可访问的 URL，把该 URL 直接回复给用户在浏览器打开即可。',
                ]
              : []),
          ]
        : []),
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
      '9. 需求存在会显著改变实现结果的歧义时，调用 ask_user 给出 2-9 个选项，让用户在 CLI 菜单中选择；一次只问一个问题。' +
        '单选传 multiple=false，需要多选时传 multiple=true，需要用户能填写其他答案时传 allowCustom=true。' +
        '不要在普通回复中用 Markdown、序号或箭头模拟交互菜单。能从代码或上下文确定的事情不要询问。',
    ].join('\n'),
    middleware: [
      todoListMiddleware(),
      modelCallLimitMiddleware({ runLimit: 60, threadLimit: 300, exitBehavior: 'end' }),
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

  const activeThreadId = `demo20-${Date.now()}`;
  const config = {
    configurable: { thread_id: activeThreadId },
    recursionLimit: 80,
    runName: 'demo20-deep-agent-graph',
    tags: ['demo20', 'coding-agent', backendMode],
    metadata: {
      thread_id: activeThreadId,
      application: 'demo20-cli-todo-approval',
      backend: backendMode,
      cwd: agentCwd,
    },
    // values 用于渲染完整状态，messages/tools 用于展示模型和工具的实时进度。
    streamMode: ['values', 'messages', 'tools'] as Array<
      'values' | 'messages' | 'tools'
    >,
  };

  return {
    agent,
    backendMode,
    agentCwd,
    config,
    mcpStatus: mcp.status,
  };
}

export type AgentRuntime = Awaited<ReturnType<typeof createAgentRuntime>>;
