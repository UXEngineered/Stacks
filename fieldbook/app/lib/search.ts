/**
 * Full-text search across all fieldbooks.
 *
 * Shared core module consumed by both the REST API and MCP server.
 */

import { getAllFieldbooks } from "@/app/lib/db";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SearchResult {
  fieldbookId: string;
  fieldbookName: string;
  nodeId: string;
  nodeType: "source" | "synthesis" | "artifact";
  title: string;
  snippet: string;
}

export interface SearchOptions {
  /** Case-insensitive substring to match against title and content */
  query: string;
  /** Filter by node type (default: "all") */
  type?: "source" | "synthesis" | "artifact" | "all";
  /** Maximum results to return (default: 20) */
  limit?: number;
}

// ---------------------------------------------------------------------------
// Helper: extract a plain-text snippet from content (which may be TipTap JSON)
// ---------------------------------------------------------------------------

function extractSnippet(
  content: string | undefined,
  query: string,
  snippetRadius = 80,
): string {
  if (!content) return "";

  // Try to extract plain text from TipTap JSON
  let text = content;
  if (content.startsWith("{")) {
    try {
      const doc = JSON.parse(content);
      const parts: string[] = [];
      const walk = (node: Record<string, unknown>) => {
        if (typeof node.text === "string") parts.push(node.text);
        if (Array.isArray(node.content)) {
          for (const child of node.content) walk(child as Record<string, unknown>);
        }
      };
      walk(doc);
      text = parts.join(" ");
    } catch {
      // Not valid JSON — search raw string
    }
  }

  const lower = text.toLowerCase();
  const idx = lower.indexOf(query.toLowerCase());

  if (idx === -1) return text.slice(0, snippetRadius * 2);

  const start = Math.max(0, idx - snippetRadius);
  const end = Math.min(text.length, idx + query.length + snippetRadius);
  return (
    (start > 0 ? "..." : "") +
    text.slice(start, end) +
    (end < text.length ? "..." : "")
  );
}

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

export async function searchStacks(opts: SearchOptions): Promise<SearchResult[]> {
  const { query, type = "all", limit = 20 } = opts;
  const lowerQuery = query.toLowerCase();
  const results: SearchResult[] = [];

  const fieldbooks = await getAllFieldbooks();

  for (const fb of fieldbooks) {
    if (results.length >= limit) break;

    const search = (
      nodeType: "source" | "synthesis" | "artifact",
      items: Array<{ id: string; title: string; content?: string }>,
    ) => {
      if (type !== "all" && type !== nodeType) return;
      for (const item of items) {
        if (results.length >= limit) break;

        const titleMatch = item.title?.toLowerCase().includes(lowerQuery);
        const contentStr = typeof item.content === "string" ? item.content : "";
        const contentMatch = contentStr.toLowerCase().includes(lowerQuery);

        if (titleMatch || contentMatch) {
          results.push({
            fieldbookId: fb.id,
            fieldbookName: fb.name,
            nodeId: item.id,
            nodeType,
            title: item.title,
            snippet: contentMatch
              ? extractSnippet(contentStr, query)
              : extractSnippet(contentStr, query),
          });
        }
      }
    };

    search("source", fb.sources as Array<{ id: string; title: string; content?: string }>);
    search("synthesis", fb.syntheses as Array<{ id: string; title: string; content?: string }>);
    search("artifact", fb.artifacts as Array<{ id: string; title: string; content?: string }>);
  }

  return results;
}
