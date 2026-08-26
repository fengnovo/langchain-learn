import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";
dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());
const client = new OpenAI({
 apiKey:process.env.LLM_API_KEY,
 baseURL:process.env.LLM_BASE_URL
});
/**
 * 模拟知识库
 * 真实项目这里会替换成：
 * pgvector
 * Milvus
 * Elasticsearch
 */
const documents = [
"React Fiber 是 React 16 引入的新协调算法，用于支持可中断渲染。",
"Node.js 是基于 V8 引擎的JavaScript运行环境，适合构建高并发服务。",
"RAG通过检索外部知识增强大模型回答能力。"
];
/**
 * 简化Embedding
 * 真实项目：
文本
 |
Embedding模型
 |
向量
这里为了教学：
直接模拟。
 */
function fakeEmbedding(text:string){
 return text
  .split("")
  .map(c=>c.charCodeAt(0)%10);
}
/**
 * 简化余弦相似度
 */
function similarity(a:number[],b:number[]){
 let score=0;
 for(let i=0;i<Math.min(a.length,b.length);i++){
  score += a[i]*b[i];
 }
 return score;
}
/**
 * RAG核心流程
 */
app.post("/rag",async(req,res)=>{
 const question=req.body.question;
 const qVector =
  fakeEmbedding(question);
 const result =
  documents
   .map(doc=>({
    doc,
    score:
     similarity(
      qVector,
      fakeEmbedding(doc)
     )
   }))
   .sort(
    (a,b)=>b.score-a.score
   )[0];
 const prompt = `
你是AI助手。
参考知识：
${result.doc}
用户问题：
${question}
请回答。
`;
console.log('prompt: ', prompt)
 const answer =
  await client.chat.completions.create({
   model: 'qwen3.7-plus-2026-05-26',
   messages:[
    {
     role:"user",
     content:prompt
    }
   ]
  });

 res.json({
  answer:
   answer.choices[0].message.content,
  context:result.doc
 });
});
app.listen(3000,()=>{
 console.log(
  "RAG server running"
 );
});
