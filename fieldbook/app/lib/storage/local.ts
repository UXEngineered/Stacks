/**
 * localStorage Implementation for Document Storage
 * 
 * Implements optimistic concurrency control via version numbers.
 * Each document has metadata stored separately for quick version checks.
 */

import type { Document } from "../document/types";
import type {
  DocumentStorage,
  SaveDocumentRequest,
  SaveDocumentResponse,
  DocumentListItem,
} from "./types";

const STORAGE_PREFIX = "fieldbook_doc_";
const META_PREFIX = "fieldbook_meta_";
const INDEX_KEY = "fieldbook_doc_index";

/**
 * Document metadata stored separately for quick access
 */
interface StoredMeta {
  version: number;
  savedAt: string;
  savedBy?: string;
}

/**
 * localStorage-based document storage with conflict detection
 */
export class LocalDocumentStorage implements DocumentStorage {
  /**
   * Get a document by ID
   */
  async get(id: string): Promise<{ document: Document; version: number } | null> {
    const docRaw = localStorage.getItem(`${STORAGE_PREFIX}${id}`);
    const metaRaw = localStorage.getItem(`${META_PREFIX}${id}`);
    
    if (!docRaw || !metaRaw) return null;
    
    try {
      const document = JSON.parse(docRaw) as Document;
      const meta = JSON.parse(metaRaw) as StoredMeta;
      return { document, version: meta.version };
    } catch {
      return null;
    }
  }
  
  /**
   * Save a document with optimistic concurrency control
   */
  async save(request: SaveDocumentRequest): Promise<SaveDocumentResponse> {
    const { document, baseVersion, clientId } = request;
    const id = document.meta.id;
    
    // Get current server state
    const metaRaw = localStorage.getItem(`${META_PREFIX}${id}`);
    const currentMeta: StoredMeta | null = metaRaw ? JSON.parse(metaRaw) : null;
    const serverVersion = currentMeta?.version ?? 0;
    
    // Check for conflict (server version is ahead of client's base)
    if (serverVersion > baseVersion) {
      const serverDocRaw = localStorage.getItem(`${STORAGE_PREFIX}${id}`);
      const serverDocument = serverDocRaw ? JSON.parse(serverDocRaw) : document;
      
      return {
        success: false,
        version: serverVersion,
        savedAt: currentMeta?.savedAt ?? new Date().toISOString(),
        conflict: {
          serverVersion,
          serverSavedAt: currentMeta?.savedAt ?? new Date().toISOString(),
          serverSavedBy: currentMeta?.savedBy,
          serverDocument,
        },
      };
    }
    
    // No conflict - proceed with save
    const newVersion = serverVersion + 1;
    const savedAt = new Date().toISOString();
    
    // Update document timestamp
    const updatedDocument: Document = {
      ...document,
      meta: {
        ...document.meta,
        updatedAt: savedAt,
      },
    };
    
    // Store document and metadata
    localStorage.setItem(`${STORAGE_PREFIX}${id}`, JSON.stringify(updatedDocument));
    localStorage.setItem(`${META_PREFIX}${id}`, JSON.stringify({
      version: newVersion,
      savedAt,
      savedBy: "local-user", // Would come from auth in real impl
    } satisfies StoredMeta));
    
    // Update index
    this.updateIndex(id, updatedDocument.meta.title, savedAt, newVersion);
    
    // Store version snapshot for history
    this.storeVersionSnapshot(id, newVersion, updatedDocument, savedAt);
    
    return {
      success: true,
      version: newVersion,
      savedAt,
    };
  }
  
  /**
   * List all documents
   */
  async list(options?: { projectId?: string }): Promise<DocumentListItem[]> {
    const indexRaw = localStorage.getItem(INDEX_KEY);
    if (!indexRaw) return [];
    
    try {
      const index = JSON.parse(indexRaw) as DocumentListItem[];
      // TODO: Filter by projectId if provided
      return index.sort((a, b) => 
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
    } catch {
      return [];
    }
  }
  
  /**
   * Delete a document
   */
  async delete(id: string): Promise<void> {
    localStorage.removeItem(`${STORAGE_PREFIX}${id}`);
    localStorage.removeItem(`${META_PREFIX}${id}`);
    
    // Update index
    const indexRaw = localStorage.getItem(INDEX_KEY);
    if (indexRaw) {
      const index = JSON.parse(indexRaw) as DocumentListItem[];
      const filtered = index.filter(item => item.id !== id);
      localStorage.setItem(INDEX_KEY, JSON.stringify(filtered));
    }
  }
  
  /**
   * Fork a document (create copy with new ID)
   */
  async fork(id: string, newTitle: string): Promise<{ document: Document; version: number }> {
    const existing = await this.get(id);
    if (!existing) {
      throw new Error(`Document ${id} not found`);
    }
    
    const newId = `doc-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const now = new Date().toISOString();
    
    const forkedDocument: Document = {
      ...existing.document,
      meta: {
        ...existing.document.meta,
        id: newId,
        title: newTitle,
        createdAt: now,
        updatedAt: now,
      },
    };
    
    // Save as new document
    await this.save({
      document: forkedDocument,
      baseVersion: 0,
      clientId: `fork-${Date.now()}`,
    });
    
    return { document: forkedDocument, version: 1 };
  }
  
  /**
   * Update the document index
   */
  private updateIndex(id: string, title: string, updatedAt: string, version: number): void {
    const indexRaw = localStorage.getItem(INDEX_KEY);
    const index: DocumentListItem[] = indexRaw ? JSON.parse(indexRaw) : [];
    
    const existingIdx = index.findIndex(item => item.id === id);
    const entry: DocumentListItem = { id, title, updatedAt, version };
    
    if (existingIdx >= 0) {
      index[existingIdx] = entry;
    } else {
      index.push(entry);
    }
    
    localStorage.setItem(INDEX_KEY, JSON.stringify(index));
  }
  
  /**
   * Store a version snapshot for history
   */
  private storeVersionSnapshot(
    id: string, 
    version: number, 
    document: Document, 
    savedAt: string
  ): void {
    const historyKey = `fieldbook_history_${id}`;
    const historyRaw = localStorage.getItem(historyKey);
    const history: Array<{ version: number; savedAt: string; snapshot: Document }> = 
      historyRaw ? JSON.parse(historyRaw) : [];
    
    history.push({ version, savedAt, snapshot: document });
    
    // Keep last 50 versions
    while (history.length > 50) {
      history.shift();
    }
    
    localStorage.setItem(historyKey, JSON.stringify(history));
  }
}

/**
 * Singleton instance
 */
let storageInstance: LocalDocumentStorage | null = null;

export function getDocumentStorage(): DocumentStorage {
  if (!storageInstance) {
    storageInstance = new LocalDocumentStorage();
  }
  return storageInstance;
}
