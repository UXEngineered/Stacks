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

import path from "path";
import { fileURLToPath } from "url";

// Ensure cwd is the Next.js project root (fieldbook/fieldbook/) so that
// the db module resolves data/data.json correctly regardless of where
// the MCP process is spawned from (e.g. Cursor workspace root).
const __dirname = path.dirname(fileURLToPath(import.meta.url));
process.chdir(path.resolve(__dirname, ".."));

// Dynamic imports — MUST come after chdir so that the db module's
// top-level `process.cwd()` resolves to the correct directory.
const { McpServer } = await import("@modelcontextprotocol/sdk/server/mcp.js");
const { StdioServerTransport } = await import("@modelcontextprotocol/sdk/server/stdio.js");
const { registerResources } = await import("./resources/fieldbooks.js");
const { registerReadTools } = await import("./tools/read.js");
const { registerCompileTools } = await import("./tools/compile.js");
const { registerWriteTools } = await import("./tools/write.js");

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
