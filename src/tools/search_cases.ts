import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { searchByEmbedding } from "../db/index.js";
import { embed } from "../embeddings/index.js";

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
      const queryEmbedding = await embed(query);
      const results = searchByEmbedding(queryEmbedding, limit, domain, tools);

      return {
        content: [
          {
            type: "text" as const,
            text: results.length > 0
              ? JSON.stringify(results, null, 2)
              : JSON.stringify({ message: "No matching cases found.", query }),
          },
        ],
      };
    }
  );
}
