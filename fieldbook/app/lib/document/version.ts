/**
 * Fieldbook Document Versioning Model
 *
 * Supports:
 * - Immutable version snapshots
 * - Change metadata (who, when, what)
 * - Source document references for derived artifacts
 * - Linear version history (branching not supported in v1)
 *
 * Design notes:
 * - Versions are immutable snapshots, not diffs
 * - This simplifies retrieval at cost of storage
 * - For consulting docs, full snapshots are more valuable than diffs
 *   (you want to see exactly what was shared/approved)
 */

import type { Document, Block } from "./types";

// =============================================================================
// CHANGE METADATA
// =============================================================================

/**
 * User reference (lightweight, for embedding in versions)
 */
export interface UserRef {
  id: string;
  name: string;
  email?: string;
}

/**
 * Types of changes that can be made to a document
 */
export type ChangeType =
  | "created"           // Document created
  | "edited"            // Content modified
  | "restructured"      // Blocks reordered/reorganized
  | "metadata_updated"  // Title, tags, etc. changed
  | "restored";         // Restored from previous version

/**
 * Summary of what changed in this version
 */
export interface ChangeSummary {
  type: ChangeType;
  /** Human-readable description of the change */
  description?: string;
  /** IDs of blocks that were added */
  blocksAdded?: string[];
  /** IDs of blocks that were modified */
  blocksModified?: string[];
  /** IDs of blocks that were removed */
  blocksRemoved?: string[];
}

// =============================================================================
// VERSION MODEL
// =============================================================================

/**
 * A complete version snapshot of a document
 */
export interface DocumentVersion {
  /** Unique version identifier */
  versionId: string;

  /** The document ID this version belongs to */
  documentId: string;

  /** Sequential version number (1, 2, 3...) */
  versionNumber: number;

  /** ISO 8601 timestamp when this version was created */
  createdAt: string;

  /** Who created this version */
  author: UserRef;

  /** What changed in this version */
  change: ChangeSummary;

  /**
   * The complete document snapshot at this version
   * Stored inline for easy retrieval
   */
  snapshot: Document;

  /**
   * Optional: ID of the previous version
   * Null for the first version
   */
  previousVersionId: string | null;
}

// =============================================================================
// SOURCE REFERENCES (for derived artifacts)
// =============================================================================

/**
 * Reference to a specific location in a source document
 * Used when content is derived from or quotes another document
 */
export interface SourceReference {
  /** Source document ID */
  documentId: string;

  /** Optional: specific version that was referenced */
  versionId?: string;

  /** Optional: specific block ID within the document */
  blockId?: string;

  /** Optional: character range within the block */
  range?: {
    start: number;
    end: number;
  };

  /** When this reference was created */
  referencedAt: string;

  /** Type of derivation */
  relationship: SourceRelationship;
}

/**
 * How derived content relates to its source
 */
export type SourceRelationship =
  | "quoted"      // Direct quote from source
  | "summarized"  // Summarization of source content
  | "derived"     // Inspired by or built upon source
  | "references"  // General reference (not content derivation)
  | "supersedes"; // This doc replaces/updates the source

/**
 * A block that tracks its sources
 * Extends any block type with source tracking
 */
export interface SourceTrackedBlock {
  /** The block's own ID */
  blockId: string;

  /** Sources this block's content derives from */
  sources: SourceReference[];
}

/**
 * Document-level source tracking
 * Attached to documents that are derived from others
 */
export interface DocumentSources {
  /** Primary source documents */
  primarySources: SourceReference[];

  /** Per-block source mappings */
  blockSources: SourceTrackedBlock[];
}

// =============================================================================
// SOURCE SET (for derived artifacts)
// =============================================================================

/**
 * A snapshot of a source document at the time a derived artifact was created.
 * This allows us to track whether sources have changed since derivation.
 */
export interface SourceSnapshot {
  /** The source document ID */
  documentId: string;

  /** The version ID that was used when deriving */
  versionId: string;

  /** The version number for display purposes */
  versionNumber: number;

  /** Title of the source at the time of derivation */
  title: string;

  /** When this snapshot was captured */
  capturedAt: string;
}

/**
 * The complete source set for a derived artifact.
 * Captures all source documents and their versions at derivation time.
 */
export interface SourceSet {
  /** All source documents with their version snapshots */
  sources: SourceSnapshot[];

  /** When this derived artifact was created */
  derivedAt: string;
}

/**
 * Sync status for a derived artifact
 */
export type SourceSyncStatus = "in_sync" | "out_of_sync";

/**
 * Information about a source that has changed since derivation
 */
export interface ChangedSource {
  /** The source document ID */
  documentId: string;

  /** Title of the source document */
  title: string;

  /** Version used when deriving */
  derivedVersionId: string;
  derivedVersionNumber: number;

  /** Current version of the source */
  currentVersionId: string;
  currentVersionNumber: number;

  /** How many versions behind */
  versionsBehind: number;
}

/**
 * Complete source status for a derived artifact
 */
export interface SourceStatus {
  /** Overall sync status */
  status: SourceSyncStatus;

  /** List of sources that have changed (empty if in_sync) */
  changedSources: ChangedSource[];

  /** List of sources that no longer exist */
  missingSources: string[];

  /** Total number of sources */
  totalSources: number;

  /** When this status was computed */
  computedAt: string;
}

// =============================================================================
// VERSION HISTORY
// =============================================================================

/**
 * Lightweight version entry for history listings
 * (doesn't include full snapshot)
 */
export interface VersionHistoryEntry {
  versionId: string;
  versionNumber: number;
  createdAt: string;
  author: UserRef;
  change: ChangeSummary;
}

/**
 * Complete version history for a document
 */
export interface DocumentVersionHistory {
  documentId: string;
  currentVersionId: string;
  currentVersionNumber: number;
  versions: VersionHistoryEntry[];
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Create a new version from a document
 */
export function createVersion(
  document: Document,
  author: UserRef,
  change: ChangeSummary,
  previousVersion?: DocumentVersion
): Omit<DocumentVersion, "versionId"> {
  return {
    documentId: document.meta.id,
    versionNumber: previousVersion ? previousVersion.versionNumber + 1 : 1,
    createdAt: new Date().toISOString(),
    author,
    change,
    snapshot: document,
    previousVersionId: previousVersion?.versionId ?? null,
  };
}

/**
 * Compare two documents to generate a change summary
 * (Simplified - real implementation would do deep diff)
 */
export function generateChangeSummary(
  oldDoc: Document | null,
  newDoc: Document
): ChangeSummary {
  if (!oldDoc) {
    return {
      type: "created",
      description: "Document created",
      blocksAdded: newDoc.blocks.map((b) => b.id),
    };
  }

  const oldBlockIds = new Set(oldDoc.blocks.map((b) => b.id));
  const newBlockIds = new Set(newDoc.blocks.map((b) => b.id));

  const blocksAdded = newDoc.blocks
    .filter((b) => !oldBlockIds.has(b.id))
    .map((b) => b.id);

  const blocksRemoved = oldDoc.blocks
    .filter((b) => !newBlockIds.has(b.id))
    .map((b) => b.id);

  // Simplified: mark all common blocks as potentially modified
  // Real implementation would deep compare block content
  const blocksModified = newDoc.blocks
    .filter((b) => oldBlockIds.has(b.id))
    .map((b) => b.id);

  return {
    type: "edited",
    blocksAdded: blocksAdded.length > 0 ? blocksAdded : undefined,
    blocksRemoved: blocksRemoved.length > 0 ? blocksRemoved : undefined,
    blocksModified: blocksModified.length > 0 ? blocksModified : undefined,
  };
}

/**
 * Create a source reference
 */
export function createSourceReference(
  documentId: string,
  relationship: SourceRelationship,
  options?: {
    versionId?: string;
    blockId?: string;
    range?: { start: number; end: number };
  }
): SourceReference {
  return {
    documentId,
    relationship,
    referencedAt: new Date().toISOString(),
    ...options,
  };
}
