import OpenAI from "openai";
/**
 * 所有 Agent 都通过这一层访问模型。
 * 好处：
 * 1. Agent 逻辑不绑定具体厂商。
 * 2. Mock 模式和真实模式可以无缝切换。
 * 3. 未来做 model routing / fallback / token budget 时只改这里。
 */
export class LlmProvider {
  private readonly mockMode = process.env.MOCK_MODE !== "false";
  private client(): OpenAI {
    const apiKey = process.env.LLM_API_KEY;
    const baseURL = process.env.LLM_BASE_URL;
    if (!apiKey || !baseURL) {
      throw new Error(
        "MOCK_MODE=false 时必须配置 LLM_API_KEY 和 LLM_BASE_URL"
      );
    }
    return new OpenAI({ apiKey, baseURL });
  }
  async generate(params: {
    system: string;
    user: string;
    mockAnswer: string;
  }): Promise<string> {
    if (this.mockMode) {
      // Mock 模式不是为了“假装生产”，而是让你先验证编排链路。
      return params.mockAnswer;
    }
    const response = await this.client().chat.completions.create({
      model: process.env.LLM_MODEL ?? "qwen-plus",
      messages: [
        { role: "system", content: params.system },
        { role: "user", content: params.user }
      ],
      temperature: 0.2
    });
    return response.choices[0]?.message?.content ?? "";
  }
}
