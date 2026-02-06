"use client";

/**
 * useAutosave Hook
 * 
 * Provides autosave functionality with:
 * - Debounced saves after idle (configurable, default 1000ms)
 * - Save on blur
 * - Optimistic UI with save status
 * - Conflict detection and resolution callbacks
 */

import { useState, useCallback, useRef, useEffect } from "react";
import type { Document } from "../lib/document/types";
import type { 
  SaveStatus, 
  ConflictInfo,
  DocumentStorage 
} from "../lib/storage/types";
import { getDocumentStorage } from "../lib/storage/local";

// =============================================================================
// CONFIGURATION
// =============================================================================

interface AutosaveConfig {
  /** Debounce delay in ms (default: 1000) */
  debounceMs?: number;
  
  /** Save on window/editor blur (default: true) */
  saveOnBlur?: boolean;
  
  /** Maximum retries on error (default: 3) */
  maxRetries?: number;
  
  /** Retry delay in ms (default: 2000) */
  retryDelayMs?: number;
}

const DEFAULT_CONFIG: Required<AutosaveConfig> = {
  debounceMs: 1000,
  saveOnBlur: true,
  maxRetries: 3,
  retryDelayMs: 2000,
};

// =============================================================================
// HOOK RETURN TYPE
// =============================================================================

interface UseAutosaveReturn {
  /** Current save status for UI display */
  status: SaveStatus;
  
  /** Current document version */
  version: number;
  
  /** Call when document content changes */
  onChange: (document: Document) => void;
  
  /** Force an immediate save */
  saveNow: () => Promise<void>;
  
  /** Resolve conflict by refreshing to server version */
  resolveWithServer: () => Promise<void>;
  
  /** Resolve conflict by forking current state */
  resolveWithFork: (newTitle: string) => Promise<{ documentId: string }>;
  
  /** Clear error state and retry */
  retry: () => void;
  
  /** Whether there are unsaved changes */
  isDirty: boolean;
}

// =============================================================================
// HOOK IMPLEMENTATION
// =============================================================================

export function useAutosave(
  initialDocument: Document,
  initialVersion: number,
  config?: AutosaveConfig
): UseAutosaveReturn {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  
  // State
  const [status, setStatus] = useState<SaveStatus>({ state: "idle" });
  const [version, setVersion] = useState(initialVersion);
  const [currentDocument, setCurrentDocument] = useState(initialDocument);
  const [isDirty, setIsDirty] = useState(false);
  
  // Refs for debouncing and cleanup
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef(0);
  const lastSavedDocRef = useRef<Document>(initialDocument);
  const storageRef = useRef<DocumentStorage>(getDocumentStorage());
  const isMountedRef = useRef(true);
  
  // Generate stable client ID for this session
  const clientIdRef = useRef(`client-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`);
  
  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);
  
  /**
   * Perform the actual save operation
   */
  const performSave = useCallback(async (document: Document) => {
    if (!isMountedRef.current) return;
    
    setStatus({ state: "saving" });
    
    try {
      const response = await storageRef.current.save({
        document,
        baseVersion: version,
        clientId: clientIdRef.current,
      });
      
      if (!isMountedRef.current) return;
      
      if (response.success) {
        // Successful save
        setVersion(response.version);
        setStatus({ 
          state: "saved", 
          savedAt: Date.now(),
          version: response.version,
        });
        setIsDirty(false);
        lastSavedDocRef.current = document;
        retryCountRef.current = 0;
      } else if (response.conflict) {
        // Conflict detected
        setStatus({ 
          state: "conflict", 
          conflict: response.conflict,
        });
      }
    } catch (error) {
      if (!isMountedRef.current) return;
      
      const errorMessage = error instanceof Error ? error.message : "Save failed";
      
      // Check if we should retry
      if (retryCountRef.current < cfg.maxRetries) {
        retryCountRef.current++;
        setStatus({ 
          state: "error", 
          error: errorMessage,
          retryAt: Date.now() + cfg.retryDelayMs,
        });
        
        // Schedule retry
        setTimeout(() => {
          if (isMountedRef.current) {
            performSave(document);
          }
        }, cfg.retryDelayMs);
      } else {
        setStatus({ 
          state: "error", 
          error: `${errorMessage} (max retries reached)`,
        });
      }
    }
  }, [version, cfg.maxRetries, cfg.retryDelayMs]);
  
  /**
   * Schedule a debounced save
   */
  const scheduleSave = useCallback((document: Document) => {
    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    // Set pending status
    setStatus({ state: "pending", changedAt: Date.now() });
    
    // Schedule new save
    debounceTimerRef.current = setTimeout(() => {
      performSave(document);
    }, cfg.debounceMs);
  }, [performSave, cfg.debounceMs]);
  
  /**
   * Handle document changes
   */
  const onChange = useCallback((document: Document) => {
    setCurrentDocument(document);
    setIsDirty(true);
    scheduleSave(document);
  }, [scheduleSave]);
  
  /**
   * Force immediate save
   */
  const saveNow = useCallback(async () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    await performSave(currentDocument);
  }, [performSave, currentDocument]);
  
  /**
   * Resolve conflict by accepting server version
   */
  const resolveWithServer = useCallback(async () => {
    if (status.state !== "conflict") return;
    
    const serverDoc = status.conflict.serverDocument;
    setCurrentDocument(serverDoc);
    setVersion(status.conflict.serverVersion);
    lastSavedDocRef.current = serverDoc;
    setIsDirty(false);
    setStatus({ 
      state: "saved", 
      savedAt: Date.now(),
      version: status.conflict.serverVersion,
    });
  }, [status]);
  
  /**
   * Resolve conflict by forking current document
   */
  const resolveWithFork = useCallback(async (newTitle: string) => {
    if (status.state !== "conflict") {
      throw new Error("No conflict to resolve");
    }
    
    setStatus({ state: "saving" });
    
    try {
      // First, update local state to server version
      const serverDoc = status.conflict.serverDocument;
      setVersion(status.conflict.serverVersion);
      
      // Create a new document from current (unsaved) state
      const forked = await storageRef.current.fork(currentDocument.meta.id, newTitle);
      
      // The forked document is now saved; update our state to point to original (server) doc
      setCurrentDocument(serverDoc);
      lastSavedDocRef.current = serverDoc;
      setIsDirty(false);
      setStatus({ 
        state: "saved", 
        savedAt: Date.now(),
        version: status.conflict.serverVersion,
      });
      
      return { documentId: forked.document.meta.id };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Fork failed";
      setStatus({ state: "error", error: errorMessage });
      throw error;
    }
  }, [status, currentDocument]);
  
  /**
   * Retry after error
   */
  const retry = useCallback(() => {
    retryCountRef.current = 0;
    performSave(currentDocument);
  }, [performSave, currentDocument]);
  
  /**
   * Save on blur if enabled
   */
  useEffect(() => {
    if (!cfg.saveOnBlur) return;
    
    const handleBlur = () => {
      if (isDirty && status.state === "pending") {
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }
        performSave(currentDocument);
      }
    };
    
    // Listen for visibility change (tab switch) and window blur
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        handleBlur();
      }
    };
    
    window.addEventListener("blur", handleBlur);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    
    return () => {
      window.removeEventListener("blur", handleBlur);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [cfg.saveOnBlur, isDirty, status.state, currentDocument, performSave]);
  
  /**
   * Warn before unload if dirty
   */
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
        return "";
      }
    };
    
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);
  
  return {
    status,
    version,
    onChange,
    saveNow,
    resolveWithServer,
    resolveWithFork,
    retry,
    isDirty,
  };
}
