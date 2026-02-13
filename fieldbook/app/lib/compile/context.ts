/**
 * Context Compiler — builds `context.json`
 *
 * Pure function: takes items + options, returns a structured JSON object
 * that represents the full context around a node (for agents or humans).
 *
 * No HTTP, no side effects, no file I/O.
 */

import { walkLineage } from "../lineage/walker";
import type { LineageNode } from "../lineage/walker";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CompileTarget = "human" | "agent" | "both";
export type CompileScope = "artifact" | "lineage-1" | "lineage-full";

export interface CompileContextOptions {
  /** The node to compile context for */
  nodeId: string;
  /** What the output is for */
  target: CompileTarget;
  /** How much lineage to include */
  scope: CompileScope;
}

/** A node as it appears in compiled output */
export interface CompiledNode {
  id: string;
  type: string;
  title: string;
  status?: string;
  content: string;
  /** Plain text version of the content (TipTap JSON → text) */
  contentText?: string;
  derivedFrom?: string[];
  createdAt?: string;
  updatedAt?: string;
}

/** Agent-specific task suggestion */
export interface AgentTask {
  action: string;
  target: string;
  reason: string;
}

/** The full compiled context object */
export interface CompiledContext {
  /** Metadata */
  compiledAt: string;
  scope: CompileScope;
  target: CompileTarget;
  version: "1";

  /** The root node this was compiled from */
  root: CompiledNode;

  /** Upstream lineage (sources and syntheses that feed into the root) */
  upstream: CompiledNode[];

  /** Downstream lineage (artifacts/syntheses derived from the root) */
  downstream: CompiledNode[];

  /** All edges in the subgraph */
  edges: Array<{ from: string; to: string; rel: string }>;

  /** Agent-specific: suggested tasks based on content state */
  tasks?: AgentTask[];

  /** Human-specific: summary of the derivation chain */
  derivationSummary?: string;
}

// ---------------------------------------------------------------------------
// Content extraction
// ---------------------------------------------------------------------------

interface TipTapNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: TipTapNode[];
  text?: string;
  marks?: { type: string }[];
}

/** Extract plain text from TipTap JSON content (recursive) */
function tiptapNodeToText(node: TipTapNode): string {
  if (node.text) return node.text;
  if (node.content) return node.content.map(tiptapNodeToText).join("");
  return "";
}

function tiptapToText(content: string): string {
  try {
    const doc = JSON.parse(content);
    if (doc?.type === "doc" && Array.isArray(doc.content)) {
      return doc.content
        .map((node: TipTapNode) => {
          switch (node.type) {
            case "heading": {
              const level = (node.attrs?.level as number) || 1;
              return `${"#".repeat(level)} ${tiptapNodeToText(node)}`;
            }
            case "paragraph":
              return tiptapNodeToText(node);
            case "bulletList":
            case "orderedList":
              return (node.content || [])
                .map((item, i) => {
                  const text = item.content
                    ? item.content.map(tiptapNodeToText).join("")
                    : "";
                  return node.type === "orderedList"
                    ? `${i + 1}. ${text}`
                    : `- ${text}`;
                })
                .join("\n");
            case "blockquote":
              return `> ${node.content?.map(tiptapNodeToText).join("\n> ") || ""}`;
            case "codeBlock":
              return `\`\`\`\n${tiptapNodeToText(node)}\n\`\`\``;
            default:
              return tiptapNodeToText(node);
          }
        })
        .filter(Boolean)
        .join("\n\n");
    }
  } catch {
    // Not JSON — return as-is
  }
  return content;
}

// ---------------------------------------------------------------------------
// Node conversion
// ---------------------------------------------------------------------------

function toCompiledNode(node: LineageNode): CompiledNode {
  const content = (node.content as string) || "";
  return {
    id: node.id,
    type: node.type,
    title: (node.title as string) || "Untitled",
    status: node.status as string | undefined,
    content,
    contentText: tiptapToText(content),
    derivedFrom: node.derivedFrom,
    createdAt: node.createdAt as string | undefined,
    updatedAt: node.updatedAt as string | undefined,
  };
}

// ---------------------------------------------------------------------------
// Task generation (agent target)
// ---------------------------------------------------------------------------

function generateTasks(
  root: CompiledNode,
  upstream: CompiledNode[],
): AgentTask[] {
  const tasks: AgentTask[] = [];

  // Check for draft status
  if (root.status === "draft") {
    tasks.push({
      action: "review",
      target: root.id,
      reason: `"${root.title}" is still in draft status and may need review.`,
    });
  }

  // Check for missing upstream
  if (upstream.length === 0) {
    tasks.push({
      action: "add_sources",
      target: root.id,
      reason: `"${root.title}" has no upstream sources or syntheses — consider adding evidence.`,
    });
  }

  // Check for drafts in upstream
  const drafts = upstream.filter((n) => n.status === "draft");
  if (drafts.length > 0) {
    tasks.push({
      action: "review_upstream",
      target: drafts.map((d) => d.id).join(","),
      reason: `${drafts.length} upstream node(s) are still drafts: ${drafts.map((d) => `"${d.title}"`).join(", ")}`,
    });
  }

  return tasks;
}

// ---------------------------------------------------------------------------
// Derivation summary (human target)
// ---------------------------------------------------------------------------

function generateDerivationSummary(
  root: CompiledNode,
  upstream: CompiledNode[],
  downstream: CompiledNode[],
): string {
  const sources = upstream.filter((n) => n.type === "source");
  const syntheses = upstream.filter((n) => n.type === "synthesis");
  const artifacts = downstream.filter((n) => n.type === "artifact");

  const parts: string[] = [];
  parts.push(`"${root.title}" (${root.type})`);

  if (sources.length > 0) {
    parts.push(
      `Draws from ${sources.length} source(s): ${sources.map((s) => `"${s.title}"`).join(", ")}`,
    );
  }

  if (syntheses.length > 0) {
    parts.push(
      `Through ${syntheses.length} synthesis(es): ${syntheses.map((s) => `"${s.title}"`).join(", ")}`,
    );
  }

  if (artifacts.length > 0) {
    parts.push(
      `Informs ${artifacts.length} downstream artifact(s): ${artifacts.map((a) => `"${a.title}"`).join(", ")}`,
    );
  }

  return parts.join("\n");
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Compile a full context object for a given node.
 *
 * @param items   - All items in the fieldbook as LineageNode[]
 * @param options - What to compile and how
 * @returns       - The compiled context object
 */
export function compileContext(
  items: LineageNode[],
  options: CompileContextOptions,
): CompiledContext {
  const { nodeId, target, scope } = options;

  // Determine walk depth from scope
  const depth: number | "full" = scope === "artifact" ? 0
    : scope === "lineage-1" ? 1
    : "full";

  // Walk upstream
  const upGraph = depth === 0
    ? { nodes: [], edges: [], rootId: nodeId }
    : walkLineage(nodeId, items, { direction: "upstream", depth });

  // Walk downstream (always 1 hop for context — we want to know what this feeds)
  const downGraph = walkLineage(nodeId, items, { direction: "downstream", depth: 1 });

  // Find the root node
  const rootNode = items.find((i) => i.id === nodeId);
  if (!rootNode) {
    throw new Error(`Node ${nodeId} not found in items`);
  }

  const root = toCompiledNode(rootNode);
  const upstream = upGraph.nodes
    .filter((n) => n.id !== nodeId)
    .map(toCompiledNode);
  const downstream = downGraph.nodes
    .filter((n) => n.id !== nodeId)
    .map(toCompiledNode);

  // Merge edges
  const allEdges = [...upGraph.edges, ...downGraph.edges];
  const edgeSet = new Set<string>();
  const edges = allEdges.filter((e) => {
    const key = `${e.from}→${e.to}`;
    if (edgeSet.has(key)) return false;
    edgeSet.add(key);
    return true;
  });

  const result: CompiledContext = {
    compiledAt: new Date().toISOString(),
    scope,
    target,
    version: "1",
    root,
    upstream,
    downstream,
    edges,
  };

  // Add target-specific sections
  if (target === "agent" || target === "both") {
    result.tasks = generateTasks(root, upstream);
  }

  if (target === "human" || target === "both") {
    result.derivationSummary = generateDerivationSummary(root, upstream, downstream);
  }

  return result;
}
