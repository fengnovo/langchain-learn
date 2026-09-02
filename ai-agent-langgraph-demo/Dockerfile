# 模式一：Agent in Sandbox（Docker 自建）—— 沙箱镜像
# 构建：docker build -t deepagent-ts .
# 运行（macOS/Linux）：
#   docker run -it --rm -p 8000:8000 \
#     -v "$(pwd)/demo17-sandbox/workspace:/workspace" \
#     --env-file .env deepagent-ts
# 运行（Windows PowerShell）：
#   docker run -it --rm -p 8000:8000 `
#     -v "%cd%\demo17-sandbox\workspace:/workspace" `
#     --env-file .env deepagent-ts
FROM node:22-slim

# 启用 corepack 以使用与仓库一致的 pnpm
RUN corepack enable

WORKDIR /app

# 先拷贝依赖清单并安装，利用 Docker 层缓存
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# 拷贝沙箱内 Agent 运行所需代码（宿主机演示完整目录见 .dockerignore）
COPY model.ts ./model.ts
COPY demo17-sandbox ./demo17-sandbox

# Agent 工作根目录（对应 LocalShellBackend 的 rootDir）
ENV AGENT_WORKSPACE=/workspace
RUN mkdir -p /workspace

EXPOSE 8000

# 对应课件 uvicorn.run(app, host="0.0.0.0", port=8000)
CMD ["pnpm", "demo17:serve"]
