import Database from "better-sqlite3";
import { v4 as uuid } from "uuid";
import path from "path";
import fs from "fs";
import os from "os";
import type { Case, CaseInput, CaseResult } from "../schema.js";

const DATA_DIR = path.join(os.homedir(), ".collective-skills");
fs.mkdirSync(DATA_DIR, { recursive: true });
const DB_PATH = process.env.CS_DB_PATH || path.join(DATA_DIR, "cases.db");

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS cases (
    id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL,
    source_tool TEXT NOT NULL,
    contributed_by TEXT,
    title TEXT NOT NULL,
    situation TEXT NOT NULL,
    friction TEXT NOT NULL,
    attempts TEXT NOT NULL,
    insight TEXT NOT NULL,
    solution TEXT NOT NULL,
    code_snippet TEXT,
    watchouts TEXT NOT NULL,
    domain TEXT NOT NULL,
    tools TEXT NOT NULL,
    tags TEXT NOT NULL,
    embedding TEXT,
    visibility TEXT NOT NULL DEFAULT 'private',
    helpful_count INTEGER NOT NULL DEFAULT 0,
    verified INTEGER NOT NULL DEFAULT 0
  )
`);

export function insertCase(input: CaseInput): Case {
  const id = uuid();
  const created_at = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO cases (id, created_at, source_tool, contributed_by, title, situation, friction, attempts, insight, solution, code_snippet, watchouts, domain, tools, tags, visibility, helpful_count, verified)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0)
  `);

  stmt.run(
    id,
    created_at,
    input.source_tool,
    input.contributed_by ?? null,
    input.title,
    input.situation,
    input.friction,
    JSON.stringify(input.attempts),
    input.insight,
    input.solution,
    input.code_snippet ?? null,
    JSON.stringify(input.watchouts),
    input.domain,
    JSON.stringify(input.tools),
    JSON.stringify(input.tags),
    input.visibility ?? "private"
  );

  return {
    id,
    created_at,
    source_tool: input.source_tool,
    contributed_by: input.contributed_by ?? null,
    title: input.title,
    situation: input.situation,
    friction: input.friction,
    attempts: input.attempts,
    insight: input.insight,
    solution: input.solution,
    code_snippet: input.code_snippet ?? null,
    watchouts: input.watchouts,
    domain: input.domain,
    tools: input.tools,
    tags: input.tags,
    embedding: null,
    visibility: input.visibility ?? "private",
    helpful_count: 0,
    verified: false,
  };
}

export function updateEmbedding(id: string, embedding: number[]): void {
  db.prepare("UPDATE cases SET embedding = ? WHERE id = ?").run(
    JSON.stringify(embedding),
    id
  );
}

export function searchByEmbedding(
  queryEmbedding: number[],
  limit: number,
  domain?: string,
  tools?: string[]
): CaseResult[] {
  let query = "SELECT * FROM cases WHERE embedding IS NOT NULL";
  const params: unknown[] = [];

  if (domain) {
    query += " AND domain = ?";
    params.push(domain);
  }

  const rows = db.prepare(query).all(...params) as Record<string, unknown>[];

  const scored = rows
    .map((row) => {
      const embedding = JSON.parse(row.embedding as string) as number[];
      const score = cosineSimilarity(queryEmbedding, embedding);
      return { row, score };
    })
    .filter(({ row }) => {
      if (!tools || tools.length === 0) return true;
      const caseTools = JSON.parse(row.tools as string) as string[];
      return tools.some((t) => caseTools.some((ct) => ct.includes(t)));
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return scored.map(({ row, score }) => rowToResult(row, score));
}

function rowToResult(row: Record<string, unknown>, score: number): CaseResult {
  return {
    id: row.id as string,
    created_at: row.created_at as string,
    source_tool: row.source_tool as string,
    contributed_by: row.contributed_by as string | null,
    title: row.title as string,
    situation: row.situation as string,
    friction: row.friction as string,
    attempts: JSON.parse(row.attempts as string),
    insight: row.insight as string,
    solution: row.solution as string,
    code_snippet: row.code_snippet as string | null,
    watchouts: JSON.parse(row.watchouts as string),
    domain: row.domain as string as Case["domain"],
    tools: JSON.parse(row.tools as string),
    tags: JSON.parse(row.tags as string),
    visibility: row.visibility as string as Case["visibility"],
    helpful_count: row.helpful_count as number,
    verified: Boolean(row.verified),
    similarity_score: score,
  };
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}
