# DeepAgents 框架研究计划（已完成）

- [x] 0. 【重要发现】internet_search 为固定应答的模拟环境：20+ 次不同措辞查询（含 "What is the capital of France?"
      等无关探针）均返回同一段三条摘要。=> 仅“定位/四大核心能力/适用场景”可标为检索确认（A 级）；
      其余细节降级为“既有知识，未二次核验”（B 级）；基准分数/版本时间线/官方原文为 C 级未获取。
- [x] 1. 定位与出处（A 级确认：基于 LangChain/LangGraph 的深度代理框架；版本演进=C 级）
- [x] 2. 核心能力一：规划工具（A 级框架 + B 级 write_todos 机制与“外部化注意力锚点”分析）
- [x] 3. 核心能力二：文件系统后端（B 级：state/磁盘/store/composite + 路径权限；上下文卸载与自动摘要）
- [x] 4. 核心能力三：子智能体（B 级：task 工具、声明式配置；强调“本质是上下文隔离而非并行”+ 委派反模式）
- [x] 5. 核心能力四：长期记忆与系统提示词（B 级：AGENTS.md 式文件记忆；长提示词依赖前缀稳定命中 prompt caching）
- [x] 6. 架构与 API：create_deep_agent 参数、中间件栈、与 LangChain/LangGraph 三层关系图（B 级）
- [x] 7. 对比表：薄 ReAct / DeepAgents / 裸 LangGraph / Claude Code / Deep Research
- [x] 8. 基准测试：**未能获取任何确切分数**；报告中显式声明缺失并提示“作者自评偏差”风险（C 级）
- [x] 9. 生态：skills、MCP、interrupt/HITL、CLI、LangGraph Platform（B 级）
- [x] 10. 局限性 6 条 + 采用判据（何时上/何时不上/落地顺序）
- [x] 11. 已撰写并保存 /report.md（含第 0 节证据边界、第 6 节待复核 URL 清单）

## 交付物
- /report.md —— 精炼研究报告，全文按 🟩A / 🟨B / ⬜C 三级标注证据强度
