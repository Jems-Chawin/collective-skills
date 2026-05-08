import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export function registerPullContext(server: McpServer) {
  server.tool(
    "pull_context",
    "Prime a session with relevant cases before you start working. Returns top cases matching your situation.",
    {
      situation: z.string().describe("Brief description of what you're about to work on"),
      limit: z.number().optional().default(3).describe("Max cases to return"),
    },
    async ({ situation, limit }) => {
      // TODO: implement semantic search + session-priming framing
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ message: "pull_context not yet implemented", situation, limit }),
          },
        ],
      };
    }
  );
}
