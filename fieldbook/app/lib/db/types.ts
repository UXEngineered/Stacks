/**
 * Database types for Stacks persistence layer
 * 
 * Simple JSON-based storage for demo/prototype use.
 * No authentication, no multi-user support.
 * 
 * Reverberation/Propagation:
 * - facts: tokenized variables stored at Fieldbook level
 * - contentTemplate: raw content with {{TOKEN}} placeholders
 * - contentRendered: resolved content with tokens replaced
 * - recalcStatus: visual indicator for propagation state
 * - lastDiff: tracks what changed during last recalibration
 */

export type SourceType = "interview" | "transcript" | "doc" | "note" | "external_link" | "meeting_transcript" | "email" | "slack_thread" | "data_metric" | "whiteboard";
export type SynthesisType = "pattern" | "theme" | "tension" | "insight" | "comparison" | "framework";
export type ArtifactType = "decision-brief" | "opportunity-map" | "design-rationale" | "research-warrant" | "alignment-map" | "evidence-inventory" | "transition-playbook" | "requirement" | "plan" | "risk_issue" | "recommendation";

/** Unified status across all node types */
export type NodeStatus = "draft" | "proposed" | "canonical" | "superseded";

/** Node visibility / audience level */
export type Visibility = "internal" | "client_shareable" | "client_facing";

/** @deprecated Use NodeStatus instead */
export type ArtifactStatus = "draft" | "review" | "final";
/** @deprecated Use NodeStatus instead */
export type SynthesisStatus = "draft" | "committed";

export type RecalcStatus = "idle" | "recalibrating" | "calibrated";

// ---------------------------------------------------------------------------
// Semantic fields shared across all node types
// ---------------------------------------------------------------------------

export interface SemanticFields {
  /** Unified lifecycle status */
  status: NodeStatus;
  /** Audience level */
  visibility: Visibility;
  /** Freeform classification tags */
  tags: string[];
  /** Accountability owner (optional) */
  owner?: string;
}

// =============================================================================
// Phase 0 Capture Types (minimal artifact capture)
// =============================================================================

export type CaptureType = "external_link" | "note" | "file";

/** Base fields for all capture types */
interface CaptureBase {
  id: string;
  type: CaptureType;
  capturedAt: string;
  createdAt: string;
  updatedAt?: string;
}

/** External link capture - URL to external tool/resource */
export interface ExternalLinkCapture extends CaptureBase {
  type: "external_link";
  url: string;
  title?: string;
}

/** Note capture - simple plain text */
export interface NoteCapture extends CaptureBase {
  type: "note";
  text: string;
}

/** File capture - uploaded file with metadata */
export interface FileCapture extends CaptureBase {
  type: "file";
  filename: string;
  size: number;
  mimeType: string;
  /** Storage key/path for retrieving the file (stubbed for prototype) */
  storageKey: string;
}

/** Union type for all capture types */
export type Capture = ExternalLinkCapture | NoteCapture | FileCapture;

/** Tracks what changed during a recalibration */
export interface DiffSummary {
  before: string;
  after: string;
  start: number;
  end: number;
  message: string;
  /** ID of the source that triggered this change */
  triggeredBySourceId?: string;
  /** Title of the source for display */
  triggeredBySourceTitle?: string;
  /** Snippet of what changed in the source (for context when no direct content change) */
  sourceChangeSnippet?: string;
  /** AI-generated contextual suggestion for how to update this content */
  aiSuggestion?: {
    /** Human-readable description of what changed in the source */
    changeDescription: string;
    /** Suggested action, e.g. "Would you like me to rewrite the 'Control Costs' section?" */
    suggestedAction: string;
    /** Optional: specific section name that may need updating */
    targetSection?: string;
  };
}

/** Base fields for content that supports reverberation */
interface ReverberationFields {
  /** Raw content with {{TOKEN}} placeholders */
  contentTemplate?: string;
  /** Resolved content with tokens replaced by fact values */
  contentRendered?: string;
  /** When content was last rendered from template */
  lastRenderedAt?: string;
  /** Current recalibration status for UI feedback */
  recalcStatus?: RecalcStatus;
  /** What changed during last recalibration */
  lastDiff?: DiffSummary | null;
}

export interface Source extends ReverberationFields, SemanticFields {
  id: string;
  title: string;
  type: SourceType;
  /** Rich text content (for doc/note/interview/transcript types) */
  content: string;
  createdAt: string;
  updatedAt?: string;
  // External link fields (only populated when type = 'external_link')
  /** URL for external link sources */
  url?: string;
  /** Derived hostname/domain for display */
  domain?: string;
  /** Brief note about why this link matters (1-2 lines, NOT a document body) */
  note?: string;
  /** Timestamp when the link was captured */
  capturedAt?: string;
}

export interface Synthesis extends ReverberationFields, SemanticFields {
  id: string;
  title: string;
  /** Semantic kind of synthesis */
  type: SynthesisType;
  content: string;
  derivedFrom: string[]; // source IDs
  createdAt: string;
  updatedAt?: string;
  /** True for auto-generated syntheses that haven't been committed yet */
  needsReview?: boolean;
}

export interface Artifact extends ReverberationFields, SemanticFields {
  id: string;
  type: ArtifactType;
  title: string;
  content: string;
  informedBy: string[]; // synthesis or source IDs
  createdAt: string;
  updatedAt?: string;
}

// =============================================================================
// External Upstream Lineage Types
// =============================================================================

/**
 * Availability state for external lineage references
 * - AVAILABLE: User has access, clickable link to origin
 * - RESTRICTED: User lacks access, show lock icon
 * - SNAPSHOT_ONLY: Only a snapshot exists, not live access
 * - UNKNOWN: Reference exists but access state unknown
 */
export type LineageAvailability = "AVAILABLE" | "RESTRICTED" | "SNAPSHOT_ONLY" | "UNKNOWN";

/**
 * Reference to an upstream node that lives in a different Fieldbook
 * 
 * These are "lineage-only" references - they appear in lineage/derivation
 * views but NOT in the left rail list of local items.
 */
export interface LineageReference {
  /** Unique ID for this reference (not the origin node ID) */
  id: string;
  /** ID of the node in the origin Fieldbook */
  originNodeId: string;
  /** ID of the Fieldbook where the origin node lives */
  originFieldbookId: string;
  /** Human-readable label for the origin Fieldbook (e.g., "Client – Presales") */
  originFieldbookLabel: string;
  /** Title of the referenced node */
  title: string;
  /** Type of the referenced node: "source" | "synthesis" | "artifact" */
  type: "source" | "synthesis" | "artifact";
  /** Subtype if applicable (e.g., "interview" for source, "decision-brief" for artifact) */
  subtype?: string;
  /** Availability state for this reference */
  availability: LineageAvailability;
  /** Optional snapshot ID if a hard snapshot exists */
  snapshotId?: string;
  /** When this reference was created */
  createdAt: string;
}

export interface Fieldbook {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt?: string;
  /** Tokenized facts for reverberation, e.g. { "FSR_CONTEXT_SWITCHING_PCT": "30%" } */
  facts?: Record<string, string>;
  sources: Source[];
  syntheses: Synthesis[];
  artifacts: Artifact[];
  /** Phase 0 captures: simple link/note/file items */
  captures?: Capture[];
  /** History of calibration decisions made by the user */
  calibrationHistory?: CalibrationDecision[];
  /** Parent fieldbook ID if this is a fork (condensed inheritance) */
  parentId?: string;
  /** Context summary describing what carries forward from parent */
  forkContext?: string;
  /** 
   * External lineage references - upstream nodes from parent fieldbooks
   * that are NOT copied locally but should appear in lineage views
   */
  lineageReferences?: LineageReference[];
}

/** Tracks a calibration decision made by the user */
export interface CalibrationDecision {
  id: string;
  /** When the decision was made */
  timestamp: string;
  /** The item that was affected (synthesis or artifact) */
  itemId: string;
  itemTitle: string;
  itemType: "synthesis" | "artifact";
  /** The source that triggered the calibration */
  sourceId: string;
  sourceTitle: string;
  /** What the AI suggested */
  suggestion: string;
  /** The decision made: "ignored" or "changed" */
  decision: "ignored" | "changed";
  /** Optional: section that was affected */
  targetSection?: string;
}

export interface StacksDatabase {
  fieldbooks: Fieldbook[];
}

// Helper type for creating new items (without id and timestamps)
export type CreateSource = Omit<Source, "id" | "createdAt" | "updatedAt">;
export type CreateSynthesis = Omit<Synthesis, "id" | "createdAt" | "updatedAt">;
export type CreateArtifact = Omit<Artifact, "id" | "createdAt" | "updatedAt">;
export type CreateFieldbook = Omit<Fieldbook, "id" | "createdAt" | "updatedAt" | "sources" | "syntheses" | "artifacts" | "captures">;

// Capture creation types (without id and system timestamps)
export type CreateExternalLinkCapture = Omit<ExternalLinkCapture, "id" | "createdAt" | "updatedAt">;
export type CreateNoteCapture = Omit<NoteCapture, "id" | "createdAt" | "updatedAt">;
export type CreateFileCapture = Omit<FileCapture, "id" | "createdAt" | "updatedAt">;
export type CreateCapture = CreateExternalLinkCapture | CreateNoteCapture | CreateFileCapture;

// Helper type for updating items (all fields optional except id)
export type UpdateSource = Partial<Omit<Source, "id" | "createdAt">> & { id: string };
export type UpdateSynthesis = Partial<Omit<Synthesis, "id" | "createdAt">> & { id: string };
export type UpdateArtifact = Partial<Omit<Artifact, "id" | "createdAt">> & { id: string };
export type UpdateCapture = Partial<Omit<Capture, "id" | "createdAt" | "type">> & { id: string };
export type UpdateFieldbook = Partial<Omit<Fieldbook, "id" | "createdAt" | "sources" | "syntheses" | "artifacts" | "captures">> & { id: string; lineageReferences?: LineageReference[] };
