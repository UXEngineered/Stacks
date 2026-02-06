"use client";

/**
 * MentionAutocomplete Component
 *
 * A dropdown that appears when typing "@" to search and insert document references.
 * Positioned relative to the cursor in the editor.
 */

import { useEffect, useState, useCallback, useRef } from "react";
import type { DocumentSearchResult } from "@/app/api/documents/search/route";

export interface MentionAutocompleteProps {
  /** Whether the autocomplete is currently active/visible */
  isActive: boolean;
  /** Current search query (text after @) */
  query: string;
  /** Position to render the dropdown (relative to viewport) */
  position: { top: number; left: number } | null;
  /** Callback when a document is selected */
  onSelect: (doc: DocumentSearchResult) => void;
  /** Callback when autocomplete is dismissed */
  onDismiss: () => void;
  /** Optional: document IDs to exclude from results (e.g., current document) */
  excludeIds?: string[];
}

export function MentionAutocomplete({
  isActive,
  query,
  position,
  onSelect,
  onDismiss,
  excludeIds = [],
}: MentionAutocompleteProps) {
  const [results, setResults] = useState<DocumentSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch search results
  const fetchResults = useCallback(async (searchQuery: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        q: searchQuery,
        limit: "8",
      });
      
      if (excludeIds.length > 0) {
        params.set("exclude", excludeIds.join(","));
      }

      const response = await fetch(`/api/documents/search?${params}`);
      if (response.ok) {
        const data = await response.json();
        setResults(data.results);
        setSelectedIndex(0);
      }
    } catch (error) {
      console.error("Failed to search documents:", error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [excludeIds]);

  // Debounced search
  useEffect(() => {
    if (!isActive) {
      setResults([]);
      setSelectedIndex(0);
      return;
    }

    const timer = setTimeout(() => {
      fetchResults(query);
    }, 150);

    return () => clearTimeout(timer);
  }, [isActive, query, fetchResults]);

  // Keyboard navigation
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept clipboard shortcuts
      if ((e.metaKey || e.ctrlKey) && ["v", "c", "x", "a", "z", "y"].includes(e.key.toLowerCase())) {
        return;
      }
      
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) => 
            prev < results.length - 1 ? prev + 1 : prev
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
          break;
        case "Enter":
        case "Tab":
          e.preventDefault();
          if (results[selectedIndex]) {
            onSelect(results[selectedIndex]);
          }
          break;
        case "Escape":
          e.preventDefault();
          onDismiss();
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown, { capture: true });
    return () => document.removeEventListener("keydown", handleKeyDown, { capture: true });
  }, [isActive, results, selectedIndex, onSelect, onDismiss]);

  // Scroll selected item into view
  useEffect(() => {
    if (containerRef.current && results.length > 0) {
      const selectedEl = containerRef.current.querySelector(
        `[data-index="${selectedIndex}"]`
      );
      selectedEl?.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex, results.length]);

  if (!isActive || !position) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className="fixed z-50 bg-white border border-neutral-200 rounded-lg shadow-lg overflow-hidden min-w-[240px] max-w-[320px]"
      style={{
        top: position.top + 24,
        left: position.left,
      }}
    >
      {/* Header */}
      <div className="px-3 py-2 border-b border-neutral-100 bg-neutral-50">
        <span className="text-xs font-medium text-neutral-500">
          Link to document
        </span>
      </div>

      {/* Results */}
      <div className="max-h-[240px] overflow-y-auto">
        {loading && results.length === 0 ? (
          <div className="px-3 py-4 text-sm text-neutral-400 text-center">
            Searching...
          </div>
        ) : results.length === 0 ? (
          <div className="px-3 py-4 text-sm text-neutral-400 text-center">
            {query ? "No documents found" : "Start typing to search"}
          </div>
        ) : (
          <ul className="py-1">
            {results.map((doc, index) => (
              <li
                key={doc.id}
                data-index={index}
                className={`
                  px-3 py-2 cursor-pointer flex items-center gap-2
                  ${index === selectedIndex 
                    ? "bg-blue-50 text-blue-900" 
                    : "hover:bg-neutral-50 text-neutral-700"
                  }
                `}
                onClick={() => onSelect(doc)}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                {/* Document icon */}
                <svg
                  className={`w-4 h-4 flex-shrink-0 ${
                    index === selectedIndex ? "text-blue-500" : "text-neutral-400"
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                
                {/* Document title */}
                <span className="truncate text-sm font-medium">
                  {doc.title}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Footer hint */}
      <div className="px-3 py-1.5 border-t border-neutral-100 bg-neutral-50 text-xs text-neutral-400">
        <kbd className="px-1 py-0.5 bg-white border border-neutral-200 rounded text-[10px]">↑↓</kbd>
        {" "}to navigate{" "}
        <kbd className="px-1 py-0.5 bg-white border border-neutral-200 rounded text-[10px]">Enter</kbd>
        {" "}to select
      </div>
    </div>
  );
}
