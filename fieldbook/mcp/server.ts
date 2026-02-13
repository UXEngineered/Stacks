#!/usr/bin/env bun
/**
 * Stacks MCP Server
 *
 * Exposes Stacks fieldbook data and compile engine to AI tools
 * (Claude Desktop, Cursor, Windsurf, etc.) via the Model Context Protocol.
 *
 * Transport: stdio (default for local tools)
 *
 * Run:
 *   bun run mcp/server.ts
 *
 * Configure in Claude Desktop / Cursor:
 *   {
 *     "mcpServers": {
 *       "stacks": {
 *         "command": "bun",
 *         "args": ["run", "<path-to>/fieldbook/mcp/server.ts"]
 *       }
 *     }
 *   }
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { registerResources } from "./resources/fieldbooks.js";
import { registerReadTools } from "./tools/read.js";
import { registerCompileTools } from "./tools/compile.js";
import { registerWriteTools } from "./tools/write.js";

// ---------------------------------------------------------------------------
// Server setup
// ---------------------------------------------------------------------------

const server = new McpServer({
  name: "stacks",
  version: "1.0.0",
});

// Register all capabilities
registerResources(server);
registerReadTools(server);
registerCompileTools(server);
registerWriteTools(server);

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("[stacks-mcp] Server running on stdio");
}

main().catch((err) => {
  console.error("[stacks-mcp] Fatal error:", err);
  process.exit(1);
});
