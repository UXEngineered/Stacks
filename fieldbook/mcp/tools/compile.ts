/**
 * MCP Compile Tool — get_context
 *
 * The core tool for agents: compile a rich context bundle for any node,
 * ready for agent consumption or human sharing.
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getFieldbook } from "../../app/lib/db/index.js";
import { compileContext } from "../../app/lib/compile/context.js";
import type { CompileTarget, CompileScope } from "../../app/lib/compile/context.js";
import { compileMarkdown } from "../../app/lib/compile/markdown.js";
import { compileLineage } from "../../app/lib/compile/lineage.js";
import type { LineageNode } from "../../app/lib/lineage/walker.js";

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function fieldbookToLineageNodes(fb: Awaited<ReturnType<typeof getFieldbook>>): LineageNode[] {
  if (!fb) return [];
  const nodes: LineageNode[] = [];

  for (const s of fb.sources) {
    nodes.push({
      id: s.id,
      type: "source",
      title: s.title,
      content: s.content,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    });
  }

  for (const s of fb.syntheses) {
    nodes.push({
      id: s.id,
      type: "synthesis",
      title: s.title,
      content: s.content,
      derivedFrom: s.derivedFrom,
      status: s.status,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    });
  }

  for (const a of fb.artifacts) {
    nodes.push({
      id: a.id,
      type: "artifact",
      title: a.title,
      content: a.content,
      derivedFrom: a.informedBy,
      status: a.status,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
    });
  }

  return nodes;
}

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

export function registerCompileTools(server: McpServer): void {
  server.tool(
    "get_context",
    "Compile a rich context bundle for a node. Returns structured JSON with the node's content, upstream/downstream lineage, and optional task suggestions. This is the primary tool for getting Stacks content ready for agent work.",
    {
      fieldbookId: z.string().describe("The fieldbook ID"),
      nodeId: z.string().describe("The node ID to compile context for"),
      target: z
        .enum(["human", "agent", "both"])
        .optional()
        .default("agent")
        .describe("Who the output is for: 'human' (brief), 'agent' (context + tasks), or 'both'"),
      scope: z
        .enum(["artifact", "lineage-1", "lineage-full"])
        .optional()
        .default("lineage-1")
        .describe("How much lineage to include: 'artifact' (node only), 'lineage-1' (1 hop), 'lineage-full' (entire chain)"),
      format: z
        .enum(["json", "markdown", "lineage"])
        .optional()
        .default("json")
        .describe("Output format: 'json' (full context), 'markdown' (human-readable), 'lineage' (graph only)"),
    },
    async ({ fieldbookId, nodeId, target, scope, format }) => {
      const fb = await getFieldbook(fieldbookId);
      if (!fb) {
        return {
          content: [{ type: "text" as const, text: `Fieldbook "${fieldbookId}" not found` }],
          isError: true,
        };
      }

      const items = fieldbookToLineageNodes(fb);

      // Check node exists
      if (!items.find((i) => i.id === nodeId)) {
        return {
          content: [{ type: "text" as const, text: `Node "${nodeId}" not found in fieldbook "${fieldbookId}"` }],
          isError: true,
        };
      }

      switch (format) {
        case "json": {
          const ctx = compileContext(items, {
            nodeId,
            target: target as CompileTarget,
            scope: scope as CompileScope,
          });
          return {
            content: [{ type: "text" as const, text: JSON.stringify(ctx, null, 2) }],
          };
        }

        case "markdown": {
          const ctx = compileContext(items, {
            nodeId,
            target: target as CompileTarget,
            scope: scope as CompileScope,
          });
          const md = compileMarkdown(ctx);
          return {
            content: [{ type: "text" as const, text: md }],
          };
        }

        case "lineage": {
          const lin = compileLineage(nodeId, items, scope as CompileScope);
          return {
            content: [{ type: "text" as const, text: JSON.stringify(lin, null, 2) }],
          };
        }

        default:
          return {
            content: [{ type: "text" as const, text: `Unknown format: ${format}` }],
            isError: true,
          };
      }
    },
  );
}
