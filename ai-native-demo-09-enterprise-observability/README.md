# AI Native Demo 09：Agent Observability 企业增强版
本版本保留：
03-basic-observability
用于理解：
-   Trace
-   Token
-   Tool调用
新增：
04-enterprise-observability
模拟企业AI平台可观测体系：
1.  OpenTelemetry
2.  Langfuse
3.  Prometheus
4.  Grafana
5.  Sentry
6.  飞书告警
7.  Agent质量评分
最终架构：
    用户请求
     ↓
    Agent Runtime
     ↓
    --------------------------------
    OpenTelemetry Trace
    Langfuse Prompt Trace
    Prometheus Metrics
    Sentry Error
    Quality Evaluation
    --------------------------------
     ↓
    Grafana Dashboard
     ↓
    飞书告警
目标：
从"知道Agent运行"
升级到：
"能够运营生产级Agent系统"。
