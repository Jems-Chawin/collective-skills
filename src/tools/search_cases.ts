import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export function registerSearchCases(server: McpServer) {
  server.tool(
    "search_cases",
    "Search the collective pool for cases with similar friction patterns. Best when you describe the problem shape, not just the error.",
    {
      query: z.string().describe("Natural language description of the problem"),
      domain: z.enum(["backend", "frontend", "devops", "ml", "database", "mobile", "security", "networking", "tooling", "other"]).optional(),
      tools: z.array(z.string()).optional().describe("Filter by tools/tech involved"),
      limit: z.number().optional().default(5).describe("Max results to return"),
    },
    async ({ query, domain, tools, limit }) => {
      // TODO: implement semantic search
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ message: "search_cases not yet implemented", query, domain, tools, limit }),
          },
        ],
      };
    }
  );
}
