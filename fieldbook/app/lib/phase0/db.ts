/**
 * Phase 0 Database Layer
 * 
 * JSON file-based persistence for Phase 0 prototype.
 * This will be replaced with Prisma/PostgreSQL when ready.
 * 
 * Data file: /data/phase0.json
 */

import { promises as fs } from "fs";
import path from "path";
import type {
  Fieldbook,
  Node,
  Edge,
  CreateFieldbookRequest,
  ForkFieldbookRequest,
  CreateNodeRequest,
  CreateRelationshipRequest,
  NodeType,
  RelationshipType,
} from "./types";
import { ErrorCodes } from "./types";

// =============================================================================
// DATA STRUCTURE
// =============================================================================

interface Phase0Database {
  fieldbooks: Fieldbook[];
  nodes: Node[];
  edges: Edge[];
}

const DATA_FILE = path.join(process.cwd(), "data", "phase0.json");

// =============================================================================
// FILE OPERATIONS
// =============================================================================

async function ensureDataFile(): Promise<void> {
  try {
    await fs.access(DATA_FILE);
  } catch {
    // Create directory and file if they don't exist
    await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
    await fs.writeFile(DATA_FILE, JSON.stringify({ fieldbooks: [], nodes: [], edges: [] }, null, 2));
  }
}

async function loadData(): Promise<Phase0Database> {
  await ensureDataFile();
  const content = await fs.readFile(DATA_FILE, "utf-8");
  return JSON.parse(content);
}

async function saveData(data: Phase0Database): Promise<void> {
  await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// =============================================================================
// FIELDBOOK OPERATIONS
// =============================================================================

export async function createFieldbook(request: CreateFieldbookRequest): Promise<Fieldbook> {
  const data = await loadData();
  const now = new Date().toISOString();
  
  const fieldbook: Fieldbook = {
    id: generateId(),
    name: request.name,
    description: request.description,
    createdAt: now,
    updatedAt: now,
  };
  
  data.fieldbooks.push(fieldbook);
  await saveData(data);
  
  return fieldbook;
}

export async function getFieldbook(id: string): Promise<Fieldbook | null> {
  const data = await loadData();
  return data.fieldbooks.find(fb => fb.id === id) || null;
}

export async function listFieldbooks(): Promise<Fieldbook[]> {
  const data = await loadData();
  return data.fieldbooks.sort((a, b) => 
    new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

export async function forkFieldbook(
  parentId: string, 
  request: ForkFieldbookRequest
): Promise<{ fieldbook: Fieldbook; anchorNodes: Node[] }> {
  const data = await loadData();
  const parent = data.fieldbooks.find(fb => fb.id === parentId);
  
  if (!parent) {
    throw { code: ErrorCodes.NOT_FOUND, message: "Parent fieldbook not found" };
  }
  
  const now = new Date().toISOString();
  
  // Create the forked fieldbook
  const fieldbook: Fieldbook = {
    id: generateId(),
    name: request.name,
    description: request.description,
    parentId: parentId,
    forkContext: request.forkContext,
    createdAt: now,
    updatedAt: now,
  };
  
  data.fieldbooks.push(fieldbook);
  
  // Copy selected anchor nodes (if any)
  const anchorNodes: Node[] = [];
  if (request.anchorNodeIds && request.anchorNodeIds.length > 0) {
    for (const nodeId of request.anchorNodeIds) {
      const originalNode = data.nodes.find(n => n.id === nodeId && n.fieldbookId === parentId);
      if (originalNode) {
        const copiedNode: Node = {
          ...originalNode,
          id: generateId(),
          fieldbookId: fieldbook.id,
          createdAt: now,
          updatedAt: now,
        };
        data.nodes.push(copiedNode);
        anchorNodes.push(copiedNode);
      }
    }
  }
  
  await saveData(data);
  
  return { fieldbook, anchorNodes };
}

// =============================================================================
// NODE OPERATIONS
// =============================================================================

export async function createNode(
  fieldbookId: string, 
  request: CreateNodeRequest
): Promise<Node> {
  const data = await loadData();
  
  // Validate fieldbook exists
  const fieldbook = data.fieldbooks.find(fb => fb.id === fieldbookId);
  if (!fieldbook) {
    throw { code: ErrorCodes.NOT_FOUND, message: "Fieldbook not found" };
  }
  
  // Validate node type
  const validNodeTypes: NodeType[] = ["source", "synthesis", "artifact"];
  if (!validNodeTypes.includes(request.nodeType)) {
    throw { code: ErrorCodes.INVALID_NODE_TYPE, message: `Invalid node type: ${request.nodeType}` };
  }
  
  const now = new Date().toISOString();
  
  const node: Node = {
    id: generateId(),
    fieldbookId,
    nodeType: request.nodeType,
    subtype: request.subtype,
    title: request.title,
    content: request.content,
    metadata: request.metadata,
    createdAt: now,
    updatedAt: now,
  };
  
  data.nodes.push(node);
  
  // Update fieldbook timestamp
  fieldbook.updatedAt = now;
  
  await saveData(data);
  
  return node;
}

export async function getNode(id: string): Promise<Node | null> {
  const data = await loadData();
  return data.nodes.find(n => n.id === id) || null;
}

export async function getNodesForFieldbook(
  fieldbookId: string, 
  nodeType?: NodeType
): Promise<Node[]> {
  const data = await loadData();
  let nodes = data.nodes.filter(n => n.fieldbookId === fieldbookId);
  
  if (nodeType) {
    nodes = nodes.filter(n => n.nodeType === nodeType);
  }
  
  return nodes.sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function updateNode(
  id: string, 
  updates: Partial<Pick<Node, "title" | "content" | "metadata" | "subtype">>
): Promise<Node | null> {
  const data = await loadData();
  const nodeIndex = data.nodes.findIndex(n => n.id === id);
  
  if (nodeIndex === -1) return null;
  
  const now = new Date().toISOString();
  data.nodes[nodeIndex] = {
    ...data.nodes[nodeIndex],
    ...updates,
    updatedAt: now,
  };
  
  await saveData(data);
  
  return data.nodes[nodeIndex];
}

export async function deleteNode(id: string): Promise<boolean> {
  const data = await loadData();
  const nodeIndex = data.nodes.findIndex(n => n.id === id);
  
  if (nodeIndex === -1) return false;
  
  // Remove the node
  data.nodes.splice(nodeIndex, 1);
  
  // Remove all edges involving this node
  data.edges = data.edges.filter(
    e => e.sourceNodeId !== id && e.targetNodeId !== id
  );
  
  await saveData(data);
  
  return true;
}

// =============================================================================
// EDGE OPERATIONS
// =============================================================================

export async function createEdge(
  fieldbookId: string,
  request: CreateRelationshipRequest
): Promise<Edge> {
  const data = await loadData();
  
  // Validate fieldbook exists
  const fieldbook = data.fieldbooks.find(fb => fb.id === fieldbookId);
  if (!fieldbook) {
    throw { code: ErrorCodes.NOT_FOUND, message: "Fieldbook not found" };
  }
  
  // Validate relationship type
  const validRelationships: RelationshipType[] = [
    "derived_from", "informed_by", "superseded", "related_to"
  ];
  if (!validRelationships.includes(request.relationship)) {
    throw { 
      code: ErrorCodes.INVALID_RELATIONSHIP, 
      message: `Invalid relationship: ${request.relationship}` 
    };
  }
  
  // Get source and target nodes
  const sourceNode = data.nodes.find(n => n.id === request.sourceNodeId);
  const targetNode = data.nodes.find(n => n.id === request.targetNodeId);
  
  if (!sourceNode) {
    throw { code: ErrorCodes.NOT_FOUND, message: "Source node not found" };
  }
  if (!targetNode) {
    throw { code: ErrorCodes.NOT_FOUND, message: "Target node not found" };
  }
  
  // Validate both nodes belong to the same fieldbook
  if (sourceNode.fieldbookId !== fieldbookId || targetNode.fieldbookId !== fieldbookId) {
    throw { 
      code: ErrorCodes.CROSS_FIELDBOOK_EDGE, 
      message: "Both nodes must belong to the same fieldbook" 
    };
  }
  
  // Validate no self-loop
  if (request.sourceNodeId === request.targetNodeId) {
    throw { 
      code: ErrorCodes.SELF_LOOP_EDGE, 
      message: "Self-referential edges are not allowed" 
    };
  }
  
  // Check for duplicate edge
  const duplicate = data.edges.find(
    e => e.sourceNodeId === request.sourceNodeId && 
         e.targetNodeId === request.targetNodeId && 
         e.relationship === request.relationship
  );
  if (duplicate) {
    throw { 
      code: ErrorCodes.DUPLICATE_EDGE, 
      message: "This relationship already exists" 
    };
  }
  
  const edge: Edge = {
    id: generateId(),
    fieldbookId,
    sourceNodeId: request.sourceNodeId,
    targetNodeId: request.targetNodeId,
    relationship: request.relationship,
    createdAt: new Date().toISOString(),
  };
  
  data.edges.push(edge);
  await saveData(data);
  
  return edge;
}

export async function getEdgesForFieldbook(fieldbookId: string): Promise<Edge[]> {
  const data = await loadData();
  return data.edges.filter(e => e.fieldbookId === fieldbookId);
}

export async function getEdgesForNode(nodeId: string): Promise<{ incoming: Edge[]; outgoing: Edge[] }> {
  const data = await loadData();
  return {
    incoming: data.edges.filter(e => e.targetNodeId === nodeId),
    outgoing: data.edges.filter(e => e.sourceNodeId === nodeId),
  };
}

export async function deleteEdge(id: string): Promise<boolean> {
  const data = await loadData();
  const edgeIndex = data.edges.findIndex(e => e.id === id);
  
  if (edgeIndex === -1) return false;
  
  data.edges.splice(edgeIndex, 1);
  await saveData(data);
  
  return true;
}

// =============================================================================
// QUERY OPERATIONS
// =============================================================================

export async function getTimeline(fieldbookId: string): Promise<{
  items: Array<{ node: Node; incomingEdges: Edge[]; outgoingEdges: Edge[] }>;
  total: number;
}> {
  const data = await loadData();
  
  const nodes = data.nodes
    .filter(n => n.fieldbookId === fieldbookId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  
  const items = nodes.map(node => ({
    node,
    incomingEdges: data.edges.filter(e => e.targetNodeId === node.id),
    outgoingEdges: data.edges.filter(e => e.sourceNodeId === node.id),
  }));
  
  return { items, total: items.length };
}

export async function getGraph(fieldbookId: string): Promise<{ nodes: Node[]; edges: Edge[] }> {
  const data = await loadData();
  
  return {
    nodes: data.nodes.filter(n => n.fieldbookId === fieldbookId),
    edges: data.edges.filter(e => e.fieldbookId === fieldbookId),
  };
}

export async function search(
  fieldbookId: string, 
  query: string, 
  nodeType?: NodeType,
  limit: number = 20
): Promise<{ results: Array<{ node: Node; matchedField: "title" | "content"; snippet?: string }>; total: number; query: string }> {
  const data = await loadData();
  const queryLower = query.toLowerCase();
  
  let nodes = data.nodes.filter(n => n.fieldbookId === fieldbookId);
  
  if (nodeType) {
    nodes = nodes.filter(n => n.nodeType === nodeType);
  }
  
  const results: Array<{ node: Node; matchedField: "title" | "content"; snippet?: string }> = [];
  
  for (const node of nodes) {
    // Search in title
    if (node.title.toLowerCase().includes(queryLower)) {
      results.push({ node, matchedField: "title" });
      continue;
    }
    
    // Search in content (extract text from TipTap JSON)
    if (node.content) {
      const contentText = extractTextFromContent(node.content);
      if (contentText.toLowerCase().includes(queryLower)) {
        // Create snippet around match
        const matchIndex = contentText.toLowerCase().indexOf(queryLower);
        const start = Math.max(0, matchIndex - 50);
        const end = Math.min(contentText.length, matchIndex + query.length + 50);
        const snippet = (start > 0 ? "..." : "") + 
                       contentText.slice(start, end) + 
                       (end < contentText.length ? "..." : "");
        
        results.push({ node, matchedField: "content", snippet });
      }
    }
  }
  
  return {
    results: results.slice(0, limit),
    total: results.length,
    query,
  };
}

// Helper to extract plain text from TipTap JSON
function extractTextFromContent(content: Record<string, unknown>): string {
  const texts: string[] = [];
  
  function traverse(node: unknown): void {
    if (!node || typeof node !== "object") return;
    
    const obj = node as Record<string, unknown>;
    
    if (obj.text && typeof obj.text === "string") {
      texts.push(obj.text);
    }
    
    if (Array.isArray(obj.content)) {
      for (const child of obj.content) {
        traverse(child);
      }
    }
  }
  
  traverse(content);
  return texts.join(" ");
}

// =============================================================================
// STATS
// =============================================================================

export async function getFieldbookStats(fieldbookId: string): Promise<{
  nodeCount: number;
  edgeCount: number;
  nodesByType: Record<NodeType, number>;
}> {
  const data = await loadData();
  
  const nodes = data.nodes.filter(n => n.fieldbookId === fieldbookId);
  const edges = data.edges.filter(e => e.fieldbookId === fieldbookId);
  
  const nodesByType: Record<NodeType, number> = {
    source: 0,
    synthesis: 0,
    artifact: 0,
  };
  
  for (const node of nodes) {
    nodesByType[node.nodeType]++;
  }
  
  return {
    nodeCount: nodes.length,
    edgeCount: edges.length,
    nodesByType,
  };
}
