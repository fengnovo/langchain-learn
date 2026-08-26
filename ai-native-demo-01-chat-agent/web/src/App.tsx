import { useState } from "react";
type Message = {
  role: "user" | "assistant";
  content: string;
};
export default function App() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  async function send() {
    const content = input.trim();
    // 忽略空消息，并防止流式响应期间重复提交。
    if (!content || loading) return;
    const userMessage: Message = {
      role: "user",
      content
    };
    // 固定本次请求的对话快照，避免后续状态更新影响请求内容。
    const requestMessages = [...messages, userMessage];
    // 先创建 assistant 占位，后续 token 始终更新这一条消息。
    setMessages([
      ...requestMessages,
      { role: "assistant", content: "" }
    ]);
    setInput("");
    setError("");
    setLoading(true);
    try {
      const response = await fetch("http://localhost:3000/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ messages: requestMessages })
      });
      if (!response.ok) {
        const detail = await response.text();
        throw new Error(detail || `请求失败：HTTP ${response.status}`);
      }
      if (!response.body) throw new Error("服务器没有返回响应流");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      // 网络分块不一定与 SSE 事件边界一致，因此需要缓存半包数据。
      let buffer = "";
      let aiText = "";
      let finished = false;
      while (!finished) {
        const { done, value } = await reader.read();
        if (value) buffer += decoder.decode(value, { stream: !done });
        if (done) buffer += decoder.decode();
        // SSE 使用空行分隔事件，只处理已经完整接收的事件。
        const events = buffer.split(/\r?\n\r?\n/);
        buffer = events.pop() ?? "";
        // 流结束时把最后一个没有分隔符的事件也纳入处理。
        if (done && buffer) {
          events.push(buffer);
          buffer = "";
        }
        for (const event of events) {
          const data = event
            .split(/\r?\n/)
            .filter((line) => line.startsWith("data:"))
            .map((line) => line.slice(5).trimStart())
            .join("\n");
          if (!data) continue;
          if (data === "[DONE]") {
            finished = true;
            break;
          }
          const token = JSON.parse(data) as string;
          aiText += token;
          // 替换最后一条 assistant 占位，避免重复插入用户消息。
          setMessages((current) => [
            ...current.slice(0, -1),
            { role: "assistant", content: aiText }
          ]);
        }
        if (done) break;
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
      // 请求在首个 token 前失败时，移除空的 assistant 占位消息。
      setMessages((current) => {
        const last = current[current.length - 1];
        return last?.role === "assistant" && !last.content
          ? current.slice(0, -1)
          : current;
      });
    } finally {
      setLoading(false);
    }
  }
  return (
    <div>
      <h1>AI Native Chat Demo</h1>
      {messages.map((message, index) => (
        <div key={index}>
          <b>{message.role}</b>: {message.content}
        </div>
      ))}
      {error && <p role="alert">请求失败：{error}</p>}
      <input
        value={input}
        disabled={loading}
        onChange={(event) => setInput(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") void send();
        }}
      />
      <button disabled={loading || !input.trim()} onClick={send}>
        {loading ? "生成中..." : "发送"}
      </button>
    </div>
  );
}
