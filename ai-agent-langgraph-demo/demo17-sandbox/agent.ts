/**
 * 模式一：Agent in Sandbox（Docker 自建）—— 沙箱内运行的 DeepAgent 服务
 *
 * 对应课件 Agent.py 的五个部分（Python → TypeScript）：
 *   1. 配置沙盒后端：LocalShellBackend（rootDir/env/inheritEnv/timeout/maxOutputBytes）
 *   2. 创建 DeepAgent：createDeepAgent({ model, backend })
 *   3. HTTP 服务：FastAPI → Express（ChatRequest / ChatResponse 数据模型）
 *   4. 对话通讯：POST /chat，invoke + thread_id 会话隔离
 *   5. 启动入口：uvicorn 绑定 8000 端口 → app.listen(8000, '0.0.0.0')
 *
 * 该文件在沙箱（Docker 容器）内部运行：Agent 与它的 File / Shell / Tools
 * 都被关在沙箱里，用户只能通过 HTTP 与它交互（指令进、结果出）。
 *
 * 本地调试：不设 AGENT_WORKSPACE 时退化为当前目录的 workspace/，
 * 便于在没有 Docker 的宿主机上直接验证（真实部署请用 Dockerfile）。
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { MemorySaver } from '@langchain/langgraph';
import { createDeepAgent, LocalShellBackend } from 'deepagents';
import { model } from './model.js';

// ===== 1. 配置沙盒后端（对应课件「1.配置沙盒后端」）=====
// rootDir：Agent 的工作根目录（容器内为挂载卷 /workspace）
// env + inheritEnv=false：不继承主机环境变量，只给最小 PATH
// timeout：单条命令超时（秒）；maxOutputBytes：命令输出内存上限
const rootDir =
  process.env.AGENT_WORKSPACE ??
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'workspace');
const backend = await LocalShellBackend.create({
  rootDir,
  env: { PATH: process.env.SANDBOX_PATH ?? '/usr/local/bin:/usr/bin:/bin' },
  inheritEnv: false,
  timeout: 120,
  maxOutputBytes: 500_000,
});

// ===== 2. 创建 DeepAgent（对应课件「2.创建Deepagent」）=====
// backend 实现了 SandboxBackendProtocolV2，deepagents 会自动挂载
// execute 工具（在沙箱内执行 shell 命令）+ 文件工具（ls/read_file/...）
const agent = createDeepAgent({
  model,
  backend,
  systemPrompt:
    '你是一个运行在 Docker 沙箱中的 Deep Agent，专注于帮助用户完成' +
    '代码执行、文件处理等任务。所有文件与命令都只能作用于沙箱工作目录。',
  // thread_id → 会话隔离：不同 thread 各自保留对话历史
  checkpointer: new MemorySaver(),
});

// ===== 3. HTTP 服务（对应课件「3.Fast API服务」）=====
const app = express();
app.use(express.json());

// 请求体数据模型：{ message: string; thread_id?: string }
interface ChatRequest {
  message: string;
  thread_id?: string;
}
// 响应体数据模型：{ response: string; thread_id: string }
interface ChatResponse {
  response?: string;
  thread_id: string;
  error?: string;
}

// ===== 4. 对话通讯（对应课件「4.对话通讯」）=====
app.post('/chat', async (req, res) => {
  const { message, thread_id = 'default' } = req.body as ChatRequest;
  try {
    const result = await agent.invoke(
      { messages: [{ role: 'user', content: message }] },
      { configurable: { thread_id } },
    );
    const response = result.messages[result.messages.length - 1];
    res.json({
      response: typeof response.content === 'string' ? response.content : JSON.stringify(response.content),
      thread_id,
    } satisfies ChatResponse);
  } catch (e) {
    // 捕获异常，返回错误信息
    res.status(500).json({
      error: `错误: ${e instanceof Error ? e.message : String(e)}`,
      thread_id,
    } satisfies ChatResponse);
  }
});

// ===== 5. 启动入口（对应课件「5.启动入口」）=====
// 导入 HTTP 服务并绑定 8000 端口（uvicorn.run(app, host='0.0.0.0', port=8000)）
const port = Number(process.env.PORT ?? 8000);
app.listen(port, '0.0.0.0', () => {
  console.log(`DeepAgent in Sandbox 已启动: http://0.0.0.0:${port}/chat`);
  console.log(`沙箱工作目录: ${rootDir}`);
});
