# 05 Harness 质量门禁
Agent 生成代码不是终点。
生产系统要把：
```text
Generate
```
变成：
```text
Generate
→ Validate
→ Fix
→ Validate
→ Approve
```
---
## Demo 中的 Gate
检查：
1. 是否出现高风险命令。
2. 是否疑似暴露 secret。
3. 是否出现明显 `any`。
4. Agent 是否产出了 FE / BE / QA 三类结果。
---
## 为什么不直接执行任意 shell？
AI Coding Agent 最危险的设计之一：
```ts
exec(userOrModelGeneratedCommand)
```
Demo 里的 `runSafeCommand` 使用：
- command allowlist
- 参数数组
- `execFile`
- 不经过 shell
这比：
```ts
exec("pnpm " + modelOutput)
```
安全得多。
---
## 真正生产 Gate
可以继续加入：
```text
eslint
tsc --noEmit
vitest
playwright
dependency audit
secret scanner
SAST
license check
```
关键思想：
> 模型负责“提出修改”，程序负责“验证修改”。
