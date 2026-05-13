/**
 * MCP Read Tools — search, list, and get lineage
 *
 * These are read-only tools that let agents explore Stacks content.
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getFieldbook } from "../../app/lib/db/index.js";
import { walkLineage } from "../../app/lib/lineage/walker.js";
import type { LineageNode } from "../../app/lib/lineage/walker.js";
import { searchStacks } from "../../app/lib/search.js";

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
      status: s.status,
      visibility: s.visibility,
      tags: s.tags,
      owner: s.owner,
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
      visibility: s.visibility,
      tags: s.tags,
      owner: s.owner,
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
      visibility: a.visibility,
      tags: a.tags,
      owner: a.owner,
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
    "Full-text search across all fieldbooks. Returns matching nodes with their fieldbook context and semantic metadata.",
    {
      query: z.string().describe("Search query (case-insensitive substring match)"),
      type: z
        .enum(["source", "synthesis", "artifact", "all"])
        .optional()
        .default("all")
        .describe("Filter by node type"),
      status: z
        .enum(["draft", "proposed", "canonical", "superseded"])
        .optional()
        .describe("Filter by unified status"),
      visibility: z
        .enum(["internal", "client_shareable", "client_facing"])
        .optional()
        .describe("Filter by visibility level"),
      tag: z.string().optional().describe("Filter by tag (node must include this tag)"),
      limit: z
        .number()
        .optional()
        .default(20)
        .describe("Maximum results to return"),
    },
    async ({ query, type, status, visibility, tag, limit }) => {
      const results = await searchStacks({ query, type, status, visibility, tag, limit });

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              { query, type, status, visibility, tag, resultCount: results.length, results },
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
          status: s.status,
          visibility: s.visibility,
          tags: s.tags,
          owner: s.owner,
          createdAt: s.createdAt,
        })),
        ...fb.syntheses.map((s) => ({
          id: s.id,
          type: "synthesis",
          title: s.title,
          synthesisType: (s as unknown as Record<string, unknown>).type,
          status: s.status,
          visibility: s.visibility,
          tags: s.tags,
          owner: s.owner,
          derivedFrom: s.derivedFrom,
          createdAt: s.createdAt,
        })),
        ...fb.artifacts.map((a) => ({
          id: a.id,
          type: "artifact",
          title: a.title,
          artifactType: a.type,
          status: a.status,
          visibility: a.visibility,
          tags: a.tags,
          owner: a.owner,
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
                  status: n.status,
                  visibility: n.visibility,
                  tags: n.tags,
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
