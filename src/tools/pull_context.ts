import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { searchByEmbedding } from "../db/index.js";
import { embed } from "../embeddings/index.js";

export function registerPullContext(server: McpServer) {
  server.tool(
    "pull_context",
    "Prime a session with relevant cases before you start working. Returns top cases matching your situation.",
    {
      situation: z.string().describe("Brief description of what you're about to work on"),
      limit: z.number().optional().default(3).describe("Max cases to return"),
    },
    async ({ situation, limit }) => {
      const queryEmbedding = await embed(situation);
      const results = searchByEmbedding(queryEmbedding, limit);

      if (results.length === 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: "No relevant cases found in the collective pool for this situation.",
            },
          ],
        };
      }

      const formatted = results.map((c, i) =>
        [
          `--- Case ${i + 1}: ${c.title} (similarity: ${c.similarity_score.toFixed(2)}) ---`,
          `Situation: ${c.situation}`,
          `Friction: ${c.friction}`,
          `Insight: ${c.insight}`,
          `Solution: ${c.solution}`,
          c.watchouts.length > 0 ? `Watchouts: ${c.watchouts.join("; ")}` : null,
        ].filter(Boolean).join("\n")
      ).join("\n\n");

      return {
        content: [
          {
            type: "text" as const,
            text: `Here are ${results.length} relevant case(s) from the collective pool:\n\n${formatted}`,
          },
        ],
      };
    }
  );
}
