import { llm } from "../../llm/model.js";
import { AgentStateType } from "../state.js";
export async function summarize(state: AgentStateType) {
  const prompt = `
用户问题:
${state.question}
工具结果:
${state.toolResult}
请生成最终答案。
`;
  const res = await llm.invoke(prompt);
  return {
    answer: res.content.toString(),
  };
}
