import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { searchByEmbedding } from "../db/index.js";
import { embed } from "../embeddings/index.js";
import { isTeamConfigured, searchTeam } from "../remote/index.js";
import type { CaseResult } from "../schema.js";

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
      const localResults = searchByEmbedding(queryEmbedding, limit, domain, tools);

      let allResults: CaseResult[] = localResults;

      // Merge remote results if team is configured
      if (isTeamConfigured()) {
        try {
          const remoteResults = await searchTeam(query, limit, domain, tools);
          allResults = mergeResults(localResults, remoteResults, limit);
        } catch (e) {
          // Remote failure is non-fatal — local results still returned
        }
      }

      return {
        content: [
          {
            type: "text" as const,
            text: allResults.length > 0
              ? JSON.stringify(allResults, null, 2)
              : JSON.stringify({ message: "No matching cases found.", query }),
          },
        ],
      };
    }
  );
}

function mergeResults(local: CaseResult[], remote: CaseResult[], limit: number): CaseResult[] {
  const seen = new Set(local.map((r) => r.id));
  const merged = [...local];
  for (const r of remote) {
    if (!seen.has(r.id)) {
      merged.push(r);
      seen.add(r.id);
    }
  }
  return merged.sort((a, b) => b.similarity_score - a.similarity_score).slice(0, limit);
}
