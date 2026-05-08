#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerPullContext } from "./tools/pull_context.js";
import { registerSearchCases } from "./tools/search_cases.js";
import { registerPushCase } from "./tools/push_case.js";

const server = new McpServer({
  name: "collective-skills",
  version: "0.1.0",
});

registerPullContext(server);
registerSearchCases(server);
registerPushCase(server);

const transport = new StdioServerTransport();
await server.connect(transport);
