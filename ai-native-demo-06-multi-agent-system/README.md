# AI Native Demo 06：Multi-Agent System 多智能体系统
目标：
从单 Workflow 升级到真正多智能体协作。
学习：
-   Supervisor Agent
-   Sub Agent
-   Agent角色分工
-   fan-out并行思想
-   fan-in结果聚合
-   Agent通信协议
-   主从上下文传递
模拟：
一个AI研发团队：
    Supervisor
        |
        |
     ----------------------
     Frontend Agent
     Backend Agent
     QA Agent
     ----------------------
        |
     Reviewer Agent
对应企业AI开发场景：
需求输入
↓
任务拆分
↓
多个Agent执行
↓
结果合并
↓
质量检查
