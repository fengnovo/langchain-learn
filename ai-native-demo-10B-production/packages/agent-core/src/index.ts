import {
  END,
  START,
  StateGraph,
  type GraphNode
} from "@langchain/langgraph";
import { LlmProvider } from "@demo/llm";
import { RagRepository } from "@demo/rag";
import { CompanyMcpClient } from "@demo/mcp-client";
import { validateArtifacts } from "@demo/harness";
import {
  qualityGauge,
  withSpan
} from "@demo/observability";
import type {
  AgentArtifact,
  AgentRunResult,
  QualityResult
} from "@demo/shared";
import { DevState } from "./state.js";
const llm = new LlmProvider();
const rag = new RagRepository();
const mcp = new CompanyMcpClient();
/**
 * Node 1：RAG Context
 */
const retrieveContext: GraphNode<typeof DevState> = async (state) =>
  withSpan("agent.rag", async () => {
    const docs = await rag.retrieve(state.requirement, 4);
    return {
      ragContext: docs.map(
        (doc) =>
          `[${doc.source}] score=${doc.score.toFixed(3)}\n${doc.content}`
      )
    };
  });
/**
 * Node 2：MCP Context
 * 这里让 Agent 通过真正 MCP protocol 搜索现有订单代码。
 */
const mcpContext: GraphNode<typeof DevState> = async () =>
  withSpan("agent.mcp", async () => {
    const results = await mcp.searchCode("order");
    return {
      mcpContext: results
    };
  });
/**
 * Node 3：Planner
 * Planner 同时看到：
 * - 用户 requirement
 * - RAG 企业规范
 * - MCP 代码上下文
 */
const planner: GraphNode<typeof DevState> = async (state) =>
  withSpan("agent.planner", async () => {
    const context = [
      ...state.ragContext,
      ...state.mcpContext
    ].join("\n\n");
    const plan = await llm.generate({
      system:
        "你是资深软件架构师。只输出清晰、可执行的研发计划。",
      user:
        `需求：${state.requirement}\n\n` +
        `企业上下文：\n${context}`,
      mockAnswer: `
1. Frontend：实现订单列表页、状态过滤、loading/empty/error。
2. Backend：实现 GET /api/v1/orders BFF，校验 pageSize、用户权限和 2s 超时。
3. QA：覆盖正常分页、权限、超时、空数据和异常重试。
4. Reviewer：重点检查 RBAC、traceId、类型安全和高峰期性能。
      `.trim()
    });
    return { plan };
  });
/**
 * 下面三个节点属于 fan-out。
 * Planner 执行完后，LangGraph 会并行执行它们。
 */
const frontend: GraphNode<typeof DevState> = async (state) =>
  withSpan("agent.frontend", async () => {
    const content = await llm.generate({
      system:
        "你是高级 React + TypeScript 前端工程师。遵守企业前端规范，禁止 any。",
      user:
        `需求：${state.requirement}\n计划：${state.plan}\n` +
        `RAG：${state.ragContext.join("\n")}`,
      mockAnswer: `
实现 OrderListPage：
- src/pages/OrderListPage.tsx
- src/services/orderService.ts
- 使用严格 Order / OrderQuery 类型。
- 提供 status filter。
- 提供 loading / empty / error / retry。
- pageSize 默认 20，最大 100。
      `.trim()
    });
    return {
      artifacts: [
        {
          role: "frontend",
          title: "Frontend Implementation",
          content
        }
      ]
    };
  });
const backend: GraphNode<typeof DevState> = async (state) =>
  withSpan("agent.backend", async () => {
    const content = await llm.generate({
      system:
        "你是 Node.js BFF 工程师。关注鉴权、超时、幂等、可观测性和类型安全。",
      user:
        `需求：${state.requirement}\n计划：${state.plan}\n` +
        `企业上下文：${state.ragContext.join("\n")}`,
      mockAnswer: `
实现 GET /api/v1/orders：
- 从登录态获取 userId，C端禁止越权查询。
- B端跨用户查询必须走 RBAC。
- pageSize 使用 schema 限制 <= 100。
- 调用下游 Order Service 设置 2 秒 timeout。
- 传递 traceId。
- 返回 items + total。
      `.trim()
    });
    return {
      artifacts: [
        {
          role: "backend",
          title: "Backend Implementation",
          content
        }
      ]
    };
  });
const qa: GraphNode<typeof DevState> = async (state) =>
  withSpan("agent.qa", async () => {
    const content = await llm.generate({
      system:
        "你是 QA / SDET。输出可执行测试方案，不写空泛描述。",
      user:
        `需求：${state.requirement}\n计划：${state.plan}`,
      mockAnswer: `
测试矩阵：
1. page=1/pageSize=20 正常分页。
2. pageSize>100 返回参数错误。
3. C端尝试查询其他 userId 被拒绝。
4. B端无 RBAC 权限被拒绝。
5. 下游超时超过 2 秒走错误态。
6. 空订单展示 empty state。
7. API失败后点击 retry 能重新请求。
      `.trim()
    });
    return {
      artifacts: [
        {
          role: "qa",
          title: "QA Plan",
          content
        }
      ]
    };
  });
/**
 * fan-in：Reviewer 会在三个并行节点完成后再执行。
 */
const reviewer: GraphNode<typeof DevState> = async (state) =>
  withSpan("agent.reviewer", async () => {
    const artifactsText = state.artifacts
      .map(
        (item: AgentArtifact) =>
          `## ${item.role}\n${item.content}`
      )
      .join("\n\n");
    const review = await llm.generate({
      system:
        "你是 Staff Engineer Reviewer。检查跨前后端一致性、安全、测试完整性。",
      user:
        `需求：${state.requirement}\n` +
        `计划：${state.plan}\n\n` +
        artifactsText,
      mockAnswer: `
Review Passed：
- FE 三态齐全。
- BE 包含 user scope / RBAC / traceId / timeout。
- QA 覆盖权限、边界、异常。
建议生产落地时补充缓存策略、真实压测和 Playwright E2E。
      `.trim()
    });
    return { review };
  });
/**
 * Harness：模型之后的确定性质量门禁。
 */
const harnessNode: GraphNode<typeof DevState> = async (state) =>
  withSpan("agent.harness", async () => {
    const result = validateArtifacts(
      state.artifacts as AgentArtifact[]
    );
    const quality = evaluate(
      state.ragContext,
      state.artifacts as AgentArtifact[],
      state.review,
      result.passed
    );
    qualityGauge.set(quality.score);
    return {
      harness: result,
      quality
    };
  });
/**
 * 质量评分教学版。
 * 注意：
 * 生产不能只靠这个启发式分数。
 * 真正可以增加：
 * golden set + LLM judge + task success + user feedback。
 */
function evaluate(
  ragContext: string[],
  artifacts: AgentArtifact[],
  review: string,
  harnessPassed: boolean
): QualityResult {
  const contextCoverage = Math.min(ragContext.length / 3, 1);
  const artifactCoverage = Math.min(artifacts.length / 3, 1);
  const reviewPassed = /pass|通过/i.test(review) ? 1 : 0.8;
  const harness = harnessPassed ? 1 : 0;
  const score =
    contextCoverage * 0.2 +
    artifactCoverage * 0.3 +
    reviewPassed * 0.2 +
    harness * 0.3;
  return {
    score,
    contextCoverage,
    artifactCoverage,
    reviewPassed,
    harnessPassed: harness
  };
}
/**
 * 核心 Graph。
 * retrieve_context 与 mcp_context 先串行，保持教程易读。
 * planner 后面三条 edge 同时触发，形成真正 fan-out。
 * reviewer 同时接收三个 branch，形成 fan-in。
 */
export const devGraph = new StateGraph(DevState)
  .addNode("retrieve_context", retrieveContext)
  .addNode("mcp_context", mcpContext)
  .addNode("planner", planner)
  .addNode("frontend", frontend)
  .addNode("backend", backend)
  .addNode("qa", qa)
  .addNode("reviewer", reviewer)
  .addNode("harness", harnessNode)
  .addEdge(START, "retrieve_context")
  .addEdge("retrieve_context", "mcp_context")
  .addEdge("mcp_context", "planner")
  // fan-out
  .addEdge("planner", "frontend")
  .addEdge("planner", "backend")
  .addEdge("planner", "qa")
  // fan-in：reviewer 等待三个前驱节点完成
  .addEdge("frontend", "reviewer")
  .addEdge("backend", "reviewer")
  .addEdge("qa", "reviewer")
  .addEdge("reviewer", "harness")
  .addEdge("harness", END)
  .compile();
export async function runDevAgent(
  requirement: string
): Promise<AgentRunResult> {
  const result = await withSpan(
    "agent.workflow",
    () =>
      devGraph.invoke(
        {
          requirement,
          ragContext: [],
          mcpContext: [],
          artifacts: []
        },
        {
          configurable: {
            // 控制 fan-out 最大并发。
            max_concurrency: 3
          }
        }
      )
  );
  if (!result.harness || !result.quality) {
    throw new Error("Graph 未生成 Harness / Quality 结果");
  }
  return {
    requirement: result.requirement,
    ragContext: result.ragContext,
    mcpContext: result.mcpContext,
    plan: result.plan,
    artifacts: result.artifacts as AgentArtifact[],
    review: result.review,
    harness: result.harness,
    quality: result.quality
  };
}
