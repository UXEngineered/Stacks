/**
 * Storage Types for Fieldbook Documents
 * 
 * Defines the contract for document persistence with conflict detection.
 */

import type { Document } from "../document/types";

// =============================================================================
// SAVE OPERATION TYPES
// =============================================================================

/**
 * Request to save a document
 */
export interface SaveDocumentRequest {
  /** The document to save */
  document: Document;
  
  /** The version number the client believes is current */
  baseVersion: number;
  
  /** Client-generated ID for idempotency */
  clientId: string;
}

/**
 * Response from a save operation
 */
export interface SaveDocumentResponse {
  success: boolean;
  
  /** The new version number after save */
  version: number;
  
  /** ISO timestamp of the save */
  savedAt: string;
  
  /** If conflict detected, the server's current version */
  conflict?: ConflictInfo;
}

/**
 * Information about a version conflict
 */
export interface ConflictInfo {
  /** The server's current version number */
  serverVersion: number;
  
  /** When the server version was saved */
  serverSavedAt: string;
  
  /** Who saved the server version */
  serverSavedBy?: string;
  
  /** The server's document state (for comparison) */
  serverDocument: Document;
}

// =============================================================================
// SAVE STATUS TYPES
// =============================================================================

/**
 * Current save status for UI display
 */
export type SaveStatus = 
  | { state: "idle" }
  | { state: "pending"; changedAt: number }
  | { state: "saving" }
  | { state: "saved"; savedAt: number; version: number }
  | { state: "error"; error: string; retryAt?: number }
  | { state: "conflict"; conflict: ConflictInfo };

// =============================================================================
// STORAGE INTERFACE
// =============================================================================

/**
 * Abstract storage interface
 * Implementations: LocalStorage (now), API (future)
 */
export interface DocumentStorage {
  /**
   * Get a document by ID
   */
  get(id: string): Promise<{ document: Document; version: number } | null>;
  
  /**
   * Save a document with optimistic concurrency control
   * Returns conflict info if baseVersion doesn't match server
   */
  save(request: SaveDocumentRequest): Promise<SaveDocumentResponse>;
  
  /**
   * List documents (optionally filtered)
   */
  list(options?: { projectId?: string }): Promise<DocumentListItem[]>;
  
  /**
   * Delete a document
   */
  delete(id: string): Promise<void>;
  
  /**
   * Fork a document (create new from current state)
   */
  fork(id: string, newTitle: string): Promise<{ document: Document; version: number }>;
}

/**
 * Lightweight document info for listings
 */
export interface DocumentListItem {
  id: string;
  title: string;
  updatedAt: string;
  version: number;
}
