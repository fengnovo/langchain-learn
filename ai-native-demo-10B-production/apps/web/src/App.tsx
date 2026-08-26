import { useState } from "react";
import type { AgentRunResult } from "@demo/shared";
const DEFAULT_REQUIREMENT =
  "根据公司的订单规范，设计并实现一个订单查询模块。";
export default function App() {
  const [requirement, setRequirement] =
    useState(DEFAULT_REQUIREMENT);
  const [result, setResult] =
    useState<AgentRunResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  async function run() {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const response = await fetch(
        "http://localhost:3000/api/agent/run",
        {
          method: "POST",
          headers: {
            "content-type": "application/json"
          },
          body: JSON.stringify({ requirement })
        }
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "request failed");
      }
      setResult(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : String(err)
      );
    } finally {
      setLoading(false);
    }
  }
  return (
    <main className="page">
      <header>
        <p className="eyebrow">
          Demo 10-B · Production Enhanced
        </p>
        <h1>AI Native Dev Platform</h1>
        <p className="intro">
          LangGraph + MCP + RAG + Harness +
          Observability
        </p>
      </header>
      <section className="composer">
        <label htmlFor="requirement">研发需求</label>
        <textarea
          id="requirement"
          rows={5}
          value={requirement}
          onChange={(event) =>
            setRequirement(event.target.value)
          }
        />
        <button
          onClick={run}
          disabled={loading || !requirement.trim()}
        >
          {loading ? "Agent 执行中..." : "运行完整 Agent Workflow"}
        </button>
      </section>
      {error && (
        <section className="error">
          <strong>执行失败：</strong> {error}
        </section>
      )}
      {result && (
        <div className="result">
          <Section title="1. RAG Context">
            {result.ragContext.map((item, index) => (
              <pre key={index}>{item}</pre>
            ))}
          </Section>
          <Section title="2. MCP Context">
            {result.mcpContext.map((item, index) => (
              <pre key={index}>{item}</pre>
            ))}
          </Section>
          <Section title="3. Planner">
            <pre>{result.plan}</pre>
          </Section>
          <Section title="4. fan-out Agents">
            <div className="grid">
              {result.artifacts.map((artifact) => (
                <article
                  className="artifact"
                  key={artifact.role}
                >
                  <h3>{artifact.role}</h3>
                  <pre>{artifact.content}</pre>
                </article>
              ))}
            </div>
          </Section>
          <Section title="5. Reviewer">
            <pre>{result.review}</pre>
          </Section>
          <Section title="6. Harness">
            <p>
              Gate：
              <strong>
                {result.harness.passed
                  ? " PASS"
                  : " FAIL"}
              </strong>
            </p>
            <ul>
              {result.harness.checks.map((check) => (
                <li key={check.name}>
                  {check.passed ? "✅" : "❌"}{" "}
                  {check.name} — {check.message}
                </li>
              ))}
            </ul>
          </Section>
          <Section title="7. Agent Quality">
            <div className="score">
              {(result.quality.score * 100).toFixed(1)}
            </div>
            <pre>
              {JSON.stringify(
                result.quality,
                null,
                2
              )}
            </pre>
          </Section>
        </div>
      )}
    </main>
  );
}
function Section(props: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="section">
      <h2>{props.title}</h2>
      {props.children}
    </section>
  );
}
