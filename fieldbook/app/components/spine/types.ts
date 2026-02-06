/**
 * Types for the Spine Layout system
 * 
 * The spine organizes information into four distinct types:
 * - Source: Raw inputs (documents, notes, data)
 * - Synthesis: Condensed interpretations derived from sources
 * - Decision: Explicit commitments with evidence and confidence
 * - Artifact: Generated outputs (PRDs, briefs, strategies)
 * 
 * Reverberation/Propagation fields:
 * - recalcStatus: Visual state for showing recalibration animation
 * - lastDiff: Tracks what changed during last recalibration
 * - contentTemplate: Raw content with {{TOKEN}} placeholders
 * - contentRendered: Resolved content with tokens replaced
 * - lastRenderedAt: When content was last rendered
 */

export type ItemType = "source" | "synthesis" | "decision" | "artifact";

export type ConfidenceLevel = "low" | "medium" | "high";

export type SourceKind = "document" | "url" | "file" | "note";

export type RecalcStatus = "idle" | "recalibrating" | "calibrated";

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

export interface BaseItem {
  id: string;
  type: ItemType;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  /** IDs of items this was derived from */
  derivedFrom?: string[];
  /** Reverberation: Raw content with {{TOKEN}} placeholders */
  contentTemplate?: string;
  /** Reverberation: Resolved content with tokens replaced */
  contentRendered?: string;
  /** Reverberation: When content was last rendered */
  lastRenderedAt?: string;
  /** Reverberation: Current recalibration status for UI feedback */
  recalcStatus?: RecalcStatus;
  /** Reverberation: What changed during last recalibration */
  lastDiff?: DiffSummary | null;
}

export interface SourceItem extends BaseItem {
  type: "source";
  kind: SourceKind;
  /** URL if kind is "url" */
  url?: string;
  /** File metadata if kind is "file" */
  fileType?: string;
  fileSize?: number;
  /** Key excerpts or highlights */
  highlights?: string[];
  /** Version number, incremented on each save */
  version: number;
  /** Timestamp of last explicit save */
  lastSavedAt?: string;
}

export interface SynthesisItem extends BaseItem {
  type: "synthesis";
  /** Key themes identified */
  themes?: string[];
  /** Number of sources this synthesizes */
  sourceCount: number;
}

export interface DecisionItem extends BaseItem {
  type: "decision";
  /** The decision statement */
  statement: string;
  /** Confidence level in this decision */
  confidence: ConfidenceLevel;
  /** Rationale for the decision */
  rationale?: string;
  /** Evidence supporting the decision */
  evidence?: string[];
  /** Alternative options considered */
  alternatives?: string[];
  /** Status of the decision */
  status: "proposed" | "accepted" | "rejected" | "revisiting";
}

export interface ArtifactItem extends BaseItem {
  type: "artifact";
  /** Type of artifact (prd, brief, strategy, etc.) */
  artifactType: string;
  /** Whether this is a draft or finalized */
  status: "draft" | "review" | "final";
  /** Version number */
  version: number;
}

export type SpineItem = SourceItem | SynthesisItem | DecisionItem | ArtifactItem;

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
  /** Type of the referenced node */
  type: ItemType;
  /** Subtype if applicable (e.g., "interview" for source, "decision-brief" for artifact) */
  subtype?: string;
  /** Availability state for this reference */
  availability: LineageAvailability;
  /** Optional snapshot ID if a hard snapshot exists */
  snapshotId?: string;
  /** When this reference was created */
  createdAt: string;
}

/**
 * Extended item with lineage-only flag for filtering
 */
export interface LineageOnlyItem extends BaseItem {
  /** If true, this item is a lineage reference only, not a local item */
  isLineageOnly: true;
  /** The lineage reference details */
  lineageRef: LineageReference;
}

/**
 * Check if an item is a lineage-only reference
 */
export function isLineageOnlyItem(item: SpineItem | LineageOnlyItem): item is LineageOnlyItem {
  return 'isLineageOnly' in item && item.isLineageOnly === true;
}

/**
 * Type guards for item types
 */
export function isSource(item: SpineItem): item is SourceItem {
  return item.type === "source";
}

export function isSynthesis(item: SpineItem): item is SynthesisItem {
  return item.type === "synthesis";
}

export function isDecision(item: SpineItem): item is DecisionItem {
  return item.type === "decision";
}

export function isArtifact(item: SpineItem): item is ArtifactItem {
  return item.type === "artifact";
}
