/**
 * Lineage Walker
 *
 * Recursive graph traversal for Stacks lineage.
 *
 * The graph is implicit — relationships are stored inline on each item:
 *   - Syntheses:  derivedFrom: string[]   (upstream source IDs)
 *   - Artifacts:  derivedFrom: string[]   (upstream synthesis/source IDs)
 *
 * This walker supports configurable depth and direction, with cycle
 * detection via a visited-set to handle any circular references.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Minimal node shape the walker needs — keeps this decoupled from UI types. */
export interface LineageNode {
  id: string;
  type: string;          // "source" | "synthesis" | "artifact" | etc.
  title: string;
  derivedFrom?: string[];
  [key: string]: unknown; // pass-through for extra fields
}

export interface LineageEdge {
  /** Downstream node (the one that derives) */
  from: string;
  /** Upstream node (the one being derived from) */
  to: string;
  /** Relationship label */
  rel: "derived_from" | "informed_by" | "supersedes";
}

export interface LineageGraph {
  /** All nodes reachable within the requested scope (includes the root) */
  nodes: LineageNode[];
  /** All edges discovered during the walk */
  edges: LineageEdge[];
  /** The node the walk started from */
  rootId: string;
}

export interface WalkOptions {
  /** Which direction to walk from the root node */
  direction: "upstream" | "downstream" | "both";
  /**
   * How many hops to walk.
   *   - A number (e.g. 1) means that many hops exactly.
   *   - "full" means walk until there are no more edges.
   */
  depth: number | "full";
}

// ---------------------------------------------------------------------------
// Index helpers
// ---------------------------------------------------------------------------

/** Build a lookup map: nodeId -> node */
function indexById(items: LineageNode[]): Map<string, LineageNode> {
  const map = new Map<string, LineageNode>();
  for (const item of items) {
    map.set(item.id, item);
  }
  return map;
}

/**
 * Build a reverse index: nodeId -> list of nodes that derive from it.
 * This lets us walk *downstream* efficiently.
 */
function buildDownstreamIndex(items: LineageNode[]): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const item of items) {
    const refs = item.derivedFrom;
    if (!refs) continue;
    for (const upstreamId of refs) {
      let list = map.get(upstreamId);
      if (!list) {
        list = [];
        map.set(upstreamId, list);
      }
      list.push(item.id);
    }
  }
  return map;
}

// ---------------------------------------------------------------------------
// Core walk functions
// ---------------------------------------------------------------------------

function walkUpstream(
  startId: string,
  byId: Map<string, LineageNode>,
  maxDepth: number,
  visited: Set<string>,
  nodes: Map<string, LineageNode>,
  edges: LineageEdge[],
) {
  const queue: Array<{ id: string; depth: number }> = [{ id: startId, depth: 0 }];

  while (queue.length > 0) {
    const { id, depth } = queue.shift()!;
    if (visited.has(id)) continue;
    visited.add(id);

    const node = byId.get(id);
    if (!node) continue;
    nodes.set(id, node);

    if (depth >= maxDepth) continue;

    const refs = node.derivedFrom;
    if (!refs) continue;

    for (const upId of refs) {
      edges.push({ from: id, to: upId, rel: "derived_from" });
      if (!visited.has(upId)) {
        queue.push({ id: upId, depth: depth + 1 });
      }
    }
  }
}

function walkDownstream(
  startId: string,
  byId: Map<string, LineageNode>,
  downIndex: Map<string, string[]>,
  maxDepth: number,
  visited: Set<string>,
  nodes: Map<string, LineageNode>,
  edges: LineageEdge[],
) {
  const queue: Array<{ id: string; depth: number }> = [{ id: startId, depth: 0 }];

  while (queue.length > 0) {
    const { id, depth } = queue.shift()!;
    if (visited.has(id)) continue;
    visited.add(id);

    const node = byId.get(id);
    if (!node) continue;
    nodes.set(id, node);

    if (depth >= maxDepth) continue;

    const children = downIndex.get(id);
    if (!children) continue;

    for (const childId of children) {
      edges.push({ from: childId, to: id, rel: "derived_from" });
      if (!visited.has(childId)) {
        queue.push({ id: childId, depth: depth + 1 });
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Walk the lineage graph starting from `nodeId`.
 *
 * @param nodeId  - The starting node
 * @param items   - All items in the fieldbook (flat list)
 * @param opts    - Direction and depth configuration
 * @returns       - The subgraph of reachable nodes and edges
 */
export function walkLineage(
  nodeId: string,
  items: LineageNode[],
  opts: WalkOptions,
): LineageGraph {
  const byId = indexById(items);
  const maxDepth = opts.depth === "full" ? Number.MAX_SAFE_INTEGER : opts.depth;

  const collectedNodes = new Map<string, LineageNode>();
  const collectedEdges: LineageEdge[] = [];

  // Always include the root node itself
  const root = byId.get(nodeId);
  if (root) {
    collectedNodes.set(nodeId, root);
  }

  if (opts.direction === "upstream" || opts.direction === "both") {
    walkUpstream(nodeId, byId, maxDepth, new Set<string>(), collectedNodes, collectedEdges);
  }

  if (opts.direction === "downstream" || opts.direction === "both") {
    const downIndex = buildDownstreamIndex(items);
    walkDownstream(nodeId, byId, downIndex, maxDepth, new Set<string>(), collectedNodes, collectedEdges);
  }

  // De-duplicate edges (same from+to pair)
  const edgeSet = new Set<string>();
  const uniqueEdges: LineageEdge[] = [];
  for (const e of collectedEdges) {
    const key = `${e.from}→${e.to}`;
    if (!edgeSet.has(key)) {
      edgeSet.add(key);
      uniqueEdges.push(e);
    }
  }

  return {
    nodes: Array.from(collectedNodes.values()),
    edges: uniqueEdges,
    rootId: nodeId,
  };
}
