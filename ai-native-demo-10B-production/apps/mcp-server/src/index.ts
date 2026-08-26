import fs from "node:fs/promises";
import path from "node:path";
import { McpServer } from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import * as z from "zod/v4";
/**
 * MCP Server 的 stdout 是 JSON-RPC 协议通道。
 * 所以这里绝对不要 console.log。
 * 调试日志必须 console.error。
 */
function repoRoot(): string {
  // MCP Client 会把 cwd 指向 monorepo root。
  return process.cwd();
}
function createServer(): McpServer {
  const server = new McpServer({
    name: "ai-native-company-tools",
    version: "1.0.0"
  });
  /**
   * Tool 1：代码搜索
   * 企业版可以替换成：
   * - ripgrep
   * - code graph
   * - symbol index
   * - Sourcegraph
   */
  server.registerTool(
    "search_code",
    {
      title: "Search company code",
      description: "Search mock company code for a keyword.",
      inputSchema: z.object({
        keyword: z.string().min(1).max(100)
      }),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false
      }
    },
    async ({ keyword }) => {
      const codeDir = path.join(repoRoot(), "mock-company", "code");
      const files = await fs.readdir(codeDir);
      const matches: Array<{ file: string; preview: string }> = [];
      for (const file of files) {
        const full = path.join(codeDir, file);
        const text = await fs.readFile(full, "utf-8");
        if (text.toLowerCase().includes(keyword.toLowerCase())) {
          matches.push({
            file,
            preview: text.slice(0, 1000)
          });
        }
      }
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(matches, null, 2)
          }
        ],
        structuredContent: { matches }
      };
    }
  );
  /**
   * Tool 2：读取企业文档。
   * 关键安全点：
   * 必须限制根目录，不能让模型传 ../../ 读取任意机器文件。
   */
  server.registerTool(
    "read_company_doc",
    {
      title: "Read company document",
      description:
        "Read a document under mock-company. Path must stay inside that directory.",
      inputSchema: z.object({
        relativePath: z.string().min(1).max(300)
      }),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false
      }
    },
    async ({ relativePath }) => {
      const root = path.resolve(repoRoot(), "mock-company");
      const target = path.resolve(root, relativePath);
      if (!target.startsWith(root + path.sep)) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: "拒绝访问：路径超出 mock-company 根目录。"
            }
          ]
        };
      }
      try {
        const text = await fs.readFile(target, "utf-8");
        return {
          content: [{ type: "text", text }]
        };
      } catch {
        return {
          isError: true,
          content: [{ type: "text", text: "文件不存在或无法读取。" }]
        };
      }
    }
  );
  return server;
}
/**
 * v2 推荐的 stdio 入口。
 */
void serveStdio(createServer);
// 只能 stderr。
console.error("AI Native MCP Server running on stdio");
