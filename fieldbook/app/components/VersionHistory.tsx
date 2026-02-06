"use client";

/**
 * Version History Panel
 *
 * Right-side panel showing document version history with:
 * - List of versions with timestamps and authors
 * - Change descriptions
 * - Restore action for each version
 *
 * Props:
 * - documentId: The document to show history for
 * - isOpen: Whether the panel is visible
 * - onClose: Callback to close the panel
 * - onRestore: Callback after a successful restore
 */

import { useState, useEffect, useCallback } from "react";
import type { DocumentVersionHistory, VersionHistoryEntry } from "../lib/document/version";

interface VersionHistoryProps {
  documentId: string;
  isOpen: boolean;
  onClose: () => void;
  onRestore?: (versionId: string) => void;
}

/**
 * Format a timestamp for display
 */
function formatTimestamp(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  // Relative time for recent changes
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  // Absolute date for older changes
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

/**
 * Get a label for the change type
 */
function getChangeTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    created: "Created",
    edited: "Edited",
    restructured: "Restructured",
    metadata_updated: "Updated metadata",
    restored: "Restored",
  };
  return labels[type] || type;
}

/**
 * Individual version entry in the list
 */
function VersionEntry({
  entry,
  isLatest,
  onRestore,
  isRestoring,
}: {
  entry: VersionHistoryEntry;
  isLatest: boolean;
  onRestore: () => void;
  isRestoring: boolean;
}) {
  return (
    <div className="group px-4 py-3 border-b border-neutral-100 last:border-b-0 hover:bg-neutral-50 transition-colors">
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          {/* Version number and timestamp */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-neutral-900">
              v{entry.versionNumber}
            </span>
            {isLatest && (
              <span className="text-xs px-1.5 py-0.5 bg-green-100 text-green-700 rounded">
                Current
              </span>
            )}
            <span className="text-xs text-neutral-400">
              {formatTimestamp(entry.createdAt)}
            </span>
          </div>

          {/* Author */}
          <div className="text-xs text-neutral-500 mt-0.5">
            {entry.author.name}
          </div>
        </div>

        {/* Restore button (hidden for current version) */}
        {!isLatest && (
          <button
            onClick={onRestore}
            disabled={isRestoring}
            className="opacity-0 group-hover:opacity-100 px-2 py-1 text-xs text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200 rounded transition-all disabled:opacity-50"
          >
            {isRestoring ? "Restoring..." : "Restore"}
          </button>
        )}
      </div>

      {/* Change description */}
      {entry.change.description && (
        <div className="mt-1.5 text-sm text-neutral-600">
          {entry.change.description}
        </div>
      )}

      {/* Change type badge */}
      <div className="mt-1.5">
        <span className="text-xs px-1.5 py-0.5 bg-neutral-100 text-neutral-500 rounded">
          {getChangeTypeLabel(entry.change.type)}
        </span>
      </div>
    </div>
  );
}

export function VersionHistory({
  documentId,
  isOpen,
  onClose,
  onRestore,
}: VersionHistoryProps) {
  const [history, setHistory] = useState<DocumentVersionHistory | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [restoringVersionId, setRestoringVersionId] = useState<string | null>(null);

  // Fetch version history
  const fetchHistory = useCallback(async () => {
    if (!documentId) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/documents/${documentId}/versions`);
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to fetch versions");
      }
      const data: DocumentVersionHistory = await response.json();
      setHistory(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }, [documentId]);

  // Fetch on open
  useEffect(() => {
    if (isOpen) {
      fetchHistory();
    }
  }, [isOpen, fetchHistory]);

  // Handle restore
  const handleRestore = async (versionId: string) => {
    setRestoringVersionId(versionId);

    try {
      const response = await fetch(
        `/api/documents/${documentId}/restore/${versionId}`,
        { method: "POST" }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to restore version");
      }

      // Refresh history
      await fetchHistory();

      // Notify parent
      onRestore?.(versionId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setRestoringVersionId(null);
    }
  };

  // Don't render if closed
  if (!isOpen) return null;

  return (
    <div className="fixed right-0 top-14 bottom-0 w-80 bg-white border-l border-neutral-200 shadow-lg z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200">
        <h2 className="font-medium text-neutral-900">Version History</h2>
        <button
          onClick={onClose}
          className="p-1 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded transition-colors"
          aria-label="Close"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {isLoading && (
          <div className="flex items-center justify-center h-32">
            <div className="text-sm text-neutral-500">Loading versions...</div>
          </div>
        )}

        {error && (
          <div className="p-4">
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <div className="text-sm text-red-700">{error}</div>
              <button
                onClick={fetchHistory}
                className="mt-2 text-xs text-red-600 hover:text-red-800 underline"
              >
                Try again
              </button>
            </div>
          </div>
        )}

        {!isLoading && !error && history && (
          <>
            {/* Summary */}
            <div className="px-4 py-3 bg-neutral-50 border-b border-neutral-100">
              <div className="text-xs text-neutral-500">
                {history.versions.length} version
                {history.versions.length !== 1 ? "s" : ""}
              </div>
            </div>

            {/* Version list */}
            <div>
              {history.versions.map((entry, index) => (
                <VersionEntry
                  key={entry.versionId}
                  entry={entry}
                  isLatest={index === 0}
                  onRestore={() => handleRestore(entry.versionId)}
                  isRestoring={restoringVersionId === entry.versionId}
                />
              ))}
            </div>
          </>
        )}

        {!isLoading && !error && !history && (
          <div className="flex items-center justify-center h-32">
            <div className="text-sm text-neutral-500">No version history</div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-neutral-200 bg-neutral-50">
        <div className="text-xs text-neutral-400">
          Versions are created automatically on save
        </div>
      </div>
    </div>
  );
}
