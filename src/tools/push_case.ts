import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export function registerPushCase(server: McpServer) {
  server.tool(
    "push_case",
    "Submit a solved case to the collective pool. The AI distills the session into a structured case automatically.",
    {
      title: z.string().describe("Short title, ~10 words"),
      situation: z.string().describe("What was being attempted and in what environment"),
      friction: z.string().describe("What made it hard — the confusing part"),
      attempts: z.array(z.string()).describe("What was tried and failed, in order"),
      insight: z.string().describe("The key realization that unlocked the solution"),
      solution: z.string().describe("What actually worked"),
      code_snippet: z.string().optional().describe("Optional minimal code example"),
      watchouts: z.array(z.string()).describe("Edge cases, nearby traps"),
      domain: z.enum(["backend", "frontend", "devops", "ml", "database", "mobile", "security", "networking", "tooling", "other"]),
      tools: z.array(z.string()).describe("Languages, frameworks, versions involved"),
      tags: z.array(z.string()).describe("Keywords for browsing"),
      source_tool: z.string().describe("Which AI tool generated this case"),
      contributed_by: z.string().optional().default(null as unknown as string),
      visibility: z.enum(["private", "team", "public"]).optional().default("private"),
    },
    async (params) => {
      // TODO: store case, generate embedding, return ID
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ message: "push_case not yet implemented", title: params.title }),
          },
        ],
      };
    }
  );
}
