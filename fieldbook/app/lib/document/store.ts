/**
 * Document Store
 *
 * In-memory data store for documents and versions.
 * In production, this would be backed by a database (Postgres, etc.)
 *
 * Design:
 * - Documents table: current state of each document
 * - Versions table: immutable snapshots with parent chain
 * - Every save creates a new version
 */

import type { Document, DocumentMeta } from "./types";
import type {
  DocumentVersion,
  UserRef,
  ChangeSummary,
  VersionHistoryEntry,
  DocumentVersionHistory,
} from "./version";
import { generateChangeSummary } from "./version";
import { rolesPermissionsDocument } from "./examples/roles-permissions";

// =============================================================================
// ID GENERATION
// =============================================================================

let versionCounter = 0;

function generateVersionId(): string {
  versionCounter++;
  return `ver-${Date.now()}-${versionCounter.toString().padStart(4, "0")}`;
}

// =============================================================================
// IN-MEMORY STORES
// =============================================================================

/**
 * Store for current document state
 * Key: document ID
 */
const documentsStore = new Map<string, Document>();

/**
 * Store for all versions
 * Key: version ID
 */
const versionsStore = new Map<string, DocumentVersion>();

/**
 * Index: document ID -> version IDs (ordered by version number)
 */
const documentVersionsIndex = new Map<string, string[]>();

// =============================================================================
// DOCUMENT OPERATIONS
// =============================================================================

/**
 * Get a document by ID
 */
export function getDocument(documentId: string): Document | null {
  return documentsStore.get(documentId) ?? null;
}

/**
 * Get all documents (for listing)
 */
export function listDocuments(): DocumentMeta[] {
  return Array.from(documentsStore.values()).map((doc) => doc.meta);
}

/**
 * Save a document (creates a new version)
 *
 * @param document - The document to save
 * @param author - Who is making the change
 * @param commitMessage - Optional description of the change
 * @returns The created version
 */
export function saveDocument(
  document: Document,
  author: UserRef,
  commitMessage?: string
): DocumentVersion {
  const documentId = document.meta.id;
  const existingDoc = documentsStore.get(documentId);
  const existingVersionIds = documentVersionsIndex.get(documentId) ?? [];
  const previousVersionId =
    existingVersionIds.length > 0
      ? existingVersionIds[existingVersionIds.length - 1]
      : null;
  const previousVersion = previousVersionId
    ? versionsStore.get(previousVersionId)
    : null;

  // Generate change summary
  const change: ChangeSummary = {
    ...generateChangeSummary(existingDoc ?? null, document),
    description: commitMessage,
  };

  // Create version
  const version: DocumentVersion = {
    versionId: generateVersionId(),
    documentId,
    versionNumber: previousVersion ? previousVersion.versionNumber + 1 : 1,
    createdAt: new Date().toISOString(),
    author,
    change,
    snapshot: structuredClone(document), // Deep clone
    previousVersionId,
  };

  // Update document's updatedAt
  document.meta.updatedAt = version.createdAt;

  // Store everything
  documentsStore.set(documentId, document);
  versionsStore.set(version.versionId, version);

  // Update index
  const versionIds = documentVersionsIndex.get(documentId) ?? [];
  versionIds.push(version.versionId);
  documentVersionsIndex.set(documentId, versionIds);

  return version;
}

/**
 * Create a new document (initial save)
 */
export function createDocument(
  document: Document,
  author: UserRef
): DocumentVersion {
  if (documentsStore.has(document.meta.id)) {
    throw new Error(`Document ${document.meta.id} already exists`);
  }
  return saveDocument(document, author, "Document created");
}

// =============================================================================
// VERSION OPERATIONS
// =============================================================================

/**
 * Get a specific version by ID
 */
export function getVersion(versionId: string): DocumentVersion | null {
  return versionsStore.get(versionId) ?? null;
}

/**
 * Get all versions for a document
 */
export function getDocumentVersions(
  documentId: string
): DocumentVersion[] {
  const versionIds = documentVersionsIndex.get(documentId) ?? [];
  return versionIds
    .map((id) => versionsStore.get(id))
    .filter((v): v is DocumentVersion => v !== undefined);
}

/**
 * Get version history (lightweight entries without full snapshots)
 */
export function getVersionHistory(
  documentId: string
): DocumentVersionHistory | null {
  const doc = documentsStore.get(documentId);
  if (!doc) return null;

  const versions = getDocumentVersions(documentId);
  if (versions.length === 0) return null;

  const currentVersion = versions[versions.length - 1];

  const entries: VersionHistoryEntry[] = versions.map((v) => ({
    versionId: v.versionId,
    versionNumber: v.versionNumber,
    createdAt: v.createdAt,
    author: v.author,
    change: v.change,
  }));

  // Return in reverse chronological order (newest first)
  entries.reverse();

  return {
    documentId,
    currentVersionId: currentVersion.versionId,
    currentVersionNumber: currentVersion.versionNumber,
    versions: entries,
  };
}

/**
 * Restore a document to a previous version
 *
 * This creates a NEW version with the content from the old version.
 * It does NOT rewrite history.
 *
 * @param documentId - The document to restore
 * @param versionId - The version to restore to
 * @param author - Who is performing the restore
 * @returns The new version created from the restore
 */
export function restoreVersion(
  documentId: string,
  versionId: string,
  author: UserRef
): DocumentVersion {
  const targetVersion = versionsStore.get(versionId);
  if (!targetVersion) {
    throw new Error(`Version ${versionId} not found`);
  }

  if (targetVersion.documentId !== documentId) {
    throw new Error(`Version ${versionId} does not belong to document ${documentId}`);
  }

  // Create a new document from the snapshot
  const restoredDoc: Document = structuredClone(targetVersion.snapshot);
  restoredDoc.meta.updatedAt = new Date().toISOString();

  // Save as a new version
  const existingVersionIds = documentVersionsIndex.get(documentId) ?? [];
  const previousVersionId = existingVersionIds[existingVersionIds.length - 1];
  const previousVersion = versionsStore.get(previousVersionId);

  const newVersion: DocumentVersion = {
    versionId: generateVersionId(),
    documentId,
    versionNumber: previousVersion ? previousVersion.versionNumber + 1 : 1,
    createdAt: new Date().toISOString(),
    author,
    change: {
      type: "restored",
      description: `Restored to version ${targetVersion.versionNumber}`,
    },
    snapshot: restoredDoc,
    previousVersionId,
  };

  // Store
  documentsStore.set(documentId, restoredDoc);
  versionsStore.set(newVersion.versionId, newVersion);
  existingVersionIds.push(newVersion.versionId);
  documentVersionsIndex.set(documentId, existingVersionIds);

  return newVersion;
}

// =============================================================================
// SEED DATA
// =============================================================================

/**
 * Initialize store with sample data
 */
export function seedStore(): void {
  // Skip if already seeded
  if (documentsStore.size > 0) return;

  const systemUser: UserRef = {
    id: "user-system",
    name: "System",
  };

  const jamesUser: UserRef = {
    id: "user-jw-001",
    name: "James Williams",
    email: "james@fieldbook.dev",
  };

  // Create initial version of roles doc
  createDocument(rolesPermissionsDocument, systemUser);

  // Simulate some edits to create version history
  const doc1 = structuredClone(rolesPermissionsDocument);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (doc1.blocks[1] as any).content = [
    { text: "This document defines the " },
    { text: "access control model", marks: ["bold"] },
    { text: " for Fieldbook. Updated to clarify scope." },
  ];
  saveDocument(doc1, jamesUser, "Clarified intro paragraph");

  // Another edit
  const doc2 = structuredClone(doc1);
  doc2.blocks.push({
    id: "block-022",
    type: "callout",
    intent: "decision",
    title: "Audit Logging",
    content: [
      {
        text: "All permission changes will be logged for audit purposes. Logs retained for 90 days.",
      },
    ],
  });
  saveDocument(doc2, jamesUser, "Added audit logging decision");
}

// Auto-seed on module load
seedStore();
