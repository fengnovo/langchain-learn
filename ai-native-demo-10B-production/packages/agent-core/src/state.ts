import {
  ReducedValue,
  StateSchema
} from "@langchain/langgraph";
import * as z from "zod/v4";
const ArtifactSchema = z.object({
  role: z.enum(["frontend", "backend", "qa"]),
  title: z.string(),
  content: z.string()
});
const HarnessSchema = z.object({
  passed: z.boolean(),
  checks: z.array(
    z.object({
      name: z.string(),
      passed: z.boolean(),
      message: z.string()
    })
  )
});
const QualitySchema = z.object({
  score: z.number(),
  contextCoverage: z.number(),
  artifactCoverage: z.number(),
  reviewPassed: z.number(),
  harnessPassed: z.number()
});
/**
 * LangGraph 全局状态。
 * artifacts 最特殊：
 * Frontend / Backend / QA 会并行写它。
 * 所以必须使用 ReducedValue 做 reducer，否则会发生并发更新冲突。
 */
export const DevState = new StateSchema({
  requirement: z.string(),
  ragContext: z.array(z.string()).default(() => []),
  mcpContext: z.array(z.string()).default(() => []),
  plan: z.string().default(""),
  artifacts: new ReducedValue(
    z.array(ArtifactSchema).default(() => []),
    {
      inputSchema: z.array(ArtifactSchema),
      reducer: (existing, update) => existing.concat(update)
    }
  ),
  review: z.string().default(""),
  harness: HarnessSchema.optional(),
  quality: QualitySchema.optional()
});
