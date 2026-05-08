# collective-skills

Every time an AI tool helps you solve something hard, the reasoning disappears when the session closes.

This MCP server stops that. When something genuinely difficult gets solved, the AI distills the session into a structured **case** — the situation, the wrong turns, the insight, the solution — and stores it. Next time you (or anyone) hit the same kind of problem, the case is pulled as context before you even start.

## Install

```json
{
  "mcpServers": {
    "collective-skills": {
      "command": "npx",
      "args": ["-y", "collective-skills-mcp"]
    }
  }
}
```

Add this to your MCP config:
- **Kiro**: `~/.kiro/settings/mcp.json`
- **Claude Code**: `~/.claude/claude_desktop_config.json`
- **Cursor**: `.cursor/mcp.json`

## Three tools

| Tool | When | What it does |
|------|------|--------------|
| `pull_context` | Start of session | Primes the AI with relevant past cases |
| `search_cases` | When stuck | Finds cases with similar friction patterns |
| `push_case` | After solving something hard | Stores the reasoning for future reuse |

## What a case looks like

```
Title: Prisma connection pool exhausted under concurrent Next.js API routes

Friction: Error messages pointed to connection issues, but pool metrics looked fine.
          The real problem was invisible — hot reload creating orphan pools.

Attempts:
  ✗ Increased connection_limit to 20
  ✗ Added explicit $disconnect() calls
  ✗ Checked for missing await

Insight: Next.js dev mode hot-reloads modules without disposing old PrismaClient
         instances. Each reload creates a new pool. After several reloads, the
         database is saturated with idle pools from dead module instances.

Solution: globalThis.__prisma singleton pattern in development.
```

The wrong turns are first-class content — they're what the next person will try first.

## How it differs from DebugBase

[DebugBase](https://debugbase.io) captures **error → fix pairs**. Excellent for known errors with known patches.

This captures the **full reasoning shape**: what made it hard, what failed, what the realization was. The unit is a case, not a patch.

## Storage

Cases are stored locally at `~/.collective-skills/cases.db` (SQLite). Embeddings are generated locally using `all-MiniLM-L6-v2` — no API keys needed.

Override the DB path with `CS_DB_PATH` environment variable.

## Team sharing

A company can self-host a team server so all devs share a collective pool.

**1. Deploy the team server** (on any machine accessible to your team):

```bash
CS_SERVER_TOKEN=your-shared-secret CS_DB_PATH=/data/cases.db npx collective-skills-mcp-server
```

Or run from source:
```bash
CS_SERVER_TOKEN=your-shared-secret node dist/server-team.js
```

**2. Configure each dev's MCP client:**

```json
{
  "mcpServers": {
    "collective-skills": {
      "command": "npx",
      "args": ["-y", "collective-skills-mcp"],
      "env": {
        "CS_TEAM_URL": "https://cases.yourcompany.com",
        "CS_TEAM_TOKEN": "your-shared-secret"
      }
    }
  }
}
```

Cases with `visibility: "team"` are pushed to the team server. Searches query both local and team pools, results merged by relevance.

Without `CS_TEAM_URL`, everything stays local (default behavior).

## Status

Early development. Local-only for now. A hosted collective pool (so cases can be shared across developers) is planned.

## License

MIT
