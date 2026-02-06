/**
 * Source Sync Status Computation
 *
 * Computes whether a derived artifact is in sync with its source documents.
 * A derived artifact is "out_of_sync" when any of its source documents
 * have been updated since the artifact was derived.
 */

import type {
  SourceSet,
  SourceSnapshot,
  SourceStatus,
  SourceSyncStatus,
  ChangedSource,
} from "./version";
import { getVersionHistory } from "./store";

// =============================================================================
// SYNC STATUS COMPUTATION
// =============================================================================

/**
 * Compute the sync status for a derived artifact based on its source set.
 *
 * @param sourceSet - The source set captured when the artifact was derived
 * @returns Complete source status including changed and missing sources
 */
export function computeSourceStatus(sourceSet: SourceSet): SourceStatus {
  const changedSources: ChangedSource[] = [];
  const missingSources: string[] = [];

  for (const sourceSnapshot of sourceSet.sources) {
    const history = getVersionHistory(sourceSnapshot.documentId);

    if (!history) {
      // Source document no longer exists
      missingSources.push(sourceSnapshot.documentId);
      continue;
    }

    // Check if current version is different from derived version
    if (history.currentVersionId !== sourceSnapshot.versionId) {
      // Find how many versions behind
      const derivedVersionIndex = history.versions.findIndex(
        (v) => v.versionId === sourceSnapshot.versionId
      );

      // Versions are in reverse chronological order (newest first)
      // So if derivedVersionIndex is 2, we're 2 versions behind
      const versionsBehind =
        derivedVersionIndex >= 0
          ? derivedVersionIndex
          : history.currentVersionNumber - sourceSnapshot.versionNumber;

      changedSources.push({
        documentId: sourceSnapshot.documentId,
        title: sourceSnapshot.title,
        derivedVersionId: sourceSnapshot.versionId,
        derivedVersionNumber: sourceSnapshot.versionNumber,
        currentVersionId: history.currentVersionId,
        currentVersionNumber: history.currentVersionNumber,
        versionsBehind,
      });
    }
  }

  const isOutOfSync = changedSources.length > 0 || missingSources.length > 0;

  return {
    status: isOutOfSync ? "out_of_sync" : "in_sync",
    changedSources,
    missingSources,
    totalSources: sourceSet.sources.length,
    computedAt: new Date().toISOString(),
  };
}

/**
 * Quick check if a source set is in sync (without full details).
 * More efficient when you only need the boolean status.
 *
 * @param sourceSet - The source set to check
 * @returns true if all sources are in sync, false otherwise
 */
export function isSourceSetInSync(sourceSet: SourceSet): boolean {
  for (const sourceSnapshot of sourceSet.sources) {
    const history = getVersionHistory(sourceSnapshot.documentId);

    if (!history) {
      return false; // Missing source = out of sync
    }

    if (history.currentVersionId !== sourceSnapshot.versionId) {
      return false;
    }
  }

  return true;
}

/**
 * Get a simple sync status string for a source set.
 *
 * @param sourceSet - The source set to check
 * @returns "in_sync" or "out_of_sync"
 */
export function getSourceSyncStatus(
  sourceSet: SourceSet | undefined
): SourceSyncStatus {
  if (!sourceSet || sourceSet.sources.length === 0) {
    return "in_sync"; // No sources = always in sync
  }

  return isSourceSetInSync(sourceSet) ? "in_sync" : "out_of_sync";
}

// =============================================================================
// SOURCE SET CREATION
// =============================================================================

/**
 * Create a source snapshot for a document at its current version.
 *
 * @param documentId - The document ID
 * @param title - The document title
 * @returns A source snapshot or null if document doesn't exist
 */
export function createSourceSnapshot(
  documentId: string,
  title: string
): SourceSnapshot | null {
  const history = getVersionHistory(documentId);

  if (!history) {
    return null;
  }

  return {
    documentId,
    versionId: history.currentVersionId,
    versionNumber: history.currentVersionNumber,
    title,
    capturedAt: new Date().toISOString(),
  };
}

/**
 * Create a source set from multiple documents.
 *
 * @param sources - Array of { documentId, title } for each source
 * @returns A complete source set
 */
export function createSourceSet(
  sources: Array<{ documentId: string; title: string }>
): SourceSet {
  const snapshots: SourceSnapshot[] = [];

  for (const source of sources) {
    const snapshot = createSourceSnapshot(source.documentId, source.title);
    if (snapshot) {
      snapshots.push(snapshot);
    }
  }

  return {
    sources: snapshots,
    derivedAt: new Date().toISOString(),
  };
}

// =============================================================================
// SOURCE SET UPDATE
// =============================================================================

/**
 * Update a source set to the current versions of all sources.
 * Used when "refreshing" a derived artifact to mark it as in sync.
 *
 * @param sourceSet - The existing source set
 * @returns A new source set with updated version snapshots
 */
export function refreshSourceSet(sourceSet: SourceSet): SourceSet {
  const updatedSnapshots: SourceSnapshot[] = [];

  for (const oldSnapshot of sourceSet.sources) {
    const history = getVersionHistory(oldSnapshot.documentId);

    if (history) {
      // Get current version
      const currentVersion = history.versions[0]; // Newest is first

      updatedSnapshots.push({
        documentId: oldSnapshot.documentId,
        versionId: history.currentVersionId,
        versionNumber: history.currentVersionNumber,
        title: currentVersion?.author?.name
          ? oldSnapshot.title
          : oldSnapshot.title, // Keep existing title
        capturedAt: new Date().toISOString(),
      });
    }
    // Omit missing sources from the refreshed set
  }

  return {
    sources: updatedSnapshots,
    derivedAt: new Date().toISOString(),
  };
}
