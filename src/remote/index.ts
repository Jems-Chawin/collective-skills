import type { CaseInput, CaseResult } from "../schema.js";

const TEAM_URL = process.env.CS_TEAM_URL?.replace(/\/$/, "");
const TEAM_TOKEN = process.env.CS_TEAM_TOKEN;

export function isTeamConfigured(): boolean {
  return !!(TEAM_URL && TEAM_TOKEN);
}

async function request(path: string, body: unknown): Promise<unknown> {
  const res = await fetch(`${TEAM_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${TEAM_TOKEN}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`Team server error: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

export async function pushToTeam(input: CaseInput): Promise<{ id: string }> {
  return (await request("/cases", input)) as { id: string };
}

export async function searchTeam(
  query: string,
  limit: number,
  domain?: string,
  tools?: string[]
): Promise<CaseResult[]> {
  return (await request("/search", { query, limit, domain, tools })) as CaseResult[];
}
