# collective-skills

## What this is

A collective knowledge base for AI-assisted problem solving — delivered as an MCP server that any AI coding tool can connect to.

The core insight: every time someone uses Claude Code, Cursor, Codex, or Kiro to solve something hard, the reasoning chain — the failed attempts, the friction, the insight that cracked it — evaporates the moment the session closes. Multiplied across millions of developers daily, this is an enormous amount of hard-won knowledge being generated and immediately lost.

This project stops that from happening. When a session solves something genuinely hard, the AI distills it into a structured **case** and optionally pushes it to a shared pool. The next developer who hits the same kind of problem — anywhere in the world, using any MCP-compatible tool — can pull that case as context before they even start.

The unit of content is not a Q&A pair. It is a **case**: situation, friction, wrong turns, insight, solution, watchouts. The reasoning, not just the answer.

---

## How it is different from DebugBase

DebugBase (debugbase.io) already exists and is the closest thing to this. It is genuinely good and worth knowing about. It captures **error → fix pairs**, deduplicated via SHA-256 hashing, with confidence scores. Think: patch database.

This project captures something different — the **full reasoning shape** of a problem encounter. The `attempts` field (wrong turns). The `insight` field (the realization that cracked it). The `friction` field (what made it confusing). The `watchouts` field (what to watch for next time).

DebugBase answers: *what fixed it.*
This answers: *how someone thought through it.*

DebugBase is also reactive — you query it when you hit an error. This project is also **proactive** via `pull_context` — you prime a session before it starts, so the AI begins informed rather than from zero.

---

## The origin

The owner of this repo already runs a personal `skills.md` + `learning-behaviour.md` system inside their own Claude Code setup — a private case library that documents niche encounters, edge cases, and hard-won insights for reuse in future sessions. This project is the federated version of that. A collective `skills.md` for everyone.

---

## The three MCP tools

The server exposes exactly three tools. Small surface area, one clear job each.

### `pull_context`
Called at the **start** of a session, before work begins. Takes a brief description of what you're about to work on, returns the top N relevant cases from the collective pool as injected context. The AI starts the session already knowing what others have learned.

### `search_cases`
Called **during** a session when the AI is stuck. Semantic search against the collective pool. Returns cases with similar friction patterns. Works best when the query describes the *problem shape*, not just the error message.

### `push_case`
Called at the **end** of a session when something genuinely hard was solved. The AI distills the session into a structured case automatically — near-zero effort from the user. The user chooses visibility: `private`, `team`, or `public`. Returns the new case ID.

---

## The case schema

See `CASE_SCHEMA.ts` for the full TypeScript type definition. Summary of the key fields:

**Identity**: `id`, `created_at`, `source_tool`, `contributed_by` (anonymous by default)

**The case itself** — this is the load-bearing part:
- `title` — short human-readable summary (~10 words)
- `situation` — what was being attempted and in what environment
- `friction` — what made it hard; the confusing part, the thing that resisted
- `attempts` — what was tried and failed (the wrong turns matter — they're what the next person will try first)
- `insight` — the key realization that unlocked the solution
- `solution` — what actually worked
- `code_snippet` — optional minimal reproducible example
- `watchouts` — edge cases, nearby traps, what to check next time

**Context & retrieval**: `domain`, `tools`, `tags`, `embedding` (vector for semantic search), `visibility`

**Quality signals**: `helpful_count`, `verified`

The `attempts` and `insight` fields are the most important and the most differentiated from existing tools. Do not simplify them away.

---

## Design principles

**Zero-effort contribution.** If pushing a case requires manual writing, most people won't do it. The AI must do the distillation. The user only decides whether to share.

**Private by default.** Cases are `private` unless the user explicitly sets `team` or `public`. People will not contribute to a collective pool they don't trust. Trust comes from control.

**Wrong turns are first-class.** The `attempts` field is not optional metadata. It is core content. Someone reading a case later will try the same wrong things — unless they can see they've already been tried.

**The unit is a case, not a thread.** No replies, no voting on individual answers, no discussion. A case is a closed artifact — a field note, not a forum post. Curation happens by the `helpful_count` signal (was this useful when pulled?) not by social dynamics.

**Semantic retrieval over keyword search.** The `embedding` field exists so that two developers describing the same problem in completely different words still find each other's cases. This is the core technical bet.

---

## What to build first

1. `CASE_SCHEMA.ts` — the type definition (already exists, see file)
2. MCP server skeleton — three tools, typed, with stub handlers
3. Storage layer — start with SQLite + a vector extension (e.g. `sqlite-vss` or `better-sqlite3` + `@xenova/transformers` for local embeddings)
4. `push_case` — implement first, so there's something to search
5. `search_cases` — implement second
6. `pull_context` — implement third (wraps search with session-priming framing)
7. README + one real example case seeded into the DB to prove the format works

Do not build a web UI, a community layer, or a reputation system yet. The tool must work and produce genuinely useful cases before any of that matters.

---

## Repository structure (target)

```
collective-skills/
├── CLAUDE.md                  ← this file
├── CASE_SCHEMA.ts             ← canonical type definition
├── README.md
├── package.json
├── src/
│   ├── server.ts              ← MCP server entry point
│   ├── tools/
│   │   ├── pull_context.ts
│   │   ├── search_cases.ts
│   │   └── push_case.ts
│   ├── db/
│   │   ├── index.ts           ← storage abstraction
│   │   └── migrations/
│   └── embeddings/
│       └── index.ts           ← embedding model wrapper
├── cases/
│   └── seed/                  ← example cases to seed the DB
└── tests/
```

---

## Key decisions still open

- **Embedding model**: local (e.g. `nomic-embed-text` via Ollama or `@xenova/transformers`) vs. API-based (OpenAI, Voyage). Local = no API key needed, better for privacy. API = better quality. Default should be local with API as opt-in.
- **Vector storage**: SQLite + `sqlite-vss` for simplicity vs. standalone vector DB (Qdrant, Chroma). Start with SQLite.
- **Hosted collective pool**: eventually there needs to be a central server for the `public` visibility tier. That is a future problem. For now, each instance is its own pool.
- **Auto-distillation trigger**: should `push_case` be called manually, or should the AI detect "session resolved something hard" automatically? Probably both — auto-suggest, user confirms.

---

## Tone

This is a tool for developers who feel the knowledge evaporation problem personally. The README should not use the word "revolutionary." It should describe the problem in one sentence and show a real case in the first 20 lines.
