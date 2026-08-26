# Agent Trace设计
## Trace结构
``` json
{
 traceId:"001",
 userInput:"",
 steps:[
  {
   type:"llm",
   model:"qwen",
   tokens:1000
  },
  {
   type:"tool",
   name:"search_code"
  }
 ]
}
```
## 价值
1.  Debug
2.  成本分析
3.  质量评估
4.  性能优化
