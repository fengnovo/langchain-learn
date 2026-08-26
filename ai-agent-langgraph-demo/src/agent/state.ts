import { Annotation } from "@langchain/langgraph";
/**
 * LangGraph里面所有节点共享的数据
 * 类似Redux store
 */
export const AgentState = Annotation.Root({
  /**
   * 用户原始问题
   */
  question: Annotation<string>(),
  /**
   * Planner生成的执行计划
   */
  plan: Annotation<string>(),
  /**
   * 选择哪个工具
   */
  selectedTool: Annotation<string>(),
  /**
   * 工具执行结果
   */
  toolResult: Annotation<string>(),
  /**
   * 最终回答
   */
  answer: Annotation<string>(),
});
export type AgentStateType = typeof AgentState.State;
