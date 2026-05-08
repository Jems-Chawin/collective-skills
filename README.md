# collective-skills

Every time an AI tool helps you solve something hard, the reasoning disappears when the session closes.

This is an MCP server that stops that from happening. When something genuinely difficult gets solved, the AI distills the session into a structured **case** — the situation, the wrong turns, the insight, the solution — and optionally pushes it to a shared pool. The next developer who hits the same kind of problem can pull that case as context before they even start.

---

## How it differs from DebugBase

[DebugBase](https://debugbase.io) captures **error → fix pairs**. It is excellent for known errors with known patches.

This captures the **full reasoning shape**: what made it hard, what failed, what the realization was, what to watch for next time. The wrong turns are first-class content here, not metadata.

DebugBase answers: *what fixed it.*
This answers: *how someone thought through it.*

---

## Three MCP tools

```
pull_context   — prime a session before you start
search_cases   — find relevant cases when you're stuck
push_case      — contribute a solved case to the pool
```

---

## Quick start

```bash
# coming soon
npx collective-skills init
```

Add to your `claude_mcp_config.json` / `.cursor/mcp.json` / kiro config:

```json
{
  "mcpServers": {
    "collective-skills": {
      "command": "npx",
      "args": ["-y", "collective-skills-mcp"],
      "env": {
        "CS_API_KEY": "<your-token>"
      }
    }
  }
}
```

---

## Case schema

See [`CASE_SCHEMA.ts`](./CASE_SCHEMA.ts) for the full type definition.

The five fields that matter most:

| Field | What it captures |
|---|---|
| `friction` | What made it hard — not the error, the *reason* it was confusing |
| `attempts` | What was tried and failed — the wrong turns the next person will also try |
| `insight` | The realization that cracked it — often the most valuable single sentence |
| `solution` | What actually worked |
| `watchouts` | Edge cases, nearby traps, what not to do next time |

---

## Status

Early development. Schema is stable. MCP server is being built.

See [`CLAUDE.md`](./CLAUDE.md) for full project context, design principles, and build order.
