import express from "express";
import dotenv from "dotenv";
import { agentGraph } from "./agent/graph.js";
dotenv.config();
const app = express();
app.use(express.json());
app.post("/chat", async (req, res) => {
  const question = req.body.question;
  const result = await agentGraph.invoke({ question });
  res.json({
    answer: result.answer,
    plan: result.plan,
    tool: result.selectedTool,
  });
});
app.listen(3001, () => {
  console.log("Agent server running http://localhost:3001");
});
