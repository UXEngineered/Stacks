/**
 * Lineage Compiler — builds `lineage.json`
 *
 * Thin wrapper around the lineage walker that produces a clean,
 * standalone JSON document of the node's subgraph.
 *
 * Pure function: no side effects.
 */

import { walkLineage } from "../lineage/walker";
import type { LineageNode, LineageEdge } from "../lineage/walker";
import type { CompileScope } from "./context";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A node as it appears in the lineage output */
export interface LineageOutputNode {
  id: string;
  type: string;
  title: string;
  status?: string;
  derivedFrom?: string[];
  createdAt?: string;
}

/** The full lineage output document */
export interface CompiledLineage {
  /** Root node the lineage was compiled from */
  root: string;
  /** Scope used for compilation */
  scope: CompileScope;
  /** When this was compiled */
  compiledAt: string;
  /** Version of the lineage format */
  version: "1";
  /** All nodes in the subgraph */
  nodes: LineageOutputNode[];
  /** All edges in the subgraph */
  edges: LineageEdge[];
  /** Summary counts */
  summary: {
    totalNodes: number;
    totalEdges: number;
    sources: number;
    syntheses: number;
    artifacts: number;
    other: number;
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toOutputNode(node: LineageNode): LineageOutputNode {
  return {
    id: node.id,
    type: node.type,
    title: (node.title as string) || "Untitled",
    status: node.status as string | undefined,
    derivedFrom: node.derivedFrom,
    createdAt: node.createdAt as string | undefined,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Compile a lineage document for a given node.
 *
 * @param nodeId  - The root node
 * @param items   - All items in the fieldbook
 * @param scope   - How much lineage to include
 */
export function compileLineage(
  nodeId: string,
  items: LineageNode[],
  scope: CompileScope,
): CompiledLineage {
  const depth: number | "full" = scope === "artifact" ? 0
    : scope === "lineage-1" ? 1
    : "full";

  const graph = walkLineage(nodeId, items, { direction: "both", depth });

  const outputNodes = graph.nodes.map(toOutputNode);

  // Count by type
  const sources = outputNodes.filter((n) => n.type === "source").length;
  const syntheses = outputNodes.filter((n) => n.type === "synthesis").length;
  const artifacts = outputNodes.filter((n) => n.type === "artifact").length;
  const other = outputNodes.length - sources - syntheses - artifacts;

  return {
    root: nodeId,
    scope,
    compiledAt: new Date().toISOString(),
    version: "1",
    nodes: outputNodes,
    edges: graph.edges,
    summary: {
      totalNodes: outputNodes.length,
      totalEdges: graph.edges.length,
      sources,
      syntheses,
      artifacts,
      other,
    },
  };
}
