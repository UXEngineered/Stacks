"use client";

/**
 * Conflict Resolution Modal
 * 
 * Shown when the server version is newer than the local version.
 * Offers two non-destructive resolution options:
 * 1. Refresh to latest (discard local changes)
 * 2. Fork (save local changes as new document)
 */

import { useState } from "react";
import type { ConflictInfo } from "../../lib/storage/types";

interface ConflictResolutionModalProps {
  conflict: ConflictInfo;
  currentTitle: string;
  onRefreshToLatest: () => Promise<void>;
  onFork: (newTitle: string) => Promise<{ documentId: string }>;
  onClose: () => void;
}

export function ConflictResolutionModal({
  conflict,
  currentTitle,
  onRefreshToLatest,
  onFork,
  onClose,
}: ConflictResolutionModalProps) {
  const [mode, setMode] = useState<"choose" | "fork">("choose");
  const [forkTitle, setForkTitle] = useState(`${currentTitle} (my version)`);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const formatDate = (iso: string): string => {
    const date = new Date(iso);
    return date.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };
  
  const handleRefresh = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await onRefreshToLatest();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to refresh");
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleFork = async () => {
    if (!forkTitle.trim()) {
      setError("Please enter a title for your version");
      return;
    }
    
    setIsLoading(true);
    setError(null);
    try {
      const result = await onFork(forkTitle.trim());
      // Could navigate to forked doc here
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create fork");
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" />
      
      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-neutral-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-semibold text-neutral-900">Version Conflict</h2>
              <p className="text-sm text-neutral-500">
                This document was updated elsewhere
              </p>
            </div>
          </div>
        </div>
        
        {/* Content */}
        <div className="p-5">
          {mode === "choose" ? (
            <>
              {/* Conflict explanation */}
              <div className="mb-5 p-3 bg-neutral-50 rounded-lg text-sm">
                <p className="text-neutral-600">
                  A newer version (v{conflict.serverVersion}) was saved{" "}
                  <span className="font-medium">{formatDate(conflict.serverSavedAt)}</span>
                  {conflict.serverSavedBy && (
                    <> by <span className="font-medium">{conflict.serverSavedBy}</span></>
                  )}.
                </p>
                <p className="text-neutral-500 mt-1">
                  Your changes haven't been saved. Choose how to proceed:
                </p>
              </div>
              
              {/* Options */}
              <div className="space-y-3">
                {/* Option 1: Refresh to latest */}
                <button
                  onClick={handleRefresh}
                  disabled={isLoading}
                  className="w-full p-4 text-left border border-neutral-200 rounded-lg hover:border-neutral-300 hover:bg-neutral-50 transition-colors group disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-md bg-blue-100 flex items-center justify-center shrink-0 group-hover:bg-blue-200 transition-colors">
                      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </div>
                    <div>
                      <div className="font-medium text-neutral-900">Refresh to latest</div>
                      <div className="text-sm text-neutral-500 mt-0.5">
                        Discard my changes and load the newest version
                      </div>
                    </div>
                  </div>
                </button>
                
                {/* Option 2: Fork */}
                <button
                  onClick={() => setMode("fork")}
                  disabled={isLoading}
                  className="w-full p-4 text-left border border-neutral-200 rounded-lg hover:border-neutral-300 hover:bg-neutral-50 transition-colors group disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-md bg-green-100 flex items-center justify-center shrink-0 group-hover:bg-green-200 transition-colors">
                      <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                      </svg>
                    </div>
                    <div>
                      <div className="font-medium text-neutral-900">Save as new version</div>
                      <div className="text-sm text-neutral-500 mt-0.5">
                        Keep my changes in a separate document
                      </div>
                    </div>
                  </div>
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Fork title input */}
              <div className="mb-4">
                <label htmlFor="forkTitle" className="block text-sm font-medium text-neutral-700 mb-2">
                  Title for your version
                </label>
                <input
                  id="forkTitle"
                  type="text"
                  value={forkTitle}
                  onChange={(e) => setForkTitle(e.target.value)}
                  placeholder="Enter a title"
                  className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  autoFocus
                />
              </div>
              
              <p className="text-sm text-neutral-500 mb-4">
                This will create a new document with your current changes. The original document will remain at v{conflict.serverVersion}.
              </p>
            </>
          )}
          
          {/* Error message */}
          {error && (
            <div className="mt-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg">
              {error}
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="px-5 py-4 border-t border-neutral-100 bg-neutral-50 flex justify-end gap-2">
          {mode === "fork" && (
            <button
              onClick={() => setMode("choose")}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors disabled:opacity-50"
            >
              Back
            </button>
          )}
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          {mode === "fork" && (
            <button
              onClick={handleFork}
              disabled={isLoading || !forkTitle.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-green-500 hover:bg-green-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isLoading && (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              )}
              Create Fork
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
