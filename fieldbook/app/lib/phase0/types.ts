/**
 * Phase 0 Domain Types
 * 
 * Typed interfaces for the lineage-first domain model.
 * These types align with the Prisma schema in /prisma/schema.prisma.
 * 
 * IMPORTANT: NodeType represents semantic roles, NOT lifecycle stages.
 * There is no workflow implied. Nodes do not "progress" through types.
 */

// =============================================================================
// ENUMS
// =============================================================================

export type NodeType = "source" | "synthesis" | "artifact";

export type RelationshipType = 
  | "derived_from"   // Target was synthesized/created from source
  | "informed_by"    // Target was influenced by source
  | "superseded"     // Target replaces source (versioning)
  | "related_to";    // Soft association without derivation semantics

// Subtypes for finer classification
export type SourceSubtype = "link" | "note" | "file" | "interview" | "transcript" | "document";
export type ArtifactSubtype = 
  | "decision-brief" 
  | "opportunity-map" 
  | "design-rationale" 
  | "research-warrant"
  | "alignment-map"
  | "evidence-inventory"
  | "transition-playbook"
  | "custom";

// =============================================================================
// CORE ENTITIES
// =============================================================================

/**
 * Fieldbook - Root container for a body of work
 * Supports forking with condensed inheritance via parent reference
 */
export interface Fieldbook {
  id: string;
  name: string;
  description?: string;
  
  // Fork support
  parentId?: string;
  forkContext?: string; // Condensed inheritance from parent
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
}

/**
 * Node - Unified content entity
 * Represents sources (inputs), syntheses (interpretations), or artifacts (outputs)
 */
export interface Node {
  id: string;
  fieldbookId: string;
  
  // Type classification
  nodeType: NodeType;
  subtype?: string;
  
  // Content
  title: string;
  content?: Record<string, unknown>; // TipTap/ProseMirror JSON
  
  // Type-specific metadata
  metadata?: NodeMetadata;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
}

/**
 * Type-specific metadata for nodes
 */
export type NodeMetadata = 
  | LinkMetadata 
  | FileMetadata 
  | InterviewMetadata 
  | Record<string, unknown>;

export interface LinkMetadata {
  url: string;
  fetchedAt?: string;
  snapshotContent?: string;
}

export interface FileMetadata {
  fileName: string;
  fileSize: number;
  mimeType: string;
  storageKey?: string;
}

export interface InterviewMetadata {
  interviewee?: string;
  date?: string;
  durationMinutes?: number;
}

/**
 * Edge - Directed relationship between nodes
 * Direction: source_node (downstream) → target_node (upstream)
 */
export interface Edge {
  id: string;
  fieldbookId: string;
  sourceNodeId: string;
  targetNodeId: string;
  relationship: RelationshipType;
  createdAt: string;
}

// =============================================================================
// API REQUEST TYPES
// =============================================================================

export interface CreateFieldbookRequest {
  name: string;
  description?: string;
}

export interface ForkFieldbookRequest {
  name: string;
  description?: string;
  forkContext?: string;
  /** Optional: IDs of nodes to copy as anchors */
  anchorNodeIds?: string[];
}

export interface CreateNodeRequest {
  nodeType: NodeType;
  subtype?: string;
  title: string;
  content?: Record<string, unknown>;
  metadata?: NodeMetadata;
}

export interface CreateRelationshipRequest {
  sourceNodeId: string;
  targetNodeId: string;
  relationship: RelationshipType;
}

export interface SearchRequest {
  q: string;
  nodeType?: NodeType;
  limit?: number;
}

// =============================================================================
// API RESPONSE TYPES
// =============================================================================

export interface FieldbookDetailResponse {
  fieldbook: Fieldbook;
  nodeCount: number;
  edgeCount: number;
  parent?: Fieldbook;
}

export interface TimelineResponse {
  items: TimelineItem[];
  total: number;
}

export interface TimelineItem {
  node: Node;
  incomingEdges: Edge[];
  outgoingEdges: Edge[];
}

export interface GraphResponse {
  nodes: Node[];
  edges: Edge[];
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
  query: string;
}

export interface SearchResult {
  node: Node;
  matchedField: "title" | "content";
  snippet?: string;
}

// =============================================================================
// ERROR TYPES
// =============================================================================

export interface ApiError {
  error: string;
  code: string;
  details?: Record<string, unknown>;
}

export const ErrorCodes = {
  NOT_FOUND: "NOT_FOUND",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  CROSS_FIELDBOOK_EDGE: "CROSS_FIELDBOOK_EDGE",
  SELF_LOOP_EDGE: "SELF_LOOP_EDGE",
  DUPLICATE_EDGE: "DUPLICATE_EDGE",
  INVALID_NODE_TYPE: "INVALID_NODE_TYPE",
  INVALID_RELATIONSHIP: "INVALID_RELATIONSHIP",
} as const;
