// 复制到目标项目后，入口文件必须首先 import 此模块。
import 'dotenv/config';

import { initLangfuseTracing } from './deepagents-langfuse.js';

/** 每个 Node.js 进程只初始化一次，供所有 Deep Agent 请求复用。 */
export const langfuseTracing = initLangfuseTracing({
  // 长驻服务默认 batched；CLI/Serverless 在单次调用时使用 flushAfterInvoke。
  exportMode: 'batched',
});
