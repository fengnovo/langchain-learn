import { useEffect, useRef, useState } from "react";
import Markdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";
import "./ChatApp.css";
type Message = {
  role: "user" | "assistant";
  content: string;
};
export default function App() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const messageListRef = useRef<HTMLElement>(null);
  const shouldAutoScrollRef = useRef(true);
  const isComposingRef = useRef(false);
  // 消息更新后，仅在用户原本位于底部时继续跟随最新内容。
  useEffect(() => {
    const messageList = messageListRef.current;
    if (!messageList || !shouldAutoScrollRef.current) return;
    const frame = requestAnimationFrame(() => {
      messageList.scrollTop = messageList.scrollHeight;
    });
    return () => cancelAnimationFrame(frame);
  }, [messages]);
  function handleMessageScroll() {
    const messageList = messageListRef.current;
    if (!messageList) return;
    // 允许少量像素误差，避免缩放或小数滚动值导致底部判断失效。
    const distanceToBottom =
      messageList.scrollHeight - messageList.scrollTop - messageList.clientHeight;
    shouldAutoScrollRef.current = distanceToBottom <= 24;
  }
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
    <div className="chat-page">
      <main className="chat-panel">
        <section
          className="message-list"
          aria-live="polite"
          ref={messageListRef}
          onScroll={handleMessageScroll}
        >
          {messages.length === 0 && (
            <div className="empty-state">发送一条消息开始对话</div>
          )}
          {messages.map((message, index) => {
            const isUser = message.role === "user";
            return (
              <article
                className={`message-row ${isUser ? "message-row-user" : "message-row-ai"}`}
                key={index}
              >
                {!isUser && <div className="avatar avatar-ai">AI</div>}
                <div className={`message-bubble ${isUser ? "bubble-user" : "bubble-ai"}`}>
                  <div className="message-author">{isUser ? "我" : "AI 助手"}</div>
                  <div className="message-content">
                    {isUser ? (
                      // 用户输入保持纯文本，避免把用户内容误渲染为 Markdown。
                      <span>{message.content}</span>
                    ) : message.content ? (
                      // 代码块按语言解析 token，为关键字、字符串和注释等添加高亮类名。
                      <Markdown
                        remarkPlugins={[remarkGfm]}
                        rehypePlugins={[[rehypeHighlight, { detect: true }]]}
                      >
                        {message.content}
                      </Markdown>
                    ) : (
                      <span className="typing">正在思考...</span>
                    )}
                  </div>
                </div>
                {isUser && <div className="avatar avatar-user">我</div>}
              </article>
            );
          })}
        </section>
        {error && <p className="error-message" role="alert">请求失败：{error}</p>}
        <div className="composer">
          <input
            aria-label="消息内容"
            placeholder="输入消息，按 Enter 发送"
            value={input}
            disabled={loading}
            onChange={(event) => setInput(event.target.value)}
            onCompositionStart={() => {
              isComposingRef.current = true;
            }}
            onCompositionEnd={() => {
              isComposingRef.current = false;
            }}
            onKeyDown={(event) => {
              // 中文输入法选词时的 Enter 只确认候选词，不发送消息。
              const isComposing = isComposingRef.current ||
                  event.nativeEvent.isComposing ||
                  event.nativeEvent.keyCode === 229;
              if (event.key === "Enter" && !isComposing) {
                event.preventDefault();
                void send();
              }
            }}
          />
          <button disabled={loading || !input.trim()} onClick={send}>
            {loading ? "生成中..." : "发送"}
          </button>
        </div>
      </main>
    </div>
  );
}
