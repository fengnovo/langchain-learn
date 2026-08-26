import { StateGraph, START, END } from "@langchain/langgraph";
import { AgentState } from "./state.js";
import { planner } from "./nodes/planner.js";
import { toolSelector } from "./nodes/toolSelector.js";
import { executor } from "./nodes/executor.js";
import { summarize } from "./nodes/summarize.js";
const graph = new StateGraph(AgentState)
  //节点注册
  .addNode("planner", planner)
  .addNode("toolSelector", toolSelector)
  .addNode("executor", executor)
  .addNode("summarize", summarize)
  //流程
  .addEdge(START, "planner")
  .addEdge("planner", "toolSelector")
  .addEdge("toolSelector", "executor")
  .addEdge("executor", "summarize")
  .addEdge("summarize", END);
export const agentGraph = graph.compile();
