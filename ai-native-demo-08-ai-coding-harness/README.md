# AI Native Demo 08：AI Coding Harness
目标：
理解企业如何把 AI 编程接入研发流程。
学习：
-   AI Coding Harness
-   Git Hooks
-   Pre Commit质量门禁
-   Lint检查
-   危险操作拦截
-   自动测试
-   AI生成代码验证
架构：
    AI Agent
        |
    生成代码
        |
    Harness
        |
    ------------------
    Lint
    Security Check
    Test
    Format Check
    ------------------
        |
    Git Commit
对应企业AI研发体系：
AI不是直接修改代码。
而是：
AI + 工程质量控制。
