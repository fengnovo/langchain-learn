import { ChatOpenAI } from "@langchain/openai";
import dotenv from "dotenv";
dotenv.config();
/**
 * 所有Agent节点共享同一个模型实例
 * 企业项目中一般不会每个节点new一个模型
 */
export const llm = new ChatOpenAI({
    model: process.env.MODEL,
    apiKey: process.env.OPENAI_API_KEY,
    configuration:{
        baseURL:process.env.OPENAI_BASE_URL
    },
    temperature:0.2
});