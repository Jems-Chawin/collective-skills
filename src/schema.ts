/**
 * collective-skills — canonical case schema
 *
 * A Case is the unit of content in the collective pool.
 * It represents one real encounter with a hard problem,
 * distilled into a reusable shape.
 *
 * The goal is to capture not just what fixed it,
 * but how someone reasoned through it.
 */

export type Visibility = "private" | "team" | "public";

export type Domain =
  | "backend"
  | "frontend"
  | "devops"
  | "ml"
  | "database"
  | "mobile"
  | "security"
  | "networking"
  | "tooling"
  | "other";

/**
 * A Case — one distilled problem encounter.
 *
 * Fields marked [CORE] are the most important and most
 * differentiated from other tools. Do not simplify them away.
 */
export interface Case {
  // --- Identity ---

  /** UUID, auto-generated on push */
  id: string;

  /** ISO 8601 timestamp of when the case was submitted */
  created_at: string;

  /** Which AI tool generated / submitted this case */
  source_tool: string; // "claude-code" | "cursor" | "codex" | "kiro" | ...

  /** Optional contributor handle. Anonymous by default. */
  contributed_by: string | null;

  // --- The case itself ---

  /** Short human-readable title, ~10 words */
  title: string;

  /**
   * [CORE] What was being attempted, and in what environment.
   * Include: goal, stack, relevant versions, OS if relevant.
   * This is the "patient chart" — enough context that someone
   * who wasn't there can understand the situation.
   */
  situation: string;

  /**
   * [CORE] What made it hard.
   * The confusing part. The thing that resisted.
   * What a skilled developer would describe as "the tricky bit."
   * Not the error message — the reason the error message was confusing.
   */
  friction: string;

  /**
   * [CORE] What was tried and failed, in order.
   * These are the wrong turns. They matter because:
   * - They're what the next person will try first.
   * - They narrow the search space.
   * - They show the reasoning path, not just the destination.
   * Do not omit. Do not summarize into one item.
   */
  attempts: string[];

  /**
   * [CORE] The key realization that unlocked the solution.
   * Not the solution itself — the insight that led to it.
   * Often a single sentence. Often the most valuable part of the case.
   * Example: "The issue wasn't the query, it was that SQLite WAL mode
   * was disabled and concurrent reads were blocking."
   */
  insight: string;

  /**
   * The solution — what actually worked.
   * Should be specific enough that someone could apply it
   * without re-deriving it.
   */
  solution: string;

  /**
   * Optional minimal reproducible example, config snippet,
   * or diff. Keep it minimal — not a paste of the whole file.
   */
  code_snippet: string | null;

  /**
   * [CORE] Edge cases, nearby traps, related pitfalls.
   * What to check next time. What NOT to do.
   * What looks like this problem but isn't.
   */
  watchouts: string[];

  // --- Context & retrieval ---

  /** Primary domain of the problem */
  domain: Domain;

  /**
   * Languages, frameworks, libraries, and versions involved.
   * Be specific: ["postgres@15", "prisma@5.8", "node@20"]
   * not just ["postgres", "node"]
   */
  tools: string[];

  /** Human-readable keywords for browsing */
  tags: string[];

  /**
   * Vector embedding of the full case text.
   * Used for semantic similarity search.
   * Generated automatically on push — do not set manually.
   */
  embedding: number[] | null;

  /** Who can pull this case */
  visibility: Visibility;

  // --- Quality signals ---

  /**
   * How many times this case was pulled and the caller
   * marked it as useful. Incremented by the retrieval layer,
   * not by votes.
   */
  helpful_count: number;

  /**
   * Whether the community has confirmed this solution still works.
   * Starts false. Can be set to true via a separate verification flow.
   */
  verified: boolean;
}

/**
 * The shape of a case before it has been assigned an ID,
 * embedded, or had quality signals attached.
 * This is what `push_case` accepts.
 */
export type CaseInput = Omit<
  Case,
  "id" | "created_at" | "embedding" | "helpful_count" | "verified"
> & {
  visibility?: Visibility; // defaults to "private"
};

/**
 * What `search_cases` and `pull_context` return.
 * Embedding is stripped — callers don't need it.
 */
export type CaseResult = Omit<Case, "embedding"> & {
  /** Cosine similarity score from the vector search, 0–1 */
  similarity_score: number;
};

// --- MCP tool parameter types ---

export interface SearchCasesParams {
  /** Natural language description of the problem */
  query: string;
  /** Optional domain filter */
  domain?: Domain;
  /** Optional tool/tech filter — matches any item in case.tools */
  tools?: string[];
  /** Max results to return. Default: 5 */
  limit?: number;
}

export interface PushCaseParams {
  case: CaseInput;
}

export interface PullContextParams {
  /**
   * Brief description of what you're about to work on.
   * Used to find relevant cases to inject as session context.
   */
  situation: string;
  /** Max cases to return. Default: 3 */
  limit?: number;
}

// --- Example case (for seeding and testing) ---

export const EXAMPLE_CASE: CaseInput = {
  title: "Prisma connection pool exhausted under concurrent Next.js API routes",
  situation:
    "Next.js 14 app with Prisma 5.8 and PostgreSQL 15. In development, API routes were timing out intermittently under moderate load (10–20 concurrent requests). Production was also showing occasional 'prepared statement does not exist' errors.",
  friction:
    "The error messages pointed to connection issues, but the Prisma logs showed the pool was configured correctly (connection_limit=10). Adding logging showed queries were queuing, but the pool metrics looked fine. PgBouncer was not in the stack, so pooling should have been Prisma's job.",
  attempts: [
    "Increased connection_limit to 20 — no change in timeout frequency",
    "Added explicit $disconnect() calls in API routes — made it worse (new connections on every request)",
    "Checked for missing await on Prisma calls — all awaited correctly",
    "Suspected N+1 queries and added includes — improved query count but not timeouts",
  ],
  insight:
    "Next.js dev mode hot-reloads modules but does not dispose the old PrismaClient instance. Each hot reload creates a new client with a new pool, while the old pools stay open and hold connections. After several reloads, the database is saturated with idle pools from dead module instances.",
  solution:
    "Use the global singleton pattern: check `globalThis.__prisma` before instantiating, and assign the new client to `globalThis.__prisma` in development only. In production, instantiate normally (no hot reload, no problem).",
  code_snippet: `// lib/prisma.ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}`,
  watchouts: [
    "This pattern is for Next.js specifically — other frameworks without hot reload don't need it",
    "The 'prepared statement does not exist' error in production is a separate issue caused by PgBouncer in transaction mode — Prisma needs ?pgbouncer=true in the connection string if PgBouncer is added later",
    "Serverless deployments (Vercel, Lambda) have a different problem: too many short-lived connections. Use @prisma/adapter-neon or connection pooling at the infrastructure level instead",
  ],
  domain: "backend",
  tools: ["prisma@5.8", "nextjs@14", "postgres@15", "node@20"],
  tags: ["prisma", "connection-pool", "nextjs", "hot-reload", "postgres"],
  source_tool: "claude-code",
  contributed_by: null,
  visibility: "public",
};
