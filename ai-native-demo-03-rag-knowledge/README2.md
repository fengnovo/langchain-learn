# AI Native Demo 03：RAG 基础版 + 企业级RAG升级版
本 Demo 分两个阶段：
## 03-A 基础RAG
目标：
理解 RAG 最核心原理：
文档 → Chunk → Embedding → 检索 → Prompt增强 → LLM回答
特点：
-   代码简单
-   不依赖数据库
-   方便理解原理
------------------------------------------------------------------------
## 03-B 企业级RAG
增加真实企业场景能力：
1.  PDF/Markdown解析
2.  Chunk策略设计
3.  qwen3.7-text-embedding Embedding
4.  PostgreSQL + pgvector
5.  TopK召回
6.  Rerank排序
7.  RAG评估
企业架构：
    文档
     ↓
    Parser
     ↓
    Chunk
     ↓
    Embedding
     ↓
    pgvector
    用户问题
     ↓
    Query Embedding
     ↓
    TopK召回
     ↓
    Rerank
     ↓
    Context
     ↓
    LLM
     ↓
    答案
学习目标：
从会调用RAG升级到理解企业RAG系统设计。
