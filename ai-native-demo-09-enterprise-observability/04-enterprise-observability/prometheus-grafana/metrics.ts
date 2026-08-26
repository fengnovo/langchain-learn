/**
 * Prometheus指标Demo
 * 生产中：
 * Prometheus定时抓取metrics endpoint。
 */
const metrics={
 agent_request_total:10000,
 agent_error_total:20,
 llm_latency_ms:2500,
 token_usage:300000
};
console.log(metrics);
/**
 * Grafana读取这些指标
 * 生成Dashboard。
 */
