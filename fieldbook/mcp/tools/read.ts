/**
 * MCP Read Tools — search, list, and get lineage
 *
 * These are read-only tools that let agents explore Stacks content.
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getAllFieldbooks, getFieldbook } from "../../app/lib/db/index.js";
import { walkLineage } from "../../app/lib/lineage/walker.js";
import type { LineageNode } from "../../app/lib/lineage/walker.js";

// ---------------------------------------------------------------------------
// Helper: convert fieldbook items to LineageNodes
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
      derivedFrom: a.informedBy, // artifacts use "informedBy" but walker expects "derivedFrom"
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

export function registerReadTools(server: McpServer): void {
  // ── search_stacks ──────────────────────────────────────────────────
  server.tool(
    "search_stacks",
    "Full-text search across all fieldbooks. Returns matching nodes with their fieldbook context.",
    {
      query: z.string().describe("Search query (case-insensitive substring match)"),
      type: z
        .enum(["source", "synthesis", "artifact", "all"])
        .optional()
        .default("all")
        .describe("Filter by node type"),
      limit: z
        .number()
        .optional()
        .default(20)
        .describe("Maximum results to return"),
    },
    async ({ query, type, limit }) => {
      const fieldbooks = await getAllFieldbooks();
      const lowerQuery = query.toLowerCase();
      const results: Array<{
        fieldbookId: string;
        fieldbookName: string;
        nodeId: string;
        nodeType: string;
        title: string;
        snippet: string;
      }> = [];

      for (const fb of fieldbooks) {
        if (results.length >= limit) break;

        const searchIn = (nodeType: string, items: Array<{ id: string; title: string; content: string }>) => {
          if (type !== "all" && type !== nodeType) return;
          for (const item of items) {
            if (results.length >= limit) break;
            const titleMatch = item.title?.toLowerCase().includes(lowerQuery);
            const contentMatch = item.content?.toLowerCase().includes(lowerQuery);
            if (titleMatch || contentMatch) {
              // Extract a snippet around the match
              let snippet = "";
              if (contentMatch) {
                const idx = item.content.toLowerCase().indexOf(lowerQuery);
                const start = Math.max(0, idx - 60);
                const end = Math.min(item.content.length, idx + query.length + 60);
                snippet = (start > 0 ? "..." : "") + item.content.slice(start, end) + (end < item.content.length ? "..." : "");
              } else {
                snippet = item.content?.slice(0, 120) || "";
              }

              results.push({
                fieldbookId: fb.id,
                fieldbookName: fb.name,
                nodeId: item.id,
                nodeType,
                title: item.title,
                snippet,
              });
            }
          }
        };

        searchIn("source", fb.sources);
        searchIn("synthesis", fb.syntheses);
        searchIn("artifact", fb.artifacts);
      }

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              { query, type, resultCount: results.length, results },
              null,
              2,
            ),
          },
        ],
      };
    },
  );

  // ── list_nodes ─────────────────────────────────────────────────────
  server.tool(
    "list_nodes",
    "List all nodes in a fieldbook with their types, titles, statuses, and relationships.",
    {
      fieldbookId: z.string().describe("The fieldbook ID"),
    },
    async ({ fieldbookId }) => {
      const fb = await getFieldbook(fieldbookId);
      if (!fb) {
        return {
          content: [{ type: "text" as const, text: `Fieldbook "${fieldbookId}" not found` }],
          isError: true,
        };
      }

      const nodes = [
        ...fb.sources.map((s) => ({
          id: s.id,
          type: "source",
          title: s.title,
          sourceType: s.type,
          createdAt: s.createdAt,
        })),
        ...fb.syntheses.map((s) => ({
          id: s.id,
          type: "synthesis",
          title: s.title,
          status: s.status,
          derivedFrom: s.derivedFrom,
          createdAt: s.createdAt,
        })),
        ...fb.artifacts.map((a) => ({
          id: a.id,
          type: "artifact",
          title: a.title,
          artifactType: a.type,
          status: a.status,
          informedBy: a.informedBy,
          createdAt: a.createdAt,
        })),
      ];

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                fieldbookId: fb.id,
                fieldbookName: fb.name,
                totalNodes: nodes.length,
                nodes,
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  );

  // ── get_lineage ────────────────────────────────────────────────────
  server.tool(
    "get_lineage",
    "Get the lineage graph for a specific node — see what feeds into it (upstream) and what it feeds (downstream).",
    {
      fieldbookId: z.string().describe("The fieldbook ID"),
      nodeId: z.string().describe("The node ID to get lineage for"),
      direction: z
        .enum(["upstream", "downstream", "both"])
        .optional()
        .default("both")
        .describe("Which direction to walk"),
      depth: z
        .union([z.number().int().positive(), z.literal("full")])
        .optional()
        .default("full")
        .describe("How many hops to walk (number or 'full')"),
    },
    async ({ fieldbookId, nodeId, direction, depth }) => {
      const fb = await getFieldbook(fieldbookId);
      if (!fb) {
        return {
          content: [{ type: "text" as const, text: `Fieldbook "${fieldbookId}" not found` }],
          isError: true,
        };
      }

      const items = fieldbookToLineageNodes(fb);
      const graph = walkLineage(nodeId, items, {
        direction,
        depth: depth === "full" ? "full" : (depth as number),
      });

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                rootId: graph.rootId,
                nodeCount: graph.nodes.length,
                edgeCount: graph.edges.length,
                nodes: graph.nodes.map((n) => ({
                  id: n.id,
                  type: n.type,
                  title: n.title,
                })),
                edges: graph.edges,
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  );
}
