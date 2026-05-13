/**
 * MCP Write Tools — governed agent mutations
 *
 * These tools let agents create sources and propose edits/recalibrations.
 * All writes go through the governance layer:
 *   - Creates are allowed and emit movement events
 *   - Edits create new versions (never overwrite canonical content)
 *   - Recalibrations are proposals (draft + diff), not auto-applied
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  guardedCreateSource,
  guardedUpdateSource,
  guardedUpdateSynthesis,
  guardedUpdateArtifact,
  proposeRecalibration,
} from "../../app/lib/governance.js";
import type { Actor } from "../../app/lib/api/envelope.js";

// Default actor for MCP tool calls (agent identity)
function mcpActor(agentName?: string): Actor {
  return {
    kind: "agent",
    id: "mcp",
    name: agentName || "mcp-client",
  };
}

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

export function registerWriteTools(server: McpServer): void {
  // ── create_source ──────────────────────────────────────────────────
  server.tool(
    "create_source",
    "Add a new source to a fieldbook. Agents can freely create sources. A movement event is automatically recorded.",
    {
      fieldbookId: z.string().describe("The fieldbook ID to add the source to"),
      title: z.string().describe("Title of the source"),
      content: z.string().describe("Content of the source (plain text or TipTap JSON)"),
      type: z
        .enum(["interview", "transcript", "doc", "note", "external_link"])
        .optional()
        .default("doc")
        .describe("Type of source"),
      url: z.string().optional().describe("URL for external_link sources"),
      note: z.string().optional().describe("Brief note about why this source matters"),
      agentName: z.string().optional().describe("Name of the agent creating this source"),
    },
    async ({ fieldbookId, title, content, type, url, note, agentName }) => {
      try {
        const result = await guardedCreateSource(
          fieldbookId,
          { title, content, type, status: "draft" as const, visibility: "internal" as const, tags: [], url, note },
          mcpActor(agentName),
        );

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  success: true,
                  source: {
                    id: result.item.id,
                    title: result.item.title,
                    type: result.item.type,
                    createdAt: result.item.createdAt,
                  },
                  movementEvent: {
                    id: result.event.id,
                    type: result.event.type,
                    title: result.event.title,
                  },
                },
                null,
                2,
              ),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error creating source: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  // ── propose_edit ───────────────────────────────────────────────────
  server.tool(
    "propose_edit",
    "Propose an edit to an existing node. IMPORTANT: This does NOT modify the original node. Instead, it creates a new version linked to the original. The human owner must review and approve any changes to canonical content.",
    {
      fieldbookId: z.string().describe("The fieldbook ID"),
      nodeId: z.string().describe("The node ID to propose an edit for"),
      nodeType: z
        .enum(["source", "synthesis", "artifact"])
        .describe("Type of the node being edited"),
      title: z.string().optional().describe("New title (leave empty to keep current)"),
      content: z.string().optional().describe("New content (leave empty to keep current)"),
      agentName: z.string().optional().describe("Name of the agent proposing this edit"),
    },
    async ({ fieldbookId, nodeId, nodeType, title, content, agentName }) => {
      try {
        const updates: Record<string, string> = {};
        if (title) updates.title = title;
        if (content) updates.content = content;

        if (Object.keys(updates).length === 0) {
          return {
            content: [{ type: "text" as const, text: "No changes provided. Please specify at least a new title or content." }],
            isError: true,
          };
        }

        let result;
        const actor = mcpActor(agentName);

        switch (nodeType) {
          case "source":
            result = await guardedUpdateSource(fieldbookId, nodeId, updates, actor);
            break;
          case "synthesis":
            result = await guardedUpdateSynthesis(fieldbookId, nodeId, updates, actor);
            break;
          case "artifact":
            result = await guardedUpdateArtifact(fieldbookId, nodeId, updates, actor);
            break;
        }

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  success: true,
                  isNewVersion: result.isNewVersion,
                  message: result.isNewVersion
                    ? `A new version has been created (${result.item.id}). The original node (${nodeId}) was NOT modified.`
                    : `Node ${nodeId} was updated in place.`,
                  newNode: {
                    id: result.item.id,
                    title: result.item.title,
                  },
                  movementEvent: {
                    id: result.event.id,
                    type: result.event.type,
                    title: result.event.title,
                  },
                },
                null,
                2,
              ),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error proposing edit: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  // ── propose_recalibration ──────────────────────────────────────────
  server.tool(
    "propose_recalibration",
    "Propose a recalibration for a synthesis or artifact. This does NOT auto-apply changes — it creates a proposal with a rationale and optional new content for a human to review. A movement event is recorded.",
    {
      fieldbookId: z.string().describe("The fieldbook ID"),
      nodeId: z.string().describe("The synthesis or artifact ID to propose recalibration for"),
      rationale: z.string().describe("Explanation of why recalibration is needed and what should change"),
      proposedContent: z
        .string()
        .optional()
        .describe("Optional proposed new content. If provided, this becomes the suggested replacement."),
      agentName: z.string().optional().describe("Name of the agent proposing this recalibration"),
    },
    async ({ fieldbookId, nodeId, rationale, proposedContent, agentName }) => {
      try {
        const proposal = await proposeRecalibration(
          fieldbookId,
          nodeId,
          { rationale, proposedContent },
          mcpActor(agentName),
        );

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  success: true,
                  proposal: {
                    nodeId: proposal.nodeId,
                    nodeType: proposal.nodeType,
                    nodeTitle: proposal.nodeTitle,
                    rationale: proposal.rationale,
                    hasProposedContent: !!proposal.proposedContent,
                    currentContentPreview: proposal.currentContent.slice(0, 200) + (proposal.currentContent.length > 200 ? "..." : ""),
                  },
                  movementEvent: {
                    id: proposal.event.id,
                    type: proposal.event.type,
                    title: proposal.event.title,
                    summary: proposal.event.summary,
                  },
                  message: "Recalibration proposal recorded. A human must review and approve before changes are applied.",
                },
                null,
                2,
              ),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error proposing recalibration: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}
