# AI Coding Harness设计
## 核心原则
AI负责生成。
Harness负责验证。
不要完全信任模型。
## Quality Gate
包含：
1.  Code Style
2.  Type Safety
3.  Security
4.  Test
## 流程
    Generate
    ↓
    Validate
    ↓
    Fix
    ↓
    Validate
    ↓
    Commit
