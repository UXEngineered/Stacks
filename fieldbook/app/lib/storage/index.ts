/**
 * Storage Module Exports
 * 
 * Provides document persistence with:
 * - Optimistic concurrency control
 * - Conflict detection
 * - Version history
 */

export type {
  SaveDocumentRequest,
  SaveDocumentResponse,
  ConflictInfo,
  SaveStatus,
  DocumentStorage,
  DocumentListItem,
} from "./types";

export { LocalDocumentStorage, getDocumentStorage } from "./local";
