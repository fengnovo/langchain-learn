export type AgentArtifact = {
  role: "frontend" | "backend" | "qa";
  title: string;
  content: string;
};
export type HarnessResult = {
  passed: boolean;
  checks: Array<{
    name: string;
    passed: boolean;
    message: string;
  }>;
};
export type QualityResult = {
  score: number;
  contextCoverage: number;
  artifactCoverage: number;
  reviewPassed: number;
  harnessPassed: number;
};
export type AgentRunResult = {
  requirement: string;
  ragContext: string[];
  mcpContext: string[];
  plan: string;
  artifacts: AgentArtifact[];
  review: string;
  harness: HarnessResult;
  quality: QualityResult;
};
