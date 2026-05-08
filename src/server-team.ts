#!/usr/bin/env node
/**
 * collective-skills team server
 *
 * A simple REST API that a company self-hosts for shared team cases.
 * Requires: CS_SERVER_TOKEN (shared secret for auth)
 * Optional: CS_DB_PATH, PORT
 *
 * Usage: npx tsx src/server-team.ts
 * Or:    node dist/server-team.js
 */
import http from "http";
import { insertCase, updateEmbedding, searchByEmbedding } from "./db/index.js";
import { embed } from "./embeddings/index.js";
import type { CaseInput } from "./schema.js";

const PORT = parseInt(process.env.PORT || "3271", 10);
const SERVER_TOKEN = process.env.CS_SERVER_TOKEN;

if (!SERVER_TOKEN) {
  console.error("Error: CS_SERVER_TOKEN environment variable is required");
  process.exit(1);
}

function authenticate(req: http.IncomingMessage): boolean {
  const auth = req.headers.authorization;
  return auth === `Bearer ${SERVER_TOKEN}`;
}

async function readBody(req: http.IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString();
}

const server = http.createServer(async (req, res) => {
  res.setHeader("Content-Type", "application/json");

  if (req.method === "GET" && req.url === "/health") {
    res.end(JSON.stringify({ status: "ok" }));
    return;
  }

  if (!authenticate(req)) {
    res.writeHead(401);
    res.end(JSON.stringify({ error: "unauthorized" }));
    return;
  }

  try {
    if (req.method === "POST" && req.url === "/cases") {
      const input = JSON.parse(await readBody(req)) as CaseInput;
      const saved = insertCase(input);

      const textForEmbedding = [
        saved.title, saved.situation, saved.friction,
        saved.insight, saved.solution,
        ...saved.attempts, ...saved.watchouts,
      ].join("\n");

      try {
        const vector = await embed(textForEmbedding);
        updateEmbedding(saved.id, vector);
      } catch (e) { /* non-fatal */ }

      res.end(JSON.stringify({ id: saved.id }));
    } else if (req.method === "POST" && req.url === "/search") {
      const { query, limit = 5, domain, tools } = JSON.parse(await readBody(req));
      const queryEmbedding = await embed(query);
      const results = searchByEmbedding(queryEmbedding, limit, domain, tools);
      res.end(JSON.stringify(results));
    } else {
      res.writeHead(404);
      res.end(JSON.stringify({ error: "not found" }));
    }
  } catch (e) {
    res.writeHead(500);
    res.end(JSON.stringify({ error: e instanceof Error ? e.message : "internal error" }));
  }
});

server.listen(PORT, () => {
  console.log(`collective-skills team server running on port ${PORT}`);
});
