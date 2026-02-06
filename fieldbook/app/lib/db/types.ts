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

export type SourceType = "interview" | "transcript" | "doc" | "note";
export type ArtifactType = "decision-brief" | "opportunity-map" | "design-rationale" | "research-warrant" | "alignment-map" | "evidence-inventory" | "transition-playbook";
export type ArtifactStatus = "draft" | "review" | "final";
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

export interface Source extends ReverberationFields {
  id: string;
  title: string;
  type: SourceType;
  content: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Synthesis extends ReverberationFields {
  id: string;
  title: string;
  content: string;
  derivedFrom: string[]; // source IDs
  createdAt: string;
  updatedAt?: string;
}

export interface Artifact extends ReverberationFields {
  id: string;
  type: ArtifactType;
  title: string;
  content: string;
  informedBy: string[]; // synthesis or source IDs
  status: ArtifactStatus;
  createdAt: string;
  updatedAt?: string;
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
  /** History of calibration decisions made by the user */
  calibrationHistory?: CalibrationDecision[];
  /** Parent fieldbook ID if this is a fork (condensed inheritance) */
  parentId?: string;
  /** Context summary describing what carries forward from parent */
  forkContext?: string;
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
export type CreateFieldbook = Omit<Fieldbook, "id" | "createdAt" | "updatedAt" | "sources" | "syntheses" | "artifacts">;

// Helper type for updating items (all fields optional except id)
export type UpdateSource = Partial<Omit<Source, "id" | "createdAt">> & { id: string };
export type UpdateSynthesis = Partial<Omit<Synthesis, "id" | "createdAt">> & { id: string };
export type UpdateArtifact = Partial<Omit<Artifact, "id" | "createdAt">> & { id: string };
export type UpdateFieldbook = Partial<Omit<Fieldbook, "id" | "createdAt" | "sources" | "syntheses" | "artifacts">> & { id: string };
