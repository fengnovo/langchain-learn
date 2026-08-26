/**
 * Sentry + 飞书告警流程
 * Agent异常：
 * Sentry捕获
 * ↓
 * Webhook
 * ↓
 * 飞书机器人
 * ↓
 * 通知研发
 */
const error={
 type:"MCP_TIMEOUT",
 level:"critical"
};
console.log(
 "send feishu alert",
 error
);
