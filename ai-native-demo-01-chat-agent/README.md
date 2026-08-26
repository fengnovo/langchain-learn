# AI Native Demo 01：从零实现流式 Chat Agent
## 目标
这是 AI Native 学习路线第一个 Demo。
学习内容：
1.  LLM API 调用
2.  Chat 对话结构
3.  SSE 流式输出
4.  React 接收 Token 流
5.  Node.js + TypeScript AI 后端基础结构
本项目刻意保持简单：
-   不使用复杂框架
-   不引入 LangChain
-   不引入数据库
-   只理解 AI 应用最核心链路
## 架构
用户 ↓ React ↓ HTTP SSE ↓ Node.js API ↓ LLM Provider
## 运行
### 后端
进入 server：
``` bash
pnpm install
pnpm dev
```
环境变量：
创建 .env：
LLM_API_KEY=你的key
LLM_BASE_URL=兼容 OpenAI 格式的地址
### 前端
进入 web：
``` bash
pnpm install
pnpm dev
```
打开浏览器访问：
http://localhost:5173
## 学习重点
不要急着换框架。
先理解：
一次用户输入：
1.  前端发送 messages
2.  后端请求模型
3.  模型产生 token
4.  后端通过 SSE 转发
5.  前端逐字显示
这就是绝大多数 AI 产品的基础。
