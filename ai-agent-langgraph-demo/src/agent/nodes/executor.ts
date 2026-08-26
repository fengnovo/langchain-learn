import { AgentStateType } from "../state.js";
import { tools } from "../../tools/index.js";
export async function executor(state: AgentStateType) {
  let result = "";
  switch (state.selectedTool) {
    case "calculator":
      result = await tools.calculator("100+200");
      break;
    case "weather":
      result = await tools.weather("深圳");
      break;
    default:
      result = "无需工具";
  }
  return {
    toolResult: result,
  };
}
