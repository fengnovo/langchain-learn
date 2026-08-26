import { llm } from "../../llm/model.js";
import { AgentStateType } from "../state.js";

export async function planner(state: AgentStateType) {
  const prompt = `
        你是任务规划Agent。
        用户问题:
        ${state.question}
        请判断：
        1.需要什么步骤
        2.是否需要调用工具
        输出简单计划。
    `;
  const result = await llm.invoke(prompt);
  return {
    plan: result.content.toString(),
  };
}
