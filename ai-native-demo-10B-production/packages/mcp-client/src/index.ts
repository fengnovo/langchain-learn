import path from "node:path";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
/**
 * 一个最小但真实的 MCP Client。
 * 每次 Demo 调用会：
 * 1. spawn 本项目 MCP server。
 * 2. 完成 initialize handshake。
 * 3. callTool。
 * 4. close，释放子进程。
 * 生产环境通常会复用长连接，而不是每次 spawn。
 */
export class CompanyMcpClient {
  async searchCode(keyword: string): Promise<string[]> {
    if (process.env.MCP_ENABLED === "false") {
      return ["MCP disabled"];
    }
    const { client } = await this.connect();
    try {
      const result = await client.callTool({
        name: "search_code",
        arguments: { keyword }
      });
      return result.content
        .filter((block) => block.type === "text")
        .map((block) => ("text" in block ? block.text : ""));
    } finally {
      await client.close();
    }
  }
  private async connect(): Promise<{ client: Client }> {
    const root = path.resolve(process.cwd(), "../..");
    const entry = path.join(root, "apps", "mcp-server", "src", "index.ts");
    const transport = new StdioClientTransport({
      command: process.execPath,
      args: ["--import", "tsx", entry],
      cwd: root,
      env: Object.fromEntries(
        Object.entries(process.env).filter(
          (entry): entry is [string, string] =>
            typeof entry[1] === "string"
        )
      )
    });
    const client = new Client({
      name: "ai-native-agent-host",
      version: "1.0.0"
    });
    await client.connect(transport);
    return { client };
  }
}
