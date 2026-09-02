# demo2：多轮对话记忆（手工文件存储历史）

在**不使用 LangGraph checkpointer** 的前提下，演示如何自己保存/恢复多轮对话历史：每轮请求把完整消息链序列化写入本地 JSON，下一轮再读回来拼进 `messages`，从而让 Agent "记得"上文。

图本身与 `demo/` 中的工具循环相同（`agent ↔ tools` + `custom_calc` 工具），差异全在记忆的存取方式上。

## 内容

| 文件 | 作用 |
|---|---|
| `demo.ts` | Express 入口：GET `/llm?q=问题&userId=用户&sessionId=会话`，拼历史 → `app.invoke` → 返回最后一条消息 → 写回历史 |
| `utils/getGraph.ts` | 构建并编译带 `custom_calc` 工具的 LangGraph 图（读取根目录 `.env` 的 `OPENAI_*` + `MODEL`） |
| `utils/chat.ts` | 历史读写：`getUserHistory` / `writeUserHistory`，把消息序列化（`mapChatMessagesToStoredMessages`）到 `chat/{userId}.json` |
| `utils/tool.ts` | `custom_calc` 工具定义 |
| `chat/001.json`、`002.json` | 历史存储样例 |

> 思路对比：这里是在**图外**自己管理记忆（每轮请求手动拼 `messages`）。下一节的 demo3 则把记忆交给 LangGraph 的 checkpointer 在**图内**管理。

## 运行

先确保根目录 `.env` 已配置，然后在项目根目录执行：

```bash
pnpm exec tsx demo2/demo.ts
```

启动后访问（`http://localhost:3002`）：

```
# 同一个 userId + sessionId 连续提问，Agent 会"记得"之前的对话
curl "http://localhost:3002/llm?q=我叫小明&userId=001&sessionId=a"
curl "http://localhost:3002/llm?q=我叫什么名字&userId=001&sessionId=a"
```

第二条问题能答出"小明"，说明历史已通过 `chat/001.json` 恢复。更换 `userId` 或 `sessionId` 即可开启独立的新会话。

## 局限性

- 历史文件由业务代码手工读写，逻辑散落在 handler 里，且要自己保证文件结构正确；
- 没有版本化 checkpoint，中途崩溃可能丢失状态。

这正是引入 **checkpointer**（见 [`demo3/`](../demo3/)）要解决的问题。
