/**
 * MCP Resources — Fieldbooks, Nodes, and Catalog
 *
 * Exposes Stacks content as browsable resources that AI tools can discover.
 *
 * Resource URIs:
 *   stacks://fieldbooks              — list all fieldbooks
 *   stacks://fieldbooks/{id}         — single fieldbook summary
 *   stacks://fieldbooks/{id}/nodes/{nodeId} — single node content
 *   stacks://catalog                 — allowed enum values (types, statuses, visibilities)
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getAllFieldbooks, getFieldbook } from "../../app/lib/db/index.js";
import { catalog } from "../../app/lib/catalog.js";

export function registerResources(server: McpServer): void {
  // ── List all fieldbooks ──────────────────────────────────────────────
  server.resource(
    "fieldbooks-list",
    "stacks://fieldbooks",
    {
      description: "List all Stacks fieldbooks with IDs, names, and node counts",
      mimeType: "application/json",
    },
    async () => {
      const fieldbooks = await getAllFieldbooks();
      const summary = fieldbooks.map((fb) => ({
        id: fb.id,
        name: fb.name,
        description: fb.description,
        sources: fb.sources.length,
        syntheses: fb.syntheses.length,
        artifacts: fb.artifacts.length,
        createdAt: fb.createdAt,
        updatedAt: fb.updatedAt,
      }));

      return {
        contents: [
          {
            uri: "stacks://fieldbooks",
            mimeType: "application/json",
            text: JSON.stringify(summary, null, 2),
          },
        ],
      };
    },
  );

  // ── Single fieldbook (with resource template for dynamic ID) ──────
  server.resource(
    "fieldbook-detail",
    "stacks://fieldbooks/{id}",
    {
      description: "Get a single fieldbook summary including all node titles and IDs",
      mimeType: "application/json",
    },
    async (uri, params) => {
      const id = (params as { id: string }).id;
      const fb = await getFieldbook(id);

      if (!fb) {
        return {
          contents: [
            {
              uri: uri.href,
              mimeType: "text/plain",
              text: `Fieldbook "${id}" not found`,
            },
          ],
        };
      }

      const summary = {
        id: fb.id,
        name: fb.name,
        description: fb.description,
        createdAt: fb.createdAt,
        updatedAt: fb.updatedAt,
        sources: fb.sources.map((s) => ({ id: s.id, title: s.title, type: s.type })),
        syntheses: fb.syntheses.map((s) => ({
          id: s.id,
          title: s.title,
          derivedFrom: s.derivedFrom,
          status: s.status,
        })),
        artifacts: fb.artifacts.map((a) => ({
          id: a.id,
          title: a.title,
          type: a.type,
          status: a.status,
          informedBy: a.informedBy,
        })),
      };

      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify(summary, null, 2),
          },
        ],
      };
    },
  );

  // ── Single node content ───────────────────────────────────────────
  server.resource(
    "node-detail",
    "stacks://fieldbooks/{id}/nodes/{nodeId}",
    {
      description: "Get the full content and metadata of a single node (source, synthesis, or artifact)",
      mimeType: "application/json",
    },
    async (uri, params) => {
      const { id, nodeId } = params as { id: string; nodeId: string };
      const fb = await getFieldbook(id);

      if (!fb) {
        return {
          contents: [
            {
              uri: uri.href,
              mimeType: "text/plain",
              text: `Fieldbook "${id}" not found`,
            },
          ],
        };
      }

      // Search across all node types
      const source = fb.sources.find((s) => s.id === nodeId);
      const synthesis = fb.syntheses.find((s) => s.id === nodeId);
      const artifact = fb.artifacts.find((a) => a.id === nodeId);
      const node = source || synthesis || artifact;

      if (!node) {
        return {
          contents: [
            {
              uri: uri.href,
              mimeType: "text/plain",
              text: `Node "${nodeId}" not found in fieldbook "${id}"`,
            },
          ],
        };
      }

      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify(node, null, 2),
          },
        ],
      };
    },
  );

  // ── Catalog — allowed enum values ────────────────────────────────────
  server.resource(
    "catalog",
    "stacks://catalog",
    {
      name: "Stacks Catalog",
      description:
        "Allowed enum values for source types, synthesis types, artifact types, statuses, and visibilities. Use this to know valid field values when creating or updating nodes.",
      mimeType: "application/json",
    },
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: "application/json",
          text: JSON.stringify(catalog, null, 2),
        },
      ],
    }),
  );
}
