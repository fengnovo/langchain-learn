ai native是什么
**AI Native（AI 原生）** 是近几年 AI 领域非常热门的一个概念，简单理解：
> **AI Native = 从设计之初就以 AI 为核心能力构建产品、系统和工作方式，而不是在传统产品上外挂一个 AI 功能。**
类似以前的：
- **Mobile Native（移动原生）**：从手机触摸屏、GPS、摄像头出发设计 App
- **Cloud Native（云原生）**：从云计算、容器、微服务出发设计系统
- **AI Native（AI 原生）**：从大模型、Agent、多模态、自然语言交互出发设计软件
---
### 1. 传统软件 vs AI Native 软件
举个例子：
#### 传统搜索产品
比如一个知识库：
``` id="v7ewyb"
用户输入关键词
        ↓
搜索引擎匹配
        ↓
返回文档列表
```
核心：
- 数据库
- 索引
- 关键词匹配
---
#### AI Native 知识助手
``` id="k0oo82"
用户：
"帮我找一下去年Q4销售下降原因"
        ↓
AI Agent
        ↓
理解意图
        ↓
调用工具：
 - 查询数据库
 - 分析报表
 - 阅读文档
 - 生成总结
        ↓
输出：
"下降主要来自华东区域，原因是..."
```
这里 AI 不是一个搜索框，而是系统核心。
---
## AI Native 的几个核心特征
### 1. 自然语言成为新的 UI
以前：
``` id="oqigfg"
菜单
按钮
表单
配置项
```
现在：
``` id="nwembq"
用户：
帮我生成一个活动页面
AI：
创建项目
安装依赖
写代码
部署
```
语言变成新的交互层。
---
例如：
传统 IDE：
``` id="znevo7"
File
Edit
Terminal
Git
Run
```
AI Native IDE：
``` id="cy4hpq"
告诉 AI：
"帮我优化这个组件性能"
```
AI：
- 分析代码
- 找瓶颈
- 修改
- 测试
---
### 2. Agent 成为软件里的执行者
传统软件：
``` id="xip24i"
用户
 |
UI
 |
后端 API
 |
数据库
```
AI Native：
``` id="dagzcp"
用户
 |
AI Agent
 |
----------------
|      |       |
工具1  工具2   工具3
数据库  API    浏览器
```
Agent 可以：
- 思考
- 规划
- 调用工具
- 执行任务
- 检查结果
---
比如 Cursor：
你说：
> "把这个 Vue 项目迁移成 React"
Agent 会：
``` id="hv32c4"
读取项目
 ↓
分析依赖
 ↓
修改文件
 ↓
运行测试
 ↓
修复错误
```
这就是 AI Native。
---
### 3. 数据成为智能资产
传统：
``` id="hd7hwt"
数据 → 存储
```
AI Native：
``` id="vh1b3z"
数据
 ↓
Embedding
 ↓
知识库
 ↓
RAG
 ↓
AI能力
```
例如企业：
以前：
``` id="uu4gy8"
100万个合同
```
只是文件。
AI Native：
``` id="z340no"
100万个合同
        ↓
向量数据库
        ↓
AI律师助手
问：
"过去5年类似合同有哪些风险？"
答：
...
```
---
### 4. 软件从「确定性」变成「概率性」
传统程序：
```js id="uwityp"
if(user.age > 18){
  allow()
}
```
结果确定。
AI：
``` id="rf2qf4"
输入：
一段自然语言
输出：
一个概率生成结果
```
所以需要：
- 评估体系
- Guardrails
- 人工审核
- AI Observability
---
## AI Native 架构大概长这样
``` id="ujy0uy"
                用户
                 |
        自然语言 / 多模态
                 |
                 ↓
             AI Agent
                 |
        ------------------
        |        |        |
       LLM     Memory   Tools
        |        |        |
     GPT/Qwen   RAG    API/DB/Web
                 |
                 ↓
             企业系统
```
---
## 对前端开发有什么影响？
你现在关注 AI Agent + TS，这个方向其实就是 AI Native 应用开发。
未来前端不只是：
``` id="kyf8p8"
React 页面
+
接口调用
```
而是：
``` id="ba666v"
React UI
+
AI Component
+
Agent 编排
+
Tool调用
+
Streaming UX
+
AI 状态管理
```
例如：
以前：
```tsx id="xw2o0o"
<Button>
提交
</Button>
```
AI Native：
```tsx id="okjuhj"
<AgentChat />
<ThinkingProcess />
<ToolCall />
<StreamingResponse />
<HumanApproval />
```
---
## AI Native 和 AI 加持有什么区别？
很多公司说：
> "我们产品接入 AI"
可能只是：
``` id="hzxeaf"
旧产品
+
ChatGPT API
=
AI 功能
```
例如：
Word 增加：
"帮我润色"
这属于 AI 增强。
---
AI Native：
例如：
``` id="m6vgfe"
Notion AI
从创建文档开始
就围绕 AI 协作设计
```
或者：
``` id="iy1jgh"
Cursor
不是代码编辑器加 AI
而是 AI 编程环境
```
---
## 对你这种前端架构方向的人，AI Native 可以理解为：
以前 P7 前端能力：
``` id="40p2yi"
React
TS
工程化
性能
微前端
BFF
Node
```
未来 AI Native 前端：
``` id="bj4d2m"
React
TS
+
Agent Framework
+
MCP
+
RAG
+
LLM API
+
Workflow编排
+
AI Observability
+
AI UX设计
```
也就是：
> **从“开发界面的人”，变成“构建 AI 应用系统的人”。**
你之前做的 LangGraph + TS Agent、Sentry MCP、飞书拉起 Codex，其实已经接近 AI Native 应用架构了。你现在缺的主要是把 Agent、RAG、Tool Calling、Memory、Eval 这些体系串起来。
```
工作经历:
有头部cex：Bybit等交易所开发经验，Ai-native多智能体编排，mcp集成，上下文工具质量门禁，知识库沉淀，
具备Ai全栈开发能力，熟悉cex交易所b端c端业务  
擅长: 
AI Agent 工程 / 多智能体编排：具备从单 Agent 到多智能体协作系统的完整设计与落地能力。
自研两套 AI 研发工作流技能体系，基于 Claude Code Agent / Subagent 实现任务拆分（fan-out）、
并行执行（git worktree 隔离避免写冲突）、结果聚 合（fan-in）与主从上下文交接协议；
按角色分层选型模型（机械/流程类用低成本模型、推理/评审类用高阶模型）在保证质 量前提下控制 token 成本。 
AI 原生研发体系落地：主导团队 AI 编程工程化，构建 Harness 工程——基于 Claude Code Hooks 实现
提交前 Lint / 危险操 作拦截 / 格式规范门禁，将质量闸嵌入 AI 编程流程；
实现 MCP Server 集成（代码知识图谱、效能平台、i18n、Playwright、 飞书文档），打通
「需求文档 → 代码 → TRD→ 提测 → 部署」自动链路；功能迭代周期压缩至原来的 1/3。 
上下文工程与 Prompt / Skill 编排：将团队三层代码规范结构化为 AI 可消费的知识库
并通过 CLAUDE.md 自动注入，确保 AI 产出与团队规范对齐；
掌握 brainstorming、writing-plans、subagent-driven-development、systematic-debugging、 TDD 
等方法论的编排，按任务复杂度选择最优执行策略；
实践渐进式检索（iterative-retrieval）控制子代理上下文溢出，
以 v erification-before-completion / Eval 门禁保证产出可靠。 
全栈开发能力：精通 JavaScript / TypeScript；
熟练 React（具备源码阅读能力，深入理解 Fiber 调和机制与 Hooks 原理）、 Vue 3、Next.js，
熟悉Ant Design Pro、AntV、Element UI、Vant 及 Tailwind CSS / Less；
具备 Node.js、Express、Ko a、Next.js（SSR / API Routes）后端经验，
熟悉阿里云函数计算 FC、腾讯云 COS 等 Serverless 架构，能优化函数冷启动与 链路设计。 
工程化与协作：熟悉 Webpack、Vite、Nx Monorepo、pnpm Workspace，
掌握 Git Flow、Conventional Commits、ESLi nt / TypeScript 规范体系，
推动团队构建标准化与自动化；具备 Scrum 敏捷实践经验，熟悉常见数据结构与算法并结合业务 场景落地。
```
分析下此人的工作能力，我能具备相同的能力吗
我先给结论：
**以你目前的背景（12 年前端、React/TS、Node、BFF、微前端、可观测性、LangGraph、MCP、RAGFlow 等实践），你具备达到这份简历大约 70%～80% 能力的基础。**
差距主要不在传统前端，而在 **AI Native 工程体系的深度和生产化经验**。
这份简历描述的是一个 **AI 应用架构师 / AI Engineering Lead 类型的人**，不是普通 AI 应用开发。
---
## 一、先拆解这个人的能力模型
这份简历实际上包含 6 大能力域。
---
## 1. AI Agent 工程能力（最高价值）
关键词：
> 多智能体编排、Claude Code Agent/Subagent、fan-out、fan-in、git worktree、上下文交接协议
他的能力：
不是简单调用：
```ts id="qlje30"
openai.chat.completions.create()
```
而是设计：
``` id="ae9n2f"
              主 Agent
                 |
        ----------------
        |       |       |
      分析Agent 代码Agent 测试Agent
        |       |       |
     worktree worktree worktree
                 |
              汇总Agent
```
类似：
一个需求：
> 增加用户登录功能
拆：
Planner:
``` id="ztja81"
分析需求
```
↓
Coder Agent:
``` id="pbc5cr"
修改前端
```
↓
Backend Agent:
``` id="f9smnb"
修改接口
```
↓
Tester:
``` id="gy0sqc"
写测试
```
↓
Reviewer:
``` id="4h8ora"
代码审查
```
这个能力目前你：
✅ 已经接触：
- LangGraph
- LangChain
- TS Agent Orchestrator
- router/planner
- tool calling
你的状态：
``` id="pm4zc1"
单Agent
      ↓
工具调用
      ↓
简单workflow
```
他：
``` id="rcmwsp"
Multi-Agent系统
      ↓
任务分解
      ↓
上下文管理
      ↓
质量评估
      ↓
成本控制
```
差距：
约 3~6个月系统实践。
---
## 2. MCP 能力
他说：
> MCP Server 集成（代码知识图谱、效能平台、i18n、Playwright、飞书文档）
这个比较重要。
MCP本质：
让 AI 获得工具。
结构：
``` id="ydnhcy"
Claude Code
      |
      |
 MCP Client
      |
-------------------
|       |          |
Git    Figma     飞书
Server Server    Server
```
你现在：
已经做：
✅ Sentry MCP
✅ 飞书
✅ 扣子
你其实已经进入这个领域。
差距：
他的 MCP 是企业内部平台级。
例如：
自己写：
``` id="aemwlx"
company-code-mcp
工具：
searchComponent()
findAPI()
getDesignToken()
queryRequirement()
```
你目前更多是：
调用已有 MCP。
下一阶段：
自己开发 MCP Server。
---
## 3. AI Coding Harness 能力
这个是很高级的一点。
他说：
> Claude Code Hooks 实现提交前 Lint / 危险操作拦截 / 格式规范门禁
什么意思？
普通开发：
``` id="sfgy67"
AI写代码
↓
git commit
```
他的：
``` id="5imx8b"
AI写代码
↓
Hook
↓
检查：
有没有console.log
有没有危险rm
有没有违反规范
有没有测试
↓
允许提交
```
类似 AI CI/CD。
架构：
``` id="ppa4m6"
Claude Code
    |
 Hooks
    |
-----------------
lint
security
test
quality gate
    |
git commit
```
这个能力非常符合未来 AI Native 团队。
你：
已有：
- ESLint
- GitHub Actions
- CI/CD
- 工程规范
差：
把 AI 接入工程链路。
---
## 4. Context Engineering（上下文工程）
这是目前很多人忽略的。
他说：
> CLAUDE.md 自动注入团队规范
比如：
项目：
``` id="jlhirs"
frontend/
CLAUDE.md
里面：
组件规范
目录规范
状态管理规范
API规范
```
Claude Code 每次启动：
自动加载。
类似：
给 AI 一个：
``` id="50odra"
企业大脑
```
你现在：
已经有：
- prompt
- system prompt分析
- Agent workflow
但是缺：
企业知识体系设计。
这个很适合你。
---
## 5. 全栈能力
这里你基本不弱。
他的：
前端：
React
Vue
Next
Node:
Express
Koa
Serverless
你的：
React
Vue3
Next
Node
BFF
Docker
Kafka
ClickHouse
Grafana
Sentry
实际上：
你的后端基础可能更偏工程。
---
## 6. CEX交易所业务
这是他的领域优势。
他说：
> Bybit等交易所开发经验
意味着懂：
交易系统：
``` id="mesqf0"
用户
 |
交易页面
 |
订单系统
 |
撮合系统
 |
行情系统
 |
风控
```
例如：
实时行情：
WebSocket
订单：
幂等
资金：
一致性
这个你没有。
但是：
这是行业经验，不是 AI 能力。
---
## 二、能力对比表
|能力|他|你|
|-|-|-|
|React/TS|★★★★★|★★★★★|
|Node|★★★★|★★★★|
|工程化|★★★★★|★★★★★|
|微前端|可能有|★★★★★|
|BFF|可能有|★★★★★|
|性能优化|未知|★★★★★|
|Agent|★★★★★|★★★|
|Multi-Agent|★★★★★|★★|
|MCP|★★★★★|★★★|
|RAG|★★★★|★★★|
|Prompt工程|★★★★★|★★★|
|AI Harness|★★★★★|★|
|Eval体系|★★★★★|★|
|交易业务|★★★★★|★|
---
## 三、你最大的优势
实际上你有几个优势，这个人简历里没有明显体现。
### 1. 你有大型前端架构经验
他的描述偏：
``` id="ld2vii"
AI + 工程效率
```
你的偏：
``` id="ugn275"
大型系统架构
```
比如：
- 微前端
- 高性能Canvas
- BFF
- 可观测
- 高并发
这些是 AI 应用落地非常需要的。
---
### 2. 你已经走在正确方向
你过去问的问题：
- LangGraph
- Agent Router
- Tool Calling
- MCP
- RAGFlow
- Sentry Agent
- 飞书自动化
其实路线：
``` id="gvqbtr"
高级前端
↓
AI应用工程师
↓
AI Native架构师
```
是对的。
---
## 四、如果你想达到这个人的水平，需要补什么？
我认为你的路线：
### 第一阶段（1个月）
补：
#### Agent基础
掌握：
- ReAct
- Plan Execute
- Reflection
- Tool Calling
- Memory
实现：
TS：
``` id="vlcnss"
自己的Agent框架
```
---
### 第二阶段（2个月）
Multi-Agent：
实现：
``` id="lgye1r"
需求Agent
代码Agent
测试Agent
Review Agent
```
技术：
- LangGraph
- Mastra
- CrewAI思想
---
### 第三阶段（2个月）
MCP深入：
不要只用。
自己写：
``` id="st8u7g"
feishu-mcp-server
codebase-mcp-server
sentry-mcp-server
```
---
### 第四阶段（2个月）
AI Engineering：
补：
- Eval
- Tracing
- Prompt Version
- AI CI/CD
- Guardrails
例如：
``` id="dx21ib"
AI生成代码
↓
自动测试
↓
质量评分
↓
合并
```
---
## 五、你的目标岗位应该是什么？
你的背景不应该定位：
❌ AI应用开发工程师
因为太低。
更适合：
``` id="1vryeh"
AI Native Frontend Architect
AI Engineering Lead
AI应用架构师
AI Developer Experience Engineer
```
因为你的优势：
``` id="ekdui7"
10多年工程经验
+
前端架构
+
Node
+
AI Agent
```
这是稀缺组合。
---
我的判断：
如果这个人的能力是 **100分**：
- 传统前端：30分
- AI Agent：35分
- AI工程体系：25分
- 交易业务：10分
你的当前：
- 传统前端：35分
- AI Agent：15~20分
- AI工程体系：10分
- 业务：5分
综合大约：
你现在 **65分左右**。
补 AI Agent + Harness + MCP Server + Eval 后：
**半年内达到 90 分是现实的。**
而且你的前端架构背景，在 AI Native 时代反而是优势，因为未来大量 AI 产品都会需要 **AI + 前端交互 + 工程体系**。你现在的方向基本是对的。
我要怎样一步步补齐这些，要最具体的计划和方案，具体到每个知识点和对应有个纯净很清爽直接的demo，不要有太多其他东西，并且能够下载来运行的
结合你的背景，我不会给你安排“学 Python → 学 LangChain → 看几个教程”的路线。
你的目标应该是：
> **从高级前端架构师 → AI Native 应用架构师 / AI Engineering Lead**
所以路线应该围绕**可落地项目能力**，每个知识点都配一个最小 Demo，最后组合成作品。
技术栈统一：
- 前端：React + TypeScript + Vite
- 后端：Node.js + TypeScript
- Agent：LangGraph.js / 自研轻量 Agent
- LLM：OpenAI Compatible（通义/Qwen/OpenRouter）
- 数据库：PostgreSQL + pgvector
- MCP：TypeScript SDK
- 部署：Docker
---
## 总路线（6个月）
``` id="dyu70w"
阶段1
LLM基础 + Tool Calling
        ↓
阶段2
RAG + Context Engineering
        ↓
阶段3
Agent Workflow
        ↓
阶段4
Multi-Agent
        ↓
阶段5
MCP Server生态
        ↓
阶段6
AI Engineering体系
(Harness/Eval/Tracing)
        ↓
最终项目
AI Native Dev Platform
```
---
## 第一阶段：Agent 基础（2周）
目标：
掌握：
- LLM调用
- Prompt
- Tool Calling
- Streaming
- Memory
### Demo 1：自己的 ChatGPT
项目：
``` id="ino9s0"
01-chat-demo
```
结构：
``` id="de319x"
01-chat-demo
apps
 ├── web
 │    React
 │
 └── server
      Node
```
功能：
输入：
``` id="igan28"
你好
```
返回：
``` id="e8r1u6"
流式输出
```
技术点：
#### 前端
React：
```tsx id="gn6xjl"
<MessageList />
<Input />
<StreamingText />
```
#### 后端
Node：
```ts id="wm7cgc"
client.chat.completions.create({
 stream:true
})
```
你掌握：
✅ SSE
✅ Token流式返回
✅ Chat状态管理
---
### Demo 2：Tool Calling Agent
目标：
让 AI 调接口。
例如：
用户：
``` id="sv9uxy"
今天深圳天气？
```
Agent：
发现需要天气工具：
``` id="32pd3y"
call weather()
```
结构：
``` id="er0l0u"
User
 ↓
LLM
 ↓
Tool Router
 ↓
weather API
 ↓
LLM总结
```
代码：
```ts id="69wzaa"
tools=[
 {
 name:"get_weather",
 description:"查询天气"
 }
]
```
掌握：
- Function Calling
- Tool Schema
- Agent Loop
---
## 第二阶段：RAG（3周）
这是企业 AI 应用核心。
### Demo 3：企业知识库
做一个：
``` id="k4jmqt"
AI文档助手
```
输入：
PDF：
``` id="vqltbj"
公司技术规范.md
接口文档
产品文档
```
流程：
``` id="s506s3"
文件
 ↓
Chunk
 ↓
Embedding
 ↓
Vector DB
 ↓
Retrieve
 ↓
LLM
 ↓
回答
```
技术：
``` id="x6lx76"
LangChain.js
+
pgvector
```
目录：
``` id="1ndqgo"
rag-demo
server
 ├── ingest.ts
 ├── embedding.ts
 ├── retrieval.ts
 └── chat.ts
```
必须掌握：
### Chunk策略
例如：
错误：
``` id="cbfr24"
10000字一个chunk
```
正确：
``` id="3igbb1"
500~1000 token
overlap 100
```
### Retrieval
理解：
``` id="ehn2gp"
Query
↓
Embedding
↓
Cosine Similarity
↓
Top K
```
---
## 第三阶段：Context Engineering（2周）
这是你和普通 AI 开发最大的区别。
学习：
### 1. CLAUDE.md体系
建立：
``` id="x5bd1u"
.ai
├── coding-rule.md
├── architecture.md
├── api-rule.md
└── component-rule.md
```
让 Agent 自动读取。
Demo：
``` id="o4j9v9"
AI Code Assistant
```
输入：
``` id="mx3a8u"
帮我新增用户页面
```
Agent 自动知道：
- React规范
- 文件结构
- API规范
---
### 2. Prompt Skill系统
学习：
``` id="nq4c3b"
Skill
=
Prompt
+
Context
+
Tool
+
Output Format
```
实现：
``` id="xqrtvg"
skills
├── frontend-review
├── api-design
├── bug-fix
└── test-writing
```
---
## 第四阶段：Agent Workflow（1个月）
目标：
从：
``` id="qjo52d"
聊天机器人
```
升级：
``` id="3hbe8q"
任务执行系统
```
---
### Demo 4：AI研发助手
输入：
``` id="b6vs51"
开发登录功能
```
自动：
``` id="2gbx15"
需求分析Agent
        ↓
方案设计Agent
        ↓
编码Agent
        ↓
测试Agent
        ↓
Review Agent
```
架构：
``` id="ohf5ml"
             Supervisor
                 |
--------------------------------
Planner       Coder       Tester
                 |
             Reviewer
```
技术：
LangGraph.js
掌握：
- State
- Node
- Edge
- Conditional Routing
---
## 第五阶段：Multi-Agent（1个月）
这是简历里面最有价值的部分。
### Demo 5：AI软件团队
模拟：
一个研发团队：
``` id="otyzop"
PM Agent
负责需求
Architect Agent
负责设计
Frontend Agent
写React
Backend Agent
写Node
QA Agent
测试
Reviewer Agent
审核
```
流程：
``` id="uz00qy"
需求
↓
PM
↓
Architect
↓
----------------
FE
BE
QA
----------------
Reviewer
↓
Output
```
增加：
Git Worktree。
例如：
``` id="siiolm"
workspace
/main
/worktree-fe
/worktree-be
/worktree-test
```
每个 Agent 独立修改。
---
## 第六阶段：MCP（1个月）
目标：
成为 MCP Server 开发者。
---
### Demo 6：自己的 MCP Server
不要只调用 MCP。
自己写：
``` id="kxvytr"
company-mcp
```
提供：
工具：
``` id="2btn4v"
search_code()
query_api()
get_component()
search_doc()
```
结构：
``` id="0wplw5"
mcp-server
src
├── index.ts
├── tools
│    ├── code.ts
│    └── docs.ts
```
接入：
Claude Code
Cursor
自己的 Agent
---
## 第七阶段：AI Engineering（1个月）
这是高级岗位区别。
---
## Demo 7：AI Harness
模拟 Claude Code。
功能：
代码生成：
↓
自动检查：
``` id="s3hem2"
eslint
test
security
format
```
流程：
``` id="xqzx9j"
AI生成代码
↓
Hook
↓
Quality Gate
↓
Commit
```
技术：
Node CLI
+
Husky
+
Git Hooks
---
## Demo 8：Agent Observability
做：
AI监控平台。
记录：
``` id="xh49eb"
请求
Prompt
Token
耗时
Tool调用
错误
```
类似：
LangSmith。
数据库：
``` id="dc52ak"
agent_trace
id
input
output
tokens
latency
tool
```
前端：
React Dashboard。
---
## 最终作品（重点）
不要做10个小Demo。
最后组合：
### AI Native Dev Platform
架构：
``` id="88424y"
                 React
                   |
              AI Console
                   |
              Agent Runtime
                   |
--------------------------------
Planner
Coder
Reviewer
Tester
--------------------------------
MCP
 |
Git
Figma
Feishu
Sentry
 |
Knowledge Base
(pgvector)
 |
Observability
```
这一个项目覆盖：
✅ Agent
✅ Multi Agent
✅ MCP
✅ RAG
✅ Context Engineering
✅ Eval
✅ AI Harness
✅ 前端架构
对应招聘：
AI应用开发
AI Agent工程师
AI全栈
AI平台工程师
---
## 你的学习顺序不要变
不要：
❌ Python课程
❌ LangChain源码啃几个月
❌ 调API做聊天机器人
应该：
``` id="14th2p"
Chat
 ↓
Tool Calling
 ↓
RAG
 ↓
Context Engineering
 ↓
Workflow Agent
 ↓
Multi Agent
 ↓
MCP
 ↓
Harness
 ↓
AI Platform
```
---
如果按你的基础，我建议：
每天：
2小时
其中：
``` id="n0vffv"
30分钟 看原理
90分钟 写Demo
```
6个月后，你简历里可以写：
> 设计并落地 AI Native Engineering Platform，基于 TypeScript 构建 Multi-Agent 编排系统，实现 MCP 工具生态、RAG 知识库、AI Coding Harness、Agent Observability，提升研发交付效率。
这个定位会比“会用 ChatGPT API 的 AI 应用开发”高一个层级。你现在最缺的是**系统化项目沉淀**，不是再学更多框架。
你逐个逐个生成一份教程文档，和代码demo项目打包发给我，需要详细的注释，不要求你快速生成，只要求你生成的易懂详细和简洁可运行。好，现在你生成第一个
第一个 Demo 已生成。
这是 AI Native 路线 **Demo 01：从零实现流式 Chat Agent**。
包含：
``` id="jm4mtr"
ai-native-demo-01-chat-agent
├── README.md
│
├── server
│   ├── package.json
│   └── src
│       └── index.ts
│
└── web
    ├── package.json
    └── src
        └── App.tsx
```
这个 Demo 只解决一个核心问题：
> **理解一个 AI 产品最基础链路：用户输入 → 后端调用 LLM → Token 流式返回 → 前端实时显示**
包含知识点：
#### AI 部分
- OpenAI Compatible API
- Chat Completion
- messages 结构
- stream=true
- token 流
#### 后端部分
- Node.js + TypeScript
- Express
- SSE（Server Sent Events）
- AI 请求代理层
#### 前端部分
- React
- fetch streaming
- ReadableStream
- 实时渲染 AI 输出
我特意没有加入：
- LangChain
- LangGraph
- RAG
- 数据库
- Docker
- 鉴权
- Monorepo
因为第一步先把 **AI 应用最底层原理吃透**。
下载：
[下载 ai-native-demo-01-chat-agent.zip](sandbox:/mnt/data/ai-native-demo-01-chat-agent.zip)
---
后续 Demo 我会按这个标准继续生成：
**Demo 02：Tool Calling Agent**
目标：
让 AI 不只是聊天，而是会调用工具：
``` id="agxxb5"
用户：
深圳今天天气？
        ↓
Agent
        ↓
判断需要工具
        ↓
调用 weather API
        ↓
整理答案返回
```
会加入：
- Function Calling 原理
- Tool Schema设计
- Agent Loop
- TS实现一个最小 Agent Runtime
仍然保持：
- 单项目
- 注释详细
- 可直接运行
- 不引入无关复杂依赖
后面所有 Demo 最终会串成一个完整 AI Native Platform。
涉及到实操的，你可以列一个文档放在zip包里面，我一步一步按实操操作，并讲清楚原理，写清楚注释
明白，后续我会调整生成方式。
之前的 Demo 更偏“代码包”，但对于你这种目标（达到 AI Native 工程能力），**不能只给代码，必须像一个课程实验一样：**
每个 Demo 包含：
``` id="ajqr7d"
demo-xx
├── README.md              # 总览
├── 实操手册.md            # 一步一步操作
├── 原理讲解.md            # 为什么这样设计
├── server                # 后端代码
├── web                   # 前端代码
└── .env.example          # 配置模板
```
每个知识点都会按照：
``` id="08pveq"
1. 为什么需要这个技术？
2. 它解决什么问题？
3. 整体架构图
4. 请求流程图
5. 代码逐行解释
6. 本地运行步骤
7. 如何调试
8. 面试如何回答
9. 可以继续怎么扩展
```
来写。
比如 Demo 01 后续完善方向：
#### 实操步骤
你打开电脑后：
```bash id="8x7cga"
git clone
cd server
pnpm install
配置API Key
pnpm dev
```
然后：
``` id="9gvqjj"
浏览器输入：
你好，请介绍React Fiber
```
观察：
Network：
``` id="7qjkla"
POST /chat
Response:
data:"你"
data:"好"
data:"，"
data:"React"
```
理解：
为什么 ChatGPT 能流式输出。
---
#### 原理部分会解释：
### 为什么不用普通 HTTP？
普通：
``` id="9xa0mf"
request
↓
server计算10秒
↓
response一次返回
```
AI：
``` id="zmtf8e"
request
↓
模型生成token
↓
马上返回
↓
继续生成
↓
继续返回
```
所以：
``` id="g645sm"
AI应用 ≈ 流式系统
```
这和你之前研究：
- SSE
- WebSocket
- 背压
- 可观测
其实是一条线。
---
#### 代码注释会达到这种程度：
例如：
```ts id="sab4dj"
const stream =
 await client.chat.completions.create({
   // 使用哪个模型
   model:"qwen-plus",
   // 用户历史消息
   messages,
   // 非常关键
   // 开启流式返回
   // 模型每生成一个token立即返回
   stream:true
 })
```
不是只告诉你：
“这里调用接口”。
而是解释：
“为什么 AI 产品必须这样设计”。
---
我已经补充了第一个 Demo 的实操手册：
下载：
[下载 ai-native-demo-01-chat-agent-complete.zip](sandbox:/mnt/data/ai-native-demo-01-chat-agent-complete.zip)
后面的 Demo 我都会按照这个标准生成。
下一份会做：
## Demo 02：Tool Calling Agent
目标：
从：
``` id="m75eik"
聊天机器人
```
升级到：
``` id="zhxhaj"
会使用工具的 Agent
```
会实现：
``` id="ee8gwr"
用户：
查询深圳天气
↓
LLM判断：
需要调用weather工具
↓
执行：
getWeather()
↓
结果返回LLM
↓
生成最终答案
```
里面会重点讲：
- Function Calling 原理
- Tool Schema设计
- Agent Loop
- 为什么 Tool Calling 是 Agent 的核心
- 如何自己实现一个最小 Agent Runtime
这个 Demo 才是进入 AI Agent 的真正第一步。
好，继续第二个
第二个 Demo 已生成。
## Demo 02：Tool Calling Agent
这是进入 **真正 Agent 开发** 的第一步。
下载：
[下载 ai-native-demo-02-tool-calling-agent.zip](sandbox:/mnt/data/ai-native-demo-02-tool-calling-agent.zip)
---
这次相比 Demo 01 增加了一个核心能力：
### 从 Chat → Agent
Demo 01：
```text id="a7ccbq"
用户
 |
 |
LLM
 |
 |
回答
```
模型只能生成文字。
---
Demo 02：
```text id="3wf37e"
用户
↓
Agent
↓
LLM判断
↓
需要工具？
↓
调用工具
↓
获取结果
↓
再次交给LLM
↓
生成答案
```
---
项目内容：
```text id="132sgq"
ai-native-demo-02-tool-calling-agent
├── README.md
│
├── 实操手册.md
│
├── server
│   ├── package.json
│   └── src
│       └── index.ts
│
└── web
    ├── package.json
    └── src
        └── App.tsx
```
---
本 Demo 重点学习：
### 1. Tool Schema
告诉模型：
“我有哪些能力”
例如：
```ts id="0ssj9r"
{
 name:"get_weather",
 description:"查询城市天气"
}
```
模型看到后知道：
如果用户问天气，可以调用它。
---
### 2. Tool Calling 生命周期
完整链路：
```text id="q0njdi"
用户：
深圳天气？
↓
LLM：
我要调用 get_weather
↓
代码：
执行 get_weather("深圳")
↓
返回：
{
 weather:"晴天",
 temperature:32
}
↓
LLM：
深圳今天晴天，32度
```
---
### 3. Agent Loop
这是后面所有 Agent 框架的基础：
```ts id="7xhazv"
while(true){
 请求LLM
 if(需要工具){
    执行工具
    加入上下文
 }else{
    返回结果
 }
}
```
LangChain、LangGraph、CrewAI 本质都是把这个流程工程化。
---
下一步第三个 Demo：
## Demo 03：RAG 企业知识库系统
会实现：
```text id="p1aym1"
PDF / Markdown文档
        ↓
文本切片 Chunk
        ↓
Embedding向量化
        ↓
pgvector存储
        ↓
用户问题
        ↓
向量检索
        ↓
RAG增强回答
```
这个 Demo 会重点讲：
- 为什么大模型不知道你的企业数据
- Embedding到底是什么
- Chunk怎么设计
- Vector Search原理
- RAG完整链路
- PostgreSQL + pgvector 实战
这个也是目前企业 AI 应用最常见的能力。
好，继续
第三个 Demo 已生成。
## Demo 03：RAG 企业知识库系统
下载：
[下载 ai-native-demo-03-rag-knowledge-base.zip](sandbox:/mnt/data/ai-native-demo-03-rag-knowledge-base.zip)
---
这个 Demo 开始进入企业 AI 应用的核心能力。
前两个：
``` id="cee1z4"
Demo 01
Chat + Streaming
↓
Demo 02
Tool Calling Agent
↓
Demo 03
RAG Knowledge Base
```
现在你已经开始接近真实 AI 应用架构。
---
### 本 Demo 学习目标
理解：
#### 1. 为什么企业需要 RAG
大模型：
``` id="j83e7q"
训练数据
    |
    |
    ↓
    LLM
```
但是不知道：
``` id="o35yfq"
公司接口文档
内部规范
业务数据
代码库
产品资料
```
RAG：
``` id="5vgl5w"
企业数据
↓
检索
↓
作为上下文提供给LLM
↓
生成答案
```
---
### 实现链路
完整流程：
``` id="kekh1x"
             文档
              |
              ↓
          文本切片
              |
              ↓
          Embedding
              |
              ↓
          向量库
用户问题
              |
              ↓
          Query向量
              |
              ↓
        相似度搜索
              |
              ↓
        找到相关知识
              |
              ↓
        拼Prompt
              |
              ↓
             LLM
              |
              ↓
            答案
```
---
### 为什么这个 Demo 没直接上 pgvector？
因为现在目标是：
**先理解 RAG 原理。**
很多人直接：
``` id="po1wb8"
LangChain
+
Milvus
+
pgvector
```
最后只会调 API。
但是不知道：
- Chunk 为什么这样切
- Embedding 为什么有效
- Retrieval 为什么召回
- Prompt 为什么增强
这个 Demo 用最少代码把核心链路展开。
---
### 你会重点掌握
#### Chunk
为什么：
100页 PDF
不能直接丢给模型？
因为：
- Context有限
- 成本高
- 检索不准
---
#### Embedding
把：
``` id="le2pkf"
React Fiber是什么
```
变成：
``` id="usfes2"
[0.123,0.456,0.789...]
```
让机器理解语义。
---
#### Retrieval
用户：
``` id="uk0vj4"
怎么优化React性能？
```
系统：
找到：
``` id="a051lr"
React Fiber
性能优化
Concurrent Rendering
```
相关内容。
---
#### RAG Prompt
最终给模型：
``` id="fd7e9s"
你是AI助手。
参考资料：
xxx
用户问题：
xxx
回答：
```
---
下一步：
## Demo 04：Context Engineering（上下文工程）
这个会非常贴近你前面看的那份高级 AI Native 简历。
会实现：
``` id="gzuvy6"
项目代码
+
CLAUDE.md规范
+
Skill系统
+
Prompt模板
↓
AI自动遵守团队规则
```
重点：
- 为什么 AI Coding 需要上下文工程
- CLAUDE.md 原理
- Skill设计
- Prompt分层
- 知识注入策略
- 如何避免上下文污染
- iterative retrieval（渐进式检索）
这个 Demo 会开始进入 **AI Engineering 而不是简单 AI 应用开发**。
你针对这个rag也模拟生成一个公司的下面东西，并且放到zip包里面，作为练习的mock材料：
公司接口文档
内部规范
业务数据
代码库
产品资料。
另外，解释下召回是啥意思
我补充生成了一套 **模拟公司知识库材料**，专门用于练习 Demo 03 RAG。
下载：
[下载 rag-demo-03-company-mock-materials.zip](sandbox:/mnt/data/rag-demo-03-company-mock-materials.zip)
里面包含：
```text id="1zcvqs"
rag-demo-03-company-mock-materials
├── README.md
├── 01-api-docs
│   └── user-service-api.md
│
├── 02-engineering-rules
│   └── frontend-standard.md
│
├── 03-business-data
│   └── order-analysis.md
│
├── 04-code-repository
│   └── order-service.ts
│
└── 05-product-docs
    └── payment-product.md
```
---
## 这五类数据为什么这样模拟？
因为真实企业 RAG 基本就是处理这些东西：
### 1. 公司接口文档
例如：
``` id="rwfa28"
用户登录接口是什么？
```
AI应该找到：
``` id="283m9l"
POST /api/v1/auth/login
返回token
```
对应：
API知识检索。
---
### 2. 内部研发规范
例如：
``` id="9hx45z"
新增React页面应该遵守什么规范？
```
AI应该找到：
``` id="yb5oza"
禁止any
使用函数组件
service层封装请求
```
对应：
Engineering Knowledge。
---
### 3. 业务数据
例如：
``` id="gqrg0r"
订单系统目前最大风险是什么？
```
AI应该找到：
``` id="z6dv6h"
18:00-22:00流量增加3倍
需要关注库存一致性
```
对应：
业务分析。
---
### 4. 代码库
例如：
``` id="8zp768"
创建订单逻辑在哪里？
```
AI应该找到：
```ts id="g7dnbn"
createOrder()
```
对应：
Code RAG。
---
### 5. 产品资料
例如：
``` id="6mb2h2"
支付流程是什么？
```
AI找到：
``` id="vcmip2"
用户下单
↓
创建支付单
↓
第三方支付
↓
回调
```
对应：
产品知识。
---
## 重点解释：RAG里面“召回”是什么意思？
这是非常核心的概念。
很多人说：
> RAG = 搜索 + GPT
其实不准确。
RAG分两个阶段：
```text id="s0yx0u"
Retrieval（检索/召回）
+
Generation（生成）
```
---
## 1. 什么叫召回？
简单理解：
> 从大量知识里面，把可能有用的内容找出来。
例如公司有：
10000份文档。
用户问：
``` id="54clqh"
支付失败怎么办？
```
系统不可能把10000份全部给模型。
所以先找：
可能相关的10份。
这个过程：
叫：
**召回（Retrieval）**
---
流程：
```text id="is9b1c"
10000份企业文档
        ↓
    搜索
        ↓
找到10份相关文档
        ↓
交给LLM
        ↓
生成答案
```
---
## 2. 召回靠什么？
传统搜索：
关键词。
例如：
用户：
``` id="r2yyz1"
支付失败
```
搜索：
包含：
``` id="ox719j"
支付
失败
错误
```
的文章。
问题：
语义理解差。
---
AI RAG：
使用 Embedding。
例如：
用户：
``` id="bxmrm9"
钱怎么没有到账？
```
转换向量：
``` id="ncav22"
[0.23,0.56,0.88...]
```
文档：
``` id="j4g51a"
支付成功但是余额未更新
```
转换：
``` id="lqho23"
[0.22,0.55,0.87...]
```
虽然文字不同：
但是意思接近。
所以被召回。
---
## 3. 召回率是什么？
假设：
知识库里面真正相关文档：
10个
系统找到：
8个
那么：
召回率：
``` id="s7xyyr"
8 / 10 = 80%
```
企业 RAG 非常关注：
### Recall（召回率）
找到多少正确资料。
---
## 4. 召回和排序不是一回事
很多人混淆。
完整流程：
```text id="o3jkg8"
100000份文档
↓
召回
找到：
100份
↓
排序(Rerank)
挑：
5份
↓
LLM回答
```
所以：
召回：
“有没有找到”
排序：
“哪个更重要”
---
## 5. 真实企业 RAG 架构
你后面升级 Demo 03 时，会变成：
```text id="7t70vy"
                 文档
                  |
                  ↓
             文档解析
                  |
                  ↓
              Chunk切片
                  |
                  ↓
            Embedding模型
                  |
                  ↓
             pgvector
用户问题
                  |
                  ↓
            Query Embedding
                  |
                  ↓
             Top K召回
                  |
                  ↓
              Rerank
                  |
                  ↓
              Prompt增强
                  |
                  ↓
                 LLM
                  |
                  ↓
                答案
```
---
对于你的目标（AI Native 架构师），RAG 这里建议你重点掌握：
1. Chunk策略
2. Embedding模型选择
3. Vector Search原理
4. TopK参数
5. Rerank
6. Hybrid Search（关键词+向量）
7. 企业知识权限控制
下一步 Demo 04 做 **Context Engineering**，会把你刚才那份高级简历里面的：
> CLAUDE.md 自动注入、Skill编排、上下文质量门禁
真正模拟出来。这个会比 RAG 更接近 AI Coding Agent。
Rerank又是
Rerank 是 RAG 里面非常重要的一环，很多初学者只知道：
``` id="8rshy9"
用户问题
 ↓
Embedding
 ↓
向量搜索
 ↓
LLM回答
```
但企业级 RAG 通常是：
``` id="zlinrk"
用户问题
 ↓
Embedding召回
 ↓
TopK候选文档
 ↓
Rerank重新排序
 ↓
挑最相关几个
 ↓
LLM生成答案
```
---
## 1. 为什么需要 Rerank？
先看一个例子。
你的知识库：
``` id="x5w2pk"
100万份公司文档
```
用户问：
> "订单支付失败怎么处理？"
第一步向量召回：
找到10条：
``` id="d52r76"
A:
支付失败排查流程
B:
订单系统架构介绍
C:
支付产品需求文档
D:
订单数据库设计
E:
历史支付事故复盘
F:
用户退款流程
...
```
向量搜索认为：
这些都和“支付”“订单”相关。
但是哪个最有用？
可能：
``` id="aypd7i"
A > E > C > F > B > D
```
这一步就是 Rerank。
---
## 2. 召回和 Rerank 的区别
简单比喻：
### 召回 = 图书馆管理员找书
你告诉管理员：
> 我要学习 React Fiber
管理员：
从10万本书里面找：
``` id="za4xqy"
React源码
React性能优化
Vue教程
JavaScript基础
浏览器原理
```
先不要漏。
目标：
**找得多。**
---
### Rerank = 专家挑书
专家看：
你的目标：
> 学 React Fiber 调度机制
重新排序：
第一：
``` id="4f30kd"
React Fiber架构解析
```
第二：
``` id="evr16v"
Concurrent Mode源码
```
第三：
``` id="ep6frf"
浏览器渲染原理
```
丢掉：
``` id="0f4i6u"
Vue教程
CSS基础
```
目标：
**找得准。**
---
## 3. 为什么向量搜索不够？
因为 Embedding 是语义相似。
例如：
问题：
``` id="9yw5v3"
如何解决订单重复扣款？
```
向量可能召回：
``` id="tuxvb7"
订单支付流程
订单状态机
支付成功率分析
订单表设计
```
因为都接近：
订单 + 支付。
但是：
真正答案：
``` id="hy2tlz"
支付回调幂等处理
```
Rerank 可以进一步理解：
“用户真正想解决的是重复扣款问题”。
---
## 4. Rerank 怎么实现？
常见方案：
---
### 方案1：Cross Encoder（企业最常用）
Embedding：
一次计算：
``` id="jb7uhs"
问题
 ↓
向量
文档
 ↓
向量
比较距离
```
速度快。
但是：
没有真正看：
问题 + 文档整体关系。
---
Cross Encoder：
直接输入：
``` id="6e9t2l"
问题:
订单重复扣款怎么办？
文档:
支付回调必须保证幂等。
```
模型输出：
``` id="bcu1hi"
相关度:
0.96
```
然后排序。
结构：
``` id="tkgu42"
Query
 +
Document
      ↓
Rerank Model
      ↓
score
```
---
常见模型：
- bge-reranker
- Cohere Rerank
- Jina Reranker
---
## 5. RAG完整流程（企业版）
例如：
飞书知识库：
100万文档。
### 第一步：粗召回
使用：
pgvector / Milvus
``` id="iac2xe"
1000000
↓
Embedding Search
↓
100个候选
```
---
### 第二步：Rerank
``` id="eudaoy"
100个候选
↓
Reranker
↓
10个最相关
```
---
### 第三步：LLM
``` id="wy6dja"
10个文档
↓
Prompt
↓
GPT/Qwen
↓
回答
```
---
## 6. Rerank 对效果提升有多大？
实际企业里：
没有 Rerank：
可能：
``` id="3f8cym"
准确率 60%
```
加入：
``` id="6hb1yj"
Embedding + Rerank
可能提升到80~90%
```
尤其：
- 企业知识库
- 技术文档
- 法律
- 金融
- 医疗
效果明显。
---
## 7. 对你这个 AI Native 学习路线意味着什么？
你的 Demo 03 现在：
``` id="szhjrt"
文档
↓
Embedding
↓
搜索
↓
LLM
```
属于：
**初级 RAG。**
升级企业版：
``` id="igl5ib"
文档
↓
Chunk
↓
Embedding
↓
Vector DB
↓
TopK召回
↓
Rerank
↓
Context压缩
↓
LLM
↓
Answer
```
---
## 8. 面试回答版本
如果面试官问：
> RAG 为什么需要 Rerank？
可以回答：
> 向量召回阶段主要保证 Recall（召回率），通过语义相似找到候选文档，但由于 Embedding 对细粒度语义和上下文关系判断有限，所以会引入 Rerank 模型对 Query 和候选 Document 做二次相关性评分，提高 Precision（准确率），最终选择更高质量上下文提供给 LLM。
---
你后面的 **Demo 03 升级版** 我建议增加：
``` id="k38h7n"
Demo 03-B 企业级RAG
增加：
1. PDF/Markdown解析
2. Chunk策略
3. bge-m3 Embedding
4. pgvector
5. TopK召回
6. Rerank
7. RAG评估
```
这个 Demo 做完，基本就是简历里写：
> 企业知识库/RAG系统设计与落地
的水平。你之前做 OCR → PostgreSQL → RAGFlow，其实已经接近这个方向，只差把召回、排序、评估这些理论补齐。
在demo3中保留现有初级部分，再增加Demo 03-B 企业级RAG
增加：
1. PDF/Markdown解析
2. Chunk策略
3. bge-m3 Embedding
4. pgvector
5. TopK召回
6. Rerank
7. RAG评估
这些高级部分，要求详细注释和清晰易懂
已升级生成 **Demo 03-B 企业级 RAG**，并保留了 Demo 03-A 基础 RAG 的学习路线。
下载：
[下载 ai-native-demo-03-enterprise-rag.zip](sandbox:/mnt/data/ai-native-demo-03-enterprise-rag.zip)
---
新的目录结构：
```text id="5whaz4"
ai-native-demo-03-enterprise-rag
├── README.md
│
├── 03-A-basic-rag
│   （保留之前基础RAG）
│
│
└── 03-B-enterprise-rag
    ├── 实操手册.md
    ├── server
    │   ├── src
    │   │   └── rag-flow.ts
    │   │
    │   └── sql
    │       └── init.sql
    │
    └── mock-docs
        └── company-api.md
```
---
## 这次重点增加内容
### 1. PDF / Markdown 解析
新增讲解：
企业知识库不是直接读取文本。
真实流程：
``` id="rzijmr"
PDF
Word
Markdown
网页
↓
Parser
↓
纯文本
↓
Chunk
```
后续可以扩展：
- pdf-parse
- mammoth(docx)
- unstructured
---
## 2. Chunk 策略
增加了详细说明：
为什么不能：
```ts id="pf3s99"
text.slice(0,10000)
```
企业里面需要考虑：
- token数量
- 标题结构
- 段落完整性
- overlap
例如：
原文：
``` id="wfi2yb"
支付系统设计
第一章
订单创建
第二章
支付回调
```
错误切：
``` id="m7qv58"
支付系统设计第一章订单创
```
正确：
``` id="sozien"
Chunk1:
支付系统设计
订单创建
Chunk2:
支付回调
```
---
## 3. bge-m3 Embedding
增加说明：
文本：
``` id="gjvk04"
订单重复扣款怎么办
```
转换：
``` id="m4z7wb"
[0.123,
 0.456,
 0.789...]
```
用于语义搜索。
后续真实实现会接：
```text id="qeo9id"
bge-m3
↓
Embedding API
↓
pgvector
```
---
## 4. pgvector
增加：
PostgreSQL 向量存储设计。
表：
```sql id="kkl79q"
documents
id
content
embedding
```
查询：
```sql id="lw7bks"
ORDER BY embedding <=> query_vector
LIMIT 10
```
这就是：
向量召回。
---
## 5. TopK召回
重点解释：
不是一次找到最终答案。
流程：
``` id="m0raxe"
100万文档
↓
向量搜索
↓
Top20
↓
Rerank
↓
Top5
↓
LLM
```
---
## 6. Rerank
加入企业级流程：
``` id="6hdvoz"
候选文档
↓
Reranker模型
↓
重新打分
↓
排序
↓
高质量Context
```
代码里面预留：
```ts id="2ot6dw"
async function rerank(
 query,
 docs
)
```
后面可以接：
- bge-reranker
- Cohere Rerank
- Jina Reranker
---
## 7. RAG评估
增加：
企业不能只说：
“回答感觉不错”。
需要指标：
### Recall
有没有找到正确资料。
### Precision
找到的是不是相关资料。
### Faithfulness
有没有胡编。
### Answer Relevance
是否回答问题。
---
这个 Demo 完成后，你对于 RAG 的理解会从：
``` id="scdihi"
会调用知识库
```
升级到：
``` id="ks29ws"
能够设计企业级 RAG Pipeline
```
---
下一步建议：
### Demo 04：Context Engineering（上下文工程）
这个会对应你最开始贴的高级简历：
> CLAUDE.md 自动注入
> Skill 编排
> 上下文质量门禁
> iterative retrieval
会实现：
```text id="3sr89d"
项目代码
+
团队规范
+
Prompt Skill
+
Agent上下文管理
↓
AI Coding Agent
```
这个是从“AI应用开发”进入“AI Native Engineering”的关键一步。
好，继续demo04
Demo 04 已生成。
## Demo 04：Context Engineering（上下文工程）
下载：
[下载 ai-native-demo-04-context-engineering.zip](sandbox:/mnt/data/ai-native-demo-04-context-engineering.zip)
---
这个 Demo 开始进入你贴的那份高级 AI Native 简历里的核心能力：
> 上下文工程与 Prompt / Skill 编排
> CLAUDE.md 自动注入
> Skill 系统
> 知识注入
> AI 输出质量控制
---
项目结构：
```text id="j0a8ia"
ai-native-demo-04-context-engineering
├── README.md
├── 实操手册.md
│
├── docs
│   ├── project-rule.md
│   └── architecture.md
│
├── skills
│   └── frontend-review.md
│
└── agent
    ├── package.json
    └── src
        └── index.ts
```
---
## 本 Demo 学什么？
前面 Demo：
### Demo 01
AI 会聊天：
```text id="pw959r"
用户
 ↓
LLM
 ↓
回答
```
---
### Demo 02
AI 会调用工具：
```text id="y1a5ww"
用户
 ↓
Agent
 ↓
Tool
 ↓
结果
```
---
### Demo 03
AI 会查企业知识：
```text id="aookdk"
问题
↓
知识库
↓
相关资料
↓
回答
```
---
### Demo 04
进入 AI Coding Agent：
```text id="v6iqw1"
用户任务
↓
Context Builder
↓
加载：
项目规范
架构文档
Skill
历史知识
↓
LLM
↓
生成代码
```
---
## 重点理解：为什么需要 Context Engineering？
假设：
用户：
> 帮我写一个用户列表页面
普通 AI：
不知道：
- React 还是 Vue？
- TypeScript规则？
- API怎么调用？
- 文件放哪里？
- 是否允许any？
- 组件规范？
所以结果不稳定。
---
Context Engineering：
提前提供：
```text id="pkoohb"
项目规则
+
架构设计
+
代码规范
+
Skill
```
AI 输出变成：
```tsx id="7hu0xb"
符合React规范
符合TS规范
符合目录结构
符合团队要求
```
---
## 本 Demo 模拟 CLAUDE.md
真实 Claude Code：
项目：
```text id="du7oqh"
project
├── CLAUDE.md
├── src
└── package.json
```
启动 Claude：
自动读取：
```text id="n6sb53"
CLAUDE.md
```
相当于：
给 AI 一个项目大脑。
---
## Skill 是什么？
很多人理解 Prompt：
```text id="04ivvp"
一句话告诉AI做什么
```
但是企业级 Skill：
更像：
```text id="8m2v08"
Skill
=
任务定义
+
规则
+
流程
+
输出格式
```
例如：
frontend-review：
```text id="gtd6vq"
任务：
审查React代码
流程：
1.检查TS
2.检查性能
3.检查组件设计
输出：
问题
原因
建议
```
---
## 这个 Demo 运行后你会看到：
执行：
```bash id="ap5xez"
cd agent
pnpm install
pnpm dev
```
输出：
``` id="kv4sqw"
====== AI Context ======
企业前端开发规范
项目架构说明
frontend-review skill
用户任务：
新增用户列表页面
```
这就是 Agent 调用 LLM 前的 Context Assembly（上下文组装）。
---
## 这个 Demo 和你的方向关联很大
你之前研究：
- Claude Code
- CLAUDE.md
- MCP
- Agent Harness
其实都是这一层。
完整 AI Coding Agent：
后面会变成：
```text id="n7llrf"
用户需求
↓
Planner Agent
↓
Context Engineering
↓
MCP获取代码/文档
↓
Coder Agent
↓
Reviewer Agent
↓
Test Agent
↓
提交代码
```
---
下一步 Demo 05：
## Agent Workflow（多步骤 Agent 编排）
会实现：
```text id="od6czn"
需求
↓
Planner Agent
↓
Coder Agent
↓
Reviewer Agent
↓
Tester Agent
↓
最终结果
```
重点：
- LangGraph 思想
- State管理
- Node/Edge
- Agent之间上下文传递
- fan-out / fan-in 基础
这个就是你最开始那份简历里的：
> 多智能体编排、任务拆分、并行执行、结果聚合
的入门版本。
好，继续demo05
Demo 05 已生成。
## Demo 05：Agent Workflow 编排
下载：
[下载 ai-native-demo-05-agent-workflow.zip](sandbox:/mnt/data/ai-native-demo-05-agent-workflow.zip)
---
这个 Demo 是从：
```text id="gy4mtk"
AI应用开发
```
进入：
```text id="erm1ck"
AI Agent工程
```
的关键一步。
---
项目结构：
```text id="i2oisy"
ai-native-demo-05-agent-workflow
├── README.md
├── 实操手册.md
│
├── docs
│   └── workflow-design.md
│
└── agent
    ├── package.json
    └── src
        └── index.ts
```
---
## 本 Demo 学习目标
实现一个最小版：
``` id="rfzdaz"
AI研发团队
```
模拟：
```text id="i1lj55"
用户需求
↓
Planner Agent
↓
Coder Agent
↓
Reviewer Agent
↓
Tester Agent
↓
最终结果
```
---
## 为什么需要 Workflow？
前面的 Demo 02：
```text id="etb2vt"
用户问题
↓
Agent
↓
调用工具
↓
回答
```
适合：
简单任务。
但是开发一个功能：
例如：
> 增加用户登录模块
实际需要：
``` id="bez4lu"
需求分析
↓
技术方案
↓
代码实现
↓
代码审查
↓
测试验证
```
一个 Agent 很难一次做好。
所以拆成多个角色。
---
## 核心概念 1：Agent 节点
每个 Agent 是一个职责：
例如：
### Planner
负责思考：
```text id="3y467d"
这个需求怎么拆？
```
输出：
```json id="020t1a"
{
 "page":"Login",
 "api":"auth/login",
 "state":"token"
}
```
---
### Coder
负责：
```text id="79yzje"
根据方案写代码
```
---
### Reviewer
负责：
```text id="zmi9rx"
发现问题
```
例如：
- TS类型问题
- 安全问题
- 性能问题
---
### Tester
负责：
```text id="s1aitk"
验证结果
```
---
## 核心概念 2：State 状态传递
这是 LangGraph 最重要的思想。
多个 Agent 之间不是聊天。
而是共享状态：
```ts id="cszcoo"
{
 requirement:"",
 plan:"",
 code:"",
 review:"",
 test:""
}
```
流程：
```text id="fjwklz"
Planner
修改：
state.plan
↓
Coder
读取：
state.plan
写入：
state.code
↓
Reviewer
读取：
state.code
写入：
state.review
```
---
## 核心概念 3：Node / Edge
后面学习 LangGraph 时：
你会看到：
```text id="dp7874"
Node
=
一个Agent函数
Edge
=
节点连接关系
```
例如：
```text id="0hr1ic"
graph.addNode(
 "planner",
 planner
)
graph.addEdge(
 "planner",
 "coder"
)
```
本质就是：
现在这个 Demo 的：
```ts id="49o89f"
state=planner(state)
state=coder(state)
```
升级版。
---
## 核心概念 4：fan-out / fan-in
这是你之前贴的高级简历里的：
> fan-out 并行执行
> fan-in 结果聚合
例如：
一个需求：
``` id="9v7tmy"
开发订单功能
```
拆：
``` id="bjyee8"
             Planner
                |
 --------------------------------
 FE Agent
 BE Agent
 QA Agent
                |
             Reviewer
```
三个 Agent 可以并行。
最后汇总。
---
## 这个 Demo 目前是：
简单串行：
```text id="qscdj1"
Planner
↓
Coder
↓
Reviewer
↓
Tester
```
下一阶段会升级：
### Demo 06：Multi-Agent System
加入：
- Supervisor Agent
- 多 Agent 并行
- 任务拆分
- 结果聚合
- Agent间通信协议
- Git Worktree隔离模拟
对应你最开始看的简历：
> Claude Code Agent / Subagent
> fan-out
> fan-in
> git worktree隔离避免写冲突
> 主从上下文交接协议
---
目前你的学习链路：
```text id="n6i7sn"
Demo01
Chat + Streaming
↓
Demo02
Tool Calling
↓
Demo03
RAG
↓
Demo04
Context Engineering
↓
Demo05
Agent Workflow
↓
Demo06
Multi-Agent
↓
Demo07
MCP Server
↓
Demo08
AI Harness
↓
最终：
AI Native Dev Platform
```
已经开始覆盖那份高级 AI Native 简历的核心能力。
好，继续
Demo 06 已生成。
## Demo 06：Multi-Agent System（多智能体系统）
下载：
[下载 ai-native-demo-06-multi-agent-system.zip](sandbox:/mnt/data/ai-native-demo-06-multi-agent-system.zip)
---
这个 Demo 对应你最开始贴的高级 AI Native 简历里面最核心的一段：
> 多智能体编排：任务拆分（fan-out）、并行执行、结果聚合（fan-in）、主从上下文交接协议
---
项目结构：
```text id="rh31f4"
ai-native-demo-06-multi-agent-system
├── README.md
├── 实操手册.md
│
├── docs
│   └── agent-protocol.md
│
└── multi-agent
    ├── package.json
    └── src
        └── index.ts
```
---
## 这次和 Demo 05 最大区别
Demo 05：
Workflow：
```text id="86lhiq"
需求
↓
Planner
↓
Coder
↓
Reviewer
↓
Tester
```
特点：
一个流程。
---
Demo 06：
Multi-Agent：
```text id="f2lui7"
             Supervisor
                  |
      -------------------------
      FE Agent
      BE Agent
      QA Agent
      -------------------------
                  |
              Reviewer
```
特点：
多个专业 Agent 协作。
---
## 核心知识点 1：Supervisor Agent
Supervisor 类似：
项目经理 / 调度中心。
它负责：
- 理解需求
- 拆任务
- 分配 Agent
- 收集结果
例如：
用户：
> 开发订单模块
Supervisor：
拆成：
```json id="wkywb2"
{
 frontend:"开发订单列表页面",
 backend:"开发订单接口",
 qa:"设计测试用例"
}
```
---
## 核心知识点 2：Sub Agent
每个 Agent 专注一个领域。
例如：
### Frontend Agent
负责：
- React组件
- CSS
- 状态管理
---
### Backend Agent
负责：
- API
- 数据库
- 服务逻辑
---
### QA Agent
负责：
- 测试
- 边界条件
- 异常流程
这样比一个万能 Agent 更稳定。
---
## 核心知识点 3：Agent通信协议
不要让 Agent 之间传大量自然语言。
企业里面一般结构化：
例如：
```json id="xc1oq8"
{
 "agent":"frontend",
 "task":"开发订单列表",
 "status":"completed",
 "result":{
   "files":[
      "OrderList.tsx"
   ]
 }
}
```
好处：
- 可追踪
- 可重试
- 可评估
- 可人工审核
---
## 核心知识点 4：fan-out
任务拆开：
```text id="mrbog5"
一个需求
↓
多个Agent
↓
并行执行
```
例如：
```text id="ej0cfy"
订单功能
     |
 ----------------
 FE
 BE
 QA
 ----------------
```
三个 Agent 可以同时工作。
---
## 核心知识点 5：fan-in
多个结果汇总：
```text id="vo24og"
Frontend结果
Backend结果
QA结果
        ↓
Reviewer
        ↓
最终方案
```
Reviewer负责：
- 检查冲突
- 综合结果
- 输出最终版本
---
## 当前 Demo 是串行模拟
代码：
```ts id="6nb82w"
state=frontendAgent(state);
state=backendAgent(state);
state=qaAgent(state);
```
目的是：
先理解架构。
下一步升级：
真正并行：
```ts id="1j8wh3"
await Promise.all([
 frontendAgent(),
 backendAgent(),
 qaAgent()
])
```
这就是简历里的：
> 并行执行
---
## 这个 Demo 对应真实产品
比如：
Claude Code：
```text id="y8pih2"
主Agent
↓
SubAgent
↓
代码分析Agent
测试Agent
Review Agent
```
Cursor Agent：
```text id="mx2b9u"
Planner
↓
多个子任务
↓
代码修改
↓
验证
```
---
## 目前学习路线：
```text id="di0m5x"
Demo01
Chat + Streaming
↓
Demo02
Tool Calling
↓
Demo03
RAG
↓
Demo04
Context Engineering
↓
Demo05
Agent Workflow
↓
Demo06
Multi-Agent
```
下一步：
## Demo 07：MCP Server 开发
这个会进入你贴的简历里的：
> MCP Server 集成（代码知识图谱、效能平台、i18n、Playwright、飞书文档）
会实现：
```text id="hge7cq"
Agent
  |
 MCP Client
  |
 MCP Server
  |
----------------
文件系统
数据库
Git
飞书
API
----------------
```
重点：
- MCP协议原理
- Tool暴露方式
- MCP Server开发
- Agent如何发现和调用工具
- 自己写一个企业内部 MCP Server
这个是 AI Native 工程师和普通 AI 应用开发最大的分水岭之一。
好，继续
Demo 07 已生成。
## Demo 07：MCP Server 开发
下载：
[下载 ai-native-demo-07-mcp-server.zip](sandbox:/mnt/data/ai-native-demo-07-mcp-server.zip)
---
这个 Demo 对应你最开始贴的高级 AI Native 简历：
> MCP Server 集成（代码知识图谱、效能平台、i18n、Playwright、飞书文档）
这一部分。
---
项目结构：
```text id="mcp8s1"
ai-native-demo-07-mcp-server
├── README.md
├── 实操手册.md
│
├── docs
│   └── mcp-design.md
│
├── mcp-server
│   ├── package.json
│   └── src
│       └── index.ts
│
└── client-agent
    └── src
        └── index.ts
```
---
## 本 Demo 学习目标
理解：
为什么 MCP 会成为 AI Agent 的基础设施。
---
以前：
每个 AI 产品自己写插件：
```text id="1cwqcy"
id="u8xjyz"
Claude
  |
 自定义插件
Cursor
  |
 自定义插件
Copilot
  |
 自定义插件
```
问题：
工具不能复用。
---
MCP：
统一协议：
```text id="9v21j2"
id="0j1qjr"
              AI Agent
                  |
             MCP Client
                  |
             MCP Server
                  |
        ---------------------
        Git
        文件
        数据库
        飞书
        Jira
        Sentry
        ---------------------
```
---
## MCP核心概念
### 1. MCP Client
谁使用工具。
例如：
- Claude Code
- Cursor
- 自己写的 Agent
负责：
发现 MCP Server 提供什么能力。
---
### 2. MCP Server
提供能力。
例如：
代码查询：
```ts id="epmjox"
search_code()
```
文档查询：
```ts id="g1lhso"
read_document()
```
---
### 3. Tool
Tool就是：
AI可以调用的方法。
例如：
用户：
> 找一下登录代码
Agent：
判断需要：
```text id="6ghcuv"
search_code("login")
```
调用 MCP Server。
---
## 本 Demo 模拟企业场景
模拟：
### Code MCP
提供：
```text id="fh1mf1"
search_code
read_document
```
真实公司可以扩展：
---
### Feishu MCP
例如：
```text id="1rxlz9"
search_feishu_doc()
get_requirement()
```
AI：
读取产品需求。
---
### Sentry MCP
例如：
```text id="ce552w"
query_error()
get_stacktrace()
```
AI：
分析线上错误。
---
### Figma MCP
例如：
```text id="ww1bdg"
get_design()
get_token()
```
AI：
读取设计规范。
---
## 重点理解：为什么 MCP 对 AI Native 很重要？
未来：
软件能力：
不会只通过 API 给人调用。
而是：
```text id="bk0jq8"
API
↓
AI可调用Tool
↓
Agent自主完成任务
```
例如：
以前：
开发：
打开飞书
复制需求
打开代码
修改
未来：
用户：
> 根据飞书需求实现支付功能
Agent：
自动：
```text id="u75lsq"
读取飞书
↓
理解需求
↓
查询代码
↓
修改代码
↓
运行测试
↓
提交PR
```
---
## 这个 Demo 当前是教学版
为了理解原理：
没有引入官方 MCP SDK。
下一阶段可以升级：
### Demo 07-B 企业 MCP Server
增加：
- 官方 MCP TypeScript SDK
- stdio transport
- HTTP transport
- 权限控制
- Tool Schema
- 日志审计
最终做：
```text id="nwnj5a"
company-mcp-platform
├── code-mcp
├── feishu-mcp
├── sentry-mcp
├── jira-mcp
└── database-mcp
```
---
下一步：
## Demo 08：AI Coding Harness
对应简历：
> 基于 Claude Code Hooks 实现提交前 Lint / 危险操作拦截 / 格式规范门禁，将质量闸嵌入 AI 编程流程
会实现：
```text id="wunv3l"
AI生成代码
↓
Hook
↓
Lint
↓
安全检查
↓
测试
↓
允许提交
```
重点：
- Hooks
- AI代码质量门禁
- Guardrails
- 自动验证
- AI工程化流水线
这个 Demo 做完，你基本就覆盖那份简历里 **AI Native研发体系落地** 的核心能力。
好，继续
Demo 08 已生成。
## Demo 08：AI Coding Harness（AI 编程工程化质量体系）
下载：
[下载 ai-native-demo-08-ai-coding-harness.zip](sandbox:/mnt/data/ai-native-demo-08-ai-coding-harness.zip)
---
这个 Demo 对应你最开始贴的高级 AI Native 简历：
> 基于 Claude Code Hooks 实现提交前 Lint / 危险操作拦截 / 格式规范门禁，将质量闸嵌入 AI 编程流程
这是 AI Native 团队和普通“会调用大模型”的最大区别之一。
---
项目结构：
```text id="x33617"
ai-native-demo-08-ai-coding-harness
├── README.md
├── 实操手册.md
│
├── docs
│   └── harness-design.md
│
└── harness
    ├── package.json
    └── src
        └── index.ts
```
---
## 本 Demo 解决什么问题？
现在 AI 写代码：
```text id="dqcw7q"
用户需求
↓
AI生成代码
↓
提交
```
问题：
AI 可能生成：
```ts id="7dzrqu"
console.log()
any
危险命令
错误API
```
所以企业需要：
```text id="tp0joy"
AI生成代码
↓
Harness质量闸门
↓
验证
↓
允许提交
```
---
## 核心思想
### AI负责生成
例如：
```text id="kc4i16"
帮我实现用户登录
```
AI：
生成：
```tsx id="k1um0n"
Login.tsx
auth.ts
service.ts
```
---
### Harness负责验证
检查：
#### 代码规范
例如：
禁止：
```ts id="krgaps"
any
```
---
#### 安全
禁止：
```bash id="roimm7"
rm -rf
```
---
#### 质量
检查：
- lint
- typecheck
- test
---
## 本 Demo 模拟流程
运行：
```bash id="8yjpd9"
cd harness
pnpm install
pnpm dev
```
执行：
```text id="lmg7ws"
AI生成代码
↓
Lint检查
↓
Security检查
↓
Test检查
↓
输出结果
```
---
## 对应真实 Claude Code Hooks
真实场景：
```text id="a1h6tc"
Claude Code
↓
写代码
↓
Hook触发
↓
eslint
↓
typescript check
↓
unit test
↓
security scan
↓
git commit
```
---
## 为什么 AI Native 需要 Harness？
传统开发：
```text id="vh51c2"
人写代码
↓
Code Review
↓
测试
```
AI时代：
变成：
```text id="bkkozr"
AI写代码
↓
自动验证
↓
自动修复
↓
人工确认
```
所以未来研发体系：
不是：
> AI替代程序员
而是：
> 程序员管理 AI Agent，通过工程体系保证 AI 输出质量。
---
## 这个 Demo 对应能力：
你已经覆盖：
```text id="fogyuk"
Demo01
LLM应用基础
↓
Demo02
Tool Calling
↓
Demo03
RAG
↓
Demo04
Context Engineering
↓
Demo05
Workflow
↓
Demo06
Multi-Agent
↓
Demo07
MCP
↓
Demo08
AI Harness
```
到这里已经覆盖了那份简历中：
- Agent工程
- MCP
- Context Engineering
- AI研发流程工程化
---
下一步：
## Demo 09：Agent Observability（AI Agent 可观测性）
这个会结合你之前研究的：
- Sentry
- Grafana
- Trace
- Token统计
- 飞书告警
实现：
```text id="hy7dd2"
用户请求
↓
Agent
↓
LLM调用
↓
Tool调用
↓
结果
↓
Trace记录
Dashboard展示
```
重点：
- 为什么 AI Agent 必须可观测
- Prompt Trace
- Token Cost
- Latency
- Tool调用链
- Error分析
这个也是 AI 平台岗位非常看重的能力。
好，继续
Demo 09 已生成。
## Demo 09：Agent Observability（AI Agent 可观测性）
下载：
[下载 ai-native-demo-09-agent-observability.zip](sandbox:/mnt/data/ai-native-demo-09-agent-observability.zip)
---
这个 Demo 对应你之前研究过的：
- Sentry
- Grafana
- Trace
- Token成本
- AI Agent监控
- 飞书告警
也是 AI 平台岗位非常看重的能力。
---
项目结构：
```text id="vzkqt1"
ai-native-demo-09-agent-observability
├── README.md
├── 实操手册.md
│
├── docs
│   └── trace-design.md
│
└── observability
    ├── package.json
    └── src
        └── index.ts
```
---
## 为什么 AI Agent 必须可观测？
普通接口：
```text id="75r57i"
用户
↓
API
↓
数据库
↓
返回
```
监控：
- QPS
- CPU
- 内存
- 错误率
- 延迟
---
但是 Agent：
一次请求：
```text id="snk1td"
用户：
帮我修复登录问题
↓
Planner Agent
↓
LLM调用
↓
MCP查询代码
↓
RAG查询文档
↓
Coder Agent
↓
Reviewer Agent
↓
最终输出
```
链路复杂很多。
如果失败：
你需要知道：
- 是 Prompt 错了？
- 模型慢？
- Tool失败？
- RAG没召回？
- Token超限？
---
## 核心概念 1：Trace
Trace就是：
记录一次 Agent 执行全过程。
例如：
```json id="gehp4w"
{
 traceId:"10001",
 steps:[
   {
    type:"llm",
    model:"qwen-plus"
   },
   {
    type:"tool",
    name:"search_code"
   }
 ]
}
```
---
类似后端链路追踪：
```text id="kl1flh"
request_id
↓
服务A
↓
服务B
↓
数据库
```
AI里面：
```text id="t6dhka"
trace_id
↓
Agent
↓
LLM
↓
Tool
↓
RAG
```
---
## 核心概念 2：Token监控
AI成本核心。
记录：
输入：
```text id="t1k66o"
prompt token
```
输出：
```text id="743wsy"
completion token
```
例如：
一次请求：
```text id="5h12ie"
输入 5000 token
输出 1000 token
```
成本：
= 6000 token费用。
---
## 核心概念 3：Latency分析
需要知道：
一次回答慢在哪里。
例如：
```text id="i0z189"
总耗时 8秒
LLM:
5秒
RAG:
2秒
Tool:
1秒
```
优化方向：
很明确。
---
## 核心概念 4：Tool调用记录
例如：
Agent调用 MCP：
```text id="v9ymac"
search_code()
参数:
login
耗时:
300ms
结果:
10个文件
```
如果失败：
可以直接定位。
---
## 企业真实架构
生产环境通常：
```text id="yt64x2"
                 Agent
                   |
            OpenTelemetry
                   |
        --------------------
        Trace Storage
        Metrics
        Logs
        --------------------
                   |
             Dashboard
                   |
          Grafana / Langfuse
```
---
## 这个 Demo 当前实现
模拟：
```text id="n3r16p"
Agent执行
↓
记录LLM调用
↓
记录Tool调用
↓
生成Trace
```
后面可以升级：
### Demo 09-B 企业级 AI Observability
增加：
- OpenTelemetry
- Langfuse
- Prometheus
- Grafana
- Sentry
- 飞书告警
- Agent质量评分
---
目前完整能力链：
```text id="olw05w"
Demo01
LLM Streaming
↓
Demo02
Tool Calling
↓
Demo03
RAG
↓
Demo04
Context Engineering
↓
Demo05
Workflow
↓
Demo06
Multi-Agent
↓
Demo07
MCP
↓
Demo08
AI Harness
↓
Demo09
Agent Observability
```
下一步：
## Demo 10：AI Native Dev Platform（综合项目）
会把前面所有能力组合起来：
```text id="xzpq88"
用户需求
↓
AI Console
↓
Supervisor Agent
↓
Multi-Agent
↓
MCP工具
↓
RAG知识库
↓
代码生成
↓
Harness质量门禁
↓
Trace监控
↓
部署
```
最终就是接近你目标岗位：
**AI Native 架构师 / AI Engineering Lead 的作品级项目。**
demo09在现有初级实现，额外增加这个目录补充企业级的部分:OpenTelemetry
Langfuse
Prometheus
Grafana
Sentry
飞书告警
Agent质量评分。并且放在同一个zip包里面，要求注释详细和通俗易懂
Demo 09 已升级为 **企业级 Agent Observability 版本**。
下载：
[下载 ai-native-demo-09-enterprise-observability.zip](sandbox:/mnt/data/ai-native-demo-09-enterprise-observability.zip)
---
这次不是替换原来的 Demo 09，而是在同一个项目里面增加企业增强部分。
目录：
```text id="e6ygod"
ai-native-demo-09-enterprise-observability
├── README.md
│
├── 03-basic-observability
│   （保留原来的基础Trace实现）
│
└── 04-enterprise-observability
    ├── 实操手册.md
    │
    ├── opentelemetry
    │   └── trace-demo.ts
    │
    ├── langfuse
    │   └── langfuse-demo.ts
    │
    ├── prometheus-grafana
    │   └── metrics.ts
    │
    ├── sentry-feishu-alert
    │   └── alert-flow.ts
    │
    └── agent-evaluation
        └── eval.ts
```
---
## 新增内容说明
### 1. OpenTelemetry
解决：
> Agent一次执行到底经过哪些步骤？
生产：
```text id="ax7qxk"
用户请求
↓
Supervisor
↓
LLM
↓
MCP Tool
↓
RAG
↓
Response
```
OpenTelemetry记录：
```text id="kuhi1z"
Trace
 ├── Agent Span
 ├── LLM Span
 ├── Tool Span
 └── RAG Span
```
你后面可以接：
- Jaeger
- Tempo
- Grafana
---
## 2. Langfuse
解决：
> LLM调用质量和成本怎么看？
记录：
```text id="yzga0i"
Prompt
↓
Model
↓
Response
↓
Token
↓
Cost
```
例如：
发现：
某个 Prompt 修改后：
``` id="70wvie"
回答准确率下降20%
```
可以通过 Langfuse 对比。
---
## 3. Prometheus + Grafana
解决：
> Agent运行是否健康？
指标：
```text id="l6j69v"
agent_request_total
agent_error_total
llm_latency
token_usage
```
Dashboard：
例如：
### Agent健康
``` id="36x4mo"
QPS
P95
错误率
```
### AI成本
``` id="9qyrj3"
每日Token
模型费用
```
### Tool
``` id="6xrzc3"
调用次数
失败率
```
---
## 4. Sentry + 飞书告警
结合你之前做过的：
Sentry → 飞书卡片
流程：
```text id="30lfzx"
Agent异常
↓
Sentry
↓
Webhook
↓
飞书机器人
↓
研发处理
```
例如：
严重：
``` id="rikajf"
MCP Server不可用
```
立即通知。
---
## 5. Agent质量评分
这是 AI 系统和普通系统最大的区别。
传统：
只看：
```text id="60go70"
接口成功率
```
AI：
还要看：
---
### Faithfulness
是否基于资料回答。
例如：
RAG资料：
``` id="s0lehe"
支付需要幂等
```
AI回答：
``` id="i4ffup"
支付无需幂等
```
失败。
---
### Relevance
是否回答用户问题。
用户：
``` id="jrb8ct"
如何退款？
```
AI：
讲登录流程。
失败。
---
### Tool Accuracy
Agent有没有选择正确工具。
例如：
查询订单：
应该：
``` id="y2qpux"
order_search()
```
结果调用：
``` id="pc0m1j"
weather()
```
失败。
---
### 综合评分
例如：
```ts id="zic24y"
score=
faithfulness
+
relevance
+
toolAccuracy
+
userFeedback
```
---
## 现在你的 AI Native 能力链已经非常完整：
```text id="s96nyi"
Demo01
LLM Streaming
↓
Demo02
Tool Calling
↓
Demo03
RAG
↓
Demo04
Context Engineering
↓
Demo05
Agent Workflow
↓
Demo06
Multi-Agent
↓
Demo07
MCP Server
↓
Demo08
AI Coding Harness
↓
Demo09
Enterprise Observability
```
这套已经覆盖：
- AI Agent工程
- MCP
- RAG
- Context Engineering
- Multi-Agent
- AI研发流程
- AI稳定性体系
下一步就是最后的大项目：
## Demo 10：AI Native Dev Platform（综合实战）
会把前面全部组合：
```text id="m4622f"
                 React AI Console
                       |
              Supervisor Agent
                       |
        --------------------------------
        Planner    Coder    Reviewer
        --------------------------------
                       |
                    MCP
        --------------------------------
        Git   Feishu   Sentry   Figma
                       |
                    RAG KB
                       |
                Harness Quality Gate
                       |
              Observability Platform
                       |
                    Grafana
```
这个 Demo 做完，就是一份接近 **AI Native 架构师级别的作品集项目**。
继续，demo10,要求有详细注释和完整的架构说明和图片说明放在readme，然后要有实操，可以运行，可以使用monorepo架构组织代码
Demo 10 已生成。
这是前面 01～09 的综合项目：
## Demo 10：AI Native Dev Platform（AI 原生研发平台）
下载：
[下载 ai-native-demo-10-ai-native-dev-platform.zip](sandbox:/mnt/data/ai-native-demo-10-ai-native-dev-platform.zip)
---
这次按照你的要求：
✅ Monorepo 架构
✅ 完整 README 架构说明
✅ 架构图（Markdown 图片式流程图）
✅ 实操文档
✅ 可运行代码骨架
✅ 详细代码注释
✅ 对应企业 AI Native 岗位能力模型
---
### 项目结构
```text id="ai6bm6"
ai-native-demo-10-ai-native-dev-platform
├── README.md                 # 总架构说明 + 图解
├── docs
│   └── architecture.md
│
├── apps
│   |
│   ├── web                    # React AI Console
│   |
│   └── api                    # Node API Gateway
│
├── packages
│   |
│   ├── agent-core             # Agent运行时
│   |
│   ├── mcp-client             # MCP调用层
│   |
│   ├── rag                    # 企业知识库
│   |
│   ├── harness                # AI代码质量门禁
│   |
│   └── observability          # Trace/监控
│
├── package.json
└── pnpm-workspace.yaml
```
---
## 整体架构
README里面已经加入：
```text id="2zrf96"
                         用户
                          |
                    React AI Console
                          |
                     API Gateway
                          |
                Agent Orchestrator
                          |
        --------------------------------
        Planner     Coder     Reviewer
                          |
              Context Engineering
                          |
 ------------------------------------------------
 RAG          MCP Client       Harness     Trace
 |              |                |           |
知识库        外部工具        质量检查     监控
               |
      --------------------
      Git
      飞书
      Sentry
      Figma
      --------------------
```
---
## 这个项目模拟什么？
模拟一个：
> 企业内部 AI 软件研发平台
类似：
- Claude Code 企业版
- Cursor Team
- 字节 Coze Coding
- 阿里云 AI Coding Platform
---
## 用户体验流程
例如：
用户输入：
``` id="5ibcil"
实现订单查询功能
```
系统：
---
### 1. Planner Agent
拆任务：
``` id="3w7oqy"
前端页面
接口
数据库
测试
```
---
### 2. Context Engineering
自动加载：
``` id="tnmyrc"
项目规范
接口文档
代码规范
产品资料
```
---
### 3. MCP
查询：
``` id="mxib1i"
已有代码
Git历史
飞书需求
```
---
### 4. RAG
查询：
``` id="rxzp4j"
订单业务规则
技术规范
历史方案
```
---
### 5. Coder Agent
生成代码。
---
### 6. Harness
检查：
``` id="a0wj01"
eslint
typescript
security
test
```
---
### 7. Reviewer Agent
Review。
---
### 8. Observability
记录：
``` id="9ujc3b"
Token
Latency
Trace
Cost
Quality
```
---
## Monorepo 为什么这么设计？
这是 AI Native 项目的典型方式。
以前：
```text id="i17klw"
frontend repo
backend repo
agent repo
rag repo
```
AI 很难理解完整上下文。
Monorepo：
```text id="3u3wvi"
一个仓库
↓
AI可以看到：
业务
代码
工具
规范
部署
```
更适合：
Agent Coding。
---
## 每个 Package 对应前面 Demo
对应关系：
| Package | 来源 Demo |
|-|-|
| agent-core | Demo05 Workflow |
| 多 Agent | Demo06 |
| mcp-client | Demo07 |
| harness | Demo08 |
| observability | Demo09 |
| rag | Demo03 |
| context | Demo04 |
---
## 当前版本定位
这个 Demo 是：
**架构版 MVP**
重点是：
理解企业 AI 平台怎么组合。
下一阶段可以继续升级：
### Demo 10-B：生产增强版
增加：
#### 1. LangGraph.js
替换手写 Agent Flow：
``` id="qe7ipg"
Node
+
Edge
+
State
```
---
#### 2. PostgreSQL + pgvector
真正 RAG：
``` id="5jiz28"
文档
↓
Embedding
↓
pgvector
↓
Rerank
↓
LLM
```
---
#### 3. MCP 官方 SDK
真正 MCP Server：
``` id="0mgzel"
stdio transport
HTTP transport
Tool schema
Permission
```
---
#### 4. Docker Compose
一键启动：
``` id="p6xo1w"
web
api
postgres
redis
vector db
grafana
prometheus
```
---
#### 5. GitHub Actions
实现：
``` id="erbctl"
AI生成代码
↓
Harness
↓
Test
↓
Build
↓
Deploy
```
---
到 Demo 10 完成，你已经覆盖那份高级 AI Native 简历的全部主线：
``` id="nere1o"
AI Agent工程
        |
Multi Agent
        |
MCP
        |
RAG
        |
Context Engineering
        |
AI Coding Harness
        |
Observability
        |
AI Dev Platform
```
下一步最有价值的是做 **Demo 10-B 生产增强版**，把这个骨架真正跑成一个类似企业内部 AI Coding Agent 的系统。
---
继续做一个有价值的Demo 10-B 生产增强版
Demo 10-B 生产增强版已经完成，并重新做了一轮生产化修正。
[下载 Demo 10-B：AI Native Dev Platform 生产增强版](sandbox:/mnt/data/ai-native-demo-10B-production.zip)
这个版本不是单纯骨架，而是一个 64 文件的 Monorepo，包含 React Web、Node API、真实 LangGraph `StateGraph` 编排、Frontend/Backend/QA fan-out + Reviewer fan-in、真实 MCP TypeScript SDK v2 stdio Client/Server、bge-m3 + pgvector RAG、Harness 质量门禁、OpenTelemetry、Langfuse、Prometheus、Grafana、Sentry、飞书告警和 Agent 质量评分。
README 里已经放入两张实际 SVG 架构图，以及完整目录、请求链路、Mock/Production 两种运行方式和面试讲解。`docs/` 另外有 7 份逐步教程，你可以按顺序实操。
默认：
```env id="ewfy3l"
MOCK_MODE=true
```
因此第一次**不需要任何模型 Key**，就能跑：
```text id="3pizus"
需求
 ↓
RAG Context
 ↓
MCP Context
 ↓
Planner
 ↓
┌─────────────┐
Frontend
Backend       ← 真正并行 fan-out
QA
└─────────────┘
 ↓
Reviewer      ← fan-in
 ↓
Harness
 ↓
Quality Evaluation
 ↓
Result
```
之后再把：
```env id="vtik2l"
MOCK_MODE=false
```
接上你的 Qwen/OpenAI-Compatible 模型，以及：
```text id="1iexv3"
Ollama bge-m3
+
PostgreSQL
+
pgvector
```
就能练真实 RAG。
这次 MCP 使用的是当前稳定的 TypeScript SDK v2，官方已经将 `@modelcontextprotocol/server` 2.0.0 作为 stable line；LangGraph 当前 npm 稳定版为 1.4.12，并原生支持通过多条 edge 实现并行节点和 reducer 聚合。
可观测性部分也按当前技术线更新了：Langfuse JS/TS v5 建立在 OpenTelemetry 上，我还专门处理了 v5 默认 smart span filtering，确保这个 Demo 的 `agent.*` Span 能完整出现在 Langfuse Trace 里。
另外把 Sentry 初始化调整到了业务模块加载之前，这符合当前 Node SDK 推荐方式。
有一点需要说明：我已经做了目录、路径、Monorepo 依赖关系和配置检查，但当前生成环境无法连接 npm registry，因此无法在这里真正执行一次 `pnpm install` 做最终依赖安装测试。你本机首次运行时，建议严格从 README 的 **Mock 模式**开始；如果遇到任何安装或 TypeScript 报错，把终端错误发给我，我可以直接基于这个 Demo 10-B 继续修到完全跑通。
