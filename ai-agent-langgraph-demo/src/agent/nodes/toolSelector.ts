import { AgentStateType } from "../state.js";
/**
 * 根据Planner结果选择工具
 * 企业里面这里通常由LLM Function Calling完成
 */
export async function toolSelector(state: AgentStateType) {
  const plan = state.plan;
  if (plan.includes("计算")) {
    return {
      selectedTool: "calculator",
    };
  }
  if (plan.includes("天气")) {
    return {
      selectedTool: "weather",
    };
  }
  return {
    selectedTool: "none",
  };
}
