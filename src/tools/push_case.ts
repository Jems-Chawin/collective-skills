import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { insertCase, updateEmbedding } from "../db/index.js";
import { embed } from "../embeddings/index.js";
import { isTeamConfigured, pushToTeam } from "../remote/index.js";

export function registerPushCase(server: McpServer) {
  server.tool(
    "push_case",
    "Submit a solved case to the collective pool. The AI distills the session into a structured case automatically.",
    {
      title: z.string().max(200).describe("Short title, ~10 words"),
      situation: z.string().max(5000).describe("What was being attempted and in what environment"),
      friction: z.string().max(3000).describe("What made it hard — the confusing part"),
      attempts: z.array(z.string().max(1000)).max(20).describe("What was tried and failed, in order"),
      insight: z.string().max(3000).describe("The key realization that unlocked the solution"),
      solution: z.string().max(5000).describe("What actually worked"),
      code_snippet: z.string().max(10000).optional().describe("Optional minimal code example"),
      watchouts: z.array(z.string().max(1000)).max(20).describe("Edge cases, nearby traps"),
      domain: z.enum(["backend", "frontend", "devops", "ml", "database", "mobile", "security", "networking", "tooling", "other"]),
      tools: z.array(z.string().max(100)).max(30).describe("Languages, frameworks, versions involved"),
      tags: z.array(z.string().max(50)).max(20).describe("Keywords for browsing"),
      source_tool: z.string().max(100).describe("Which AI tool generated this case"),
      contributed_by: z.string().max(100).optional(),
      visibility: z.enum(["private", "team", "public"]).optional().default("private"),
    },
    async (params) => {
      const caseInput = {
        ...params,
        contributed_by: params.contributed_by ?? null,
        code_snippet: params.code_snippet ?? null,
      };

      // Always store locally
      const saved = insertCase(caseInput);

      // Generate embedding
      const textForEmbedding = [
        saved.title,
        saved.situation,
        saved.friction,
        saved.insight,
        saved.solution,
        ...saved.attempts,
        ...saved.watchouts,
      ].join("\n");

      try {
        const vector = await embed(textForEmbedding);
        updateEmbedding(saved.id, vector);
      } catch (e) {
        // Embedding failure is non-fatal
      }

      // Push to team server if configured and visibility is team/public
      let teamStatus = "local_only";
      if (isTeamConfigured() && (params.visibility === "team" || params.visibility === "public")) {
        try {
          await pushToTeam(caseInput);
          teamStatus = "synced_to_team";
        } catch (e) {
          teamStatus = `team_sync_failed: ${e instanceof Error ? e.message : "unknown error"}`;
        }
      }

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ id: saved.id, title: saved.title, status: "stored", teamStatus }),
          },
        ],
      };
    }
  );
}
