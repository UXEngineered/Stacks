"use client";

/**
 * DiffHighlightBanner - Shows AI-powered suggestions when upstream content changes
 * 
 * Appears when opening a Synthesis/Artifact that has lastDiff data.
 * - Shows AI-generated contextual suggestion (e.g., "Marcus Webb updated his stance...")
 * - Offers actionable options: "Yes, update" or "Dismiss"
 * - Falls back to generic message if AI suggestion not available
 */

import { useTheme } from "./ThemeProvider";
import type { DiffSummary } from "./spine/types";

interface DiffHighlightBannerProps {
  diff: DiffSummary;
  onAccept: () => void;
  onNavigateToSource?: (sourceId: string) => void;
  /** Optional: snippet of what changed in the source for context */
  sourceChangeSnippet?: string;
  /** Optional: callback when user wants AI to update content */
  onRequestAIUpdate?: () => void;
}

export function DiffHighlightBanner({ 
  diff, 
  onAccept, 
  onNavigateToSource, 
  sourceChangeSnippet,
  onRequestAIUpdate,
}: DiffHighlightBannerProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  
  const handleSourceClick = () => {
    if (diff.triggeredBySourceId && onNavigateToSource) {
      onNavigateToSource(diff.triggeredBySourceId);
    }
  };
  
  // Determine display mode based on available data
  const hasAISuggestion = diff.aiSuggestion?.changeDescription && diff.aiSuggestion?.suggestedAction;
  const hasContentChanges = diff.before || diff.after;
  
  return (
    <div 
      className="mb-4 p-4 rounded-md"
      style={{
        backgroundColor: isDark ? "rgba(129, 140, 248, 0.08)" : "rgba(99, 102, 241, 0.06)",
        border: `1px solid ${isDark ? "rgba(129, 140, 248, 0.2)" : "rgba(99, 102, 241, 0.15)"}`,
      }}
    >
      {/* AI-Powered Suggestion (primary display when available) */}
      {hasAISuggestion ? (
        <div>
          {/* AI Icon + Change Description */}
          <div className="flex items-start gap-2.5 mb-3">
            <div 
              className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5"
              style={{ 
                backgroundColor: isDark ? "rgba(129, 140, 248, 0.2)" : "rgba(99, 102, 241, 0.15)",
              }}
            >
              <svg 
                className="w-3.5 h-3.5" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24" 
                strokeWidth={1.5}
                style={{ color: isDark ? "#a5b4fc" : "#6366f1" }}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p 
                className="text-[13px] leading-relaxed"
                style={{ color: isDark ? "#e5e5e5" : "#262626" }}
              >
                {diff.aiSuggestion.changeDescription}
              </p>
            </div>
          </div>
          
          {/* Suggested Action */}
          <div 
            className="text-[13px] leading-relaxed mb-4 pl-8"
            style={{ color: isDark ? "#a3a3a3" : "#525252" }}
          >
            {diff.aiSuggestion.suggestedAction}
          </div>
          
          {/* Action Buttons */}
          <div className="flex items-center gap-2 pl-8">
            {onRequestAIUpdate && (
              <button
                onClick={onRequestAIUpdate}
                className="px-3 py-1.5 text-[11px] font-medium transition-all rounded-md"
                style={{ 
                  backgroundColor: isDark ? "#818cf8" : "#6366f1",
                  color: "#ffffff",
                }}
              >
                Make Change
              </button>
            )}
            <button
              onClick={onAccept}
              className="px-3 py-1.5 text-[11px] font-medium transition-colors rounded-md"
              style={{ 
                backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)",
                color: isDark ? "#a3a3a3" : "#525252",
              }}
            >
              Ignore
            </button>
            {diff.triggeredBySourceId && (
              <button
                onClick={handleSourceClick}
                className="ml-auto text-[10px] flex items-center gap-1 hover:underline"
                style={{ color: isDark ? "#818cf8" : "#6366f1" }}
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                </svg>
                View source
              </button>
            )}
          </div>
        </div>
      ) : (
        /* Fallback: Non-AI display */
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            {/* Header with source name */}
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <svg 
                className="w-3.5 h-3.5 shrink-0" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24" 
                strokeWidth={1.5}
                style={{ color: isDark ? "#818cf8" : "#6366f1" }}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
              <span 
                className="text-[11px] font-medium"
                style={{ color: isDark ? "#818cf8" : "#6366f1" }}
              >
                {diff.triggeredBySourceTitle 
                  ? `"${diff.triggeredBySourceTitle}" was updated`
                  : "Upstream source was updated"
                }
              </span>
            </div>
            
            {/* Change details - show before/after if present */}
            {hasContentChanges ? (
              <div className="mb-2">
                <div 
                  className="text-[10px] uppercase tracking-wider mb-1.5 font-medium"
                  style={{ color: isDark ? "#525252" : "#a3a3a3" }}
                >
                  Change in this document
                </div>
                <div className="flex items-start gap-2 text-[11px] flex-wrap">
                  {diff.before && (
                    <span 
                      className="px-1.5 py-0.5 rounded-sm line-through inline-block max-w-full"
                      style={{ 
                        backgroundColor: isDark ? "rgba(239, 68, 68, 0.15)" : "rgba(239, 68, 68, 0.1)",
                        color: isDark ? "#fca5a5" : "#dc2626",
                        wordBreak: "break-word",
                      }}
                    >
                      {diff.before.slice(0, 80)}{diff.before.length > 80 ? "..." : ""}
                    </span>
                  )}
                  {diff.before && diff.after && (
                    <span 
                      className="shrink-0 self-center"
                      style={{ color: isDark ? "#737373" : "#a3a3a3" }}
                    >
                      →
                    </span>
                  )}
                  {diff.after && (
                    <span 
                      className="px-1.5 py-0.5 rounded-sm font-medium inline-block max-w-full"
                      style={{ 
                        backgroundColor: isDark ? "rgba(74, 222, 128, 0.15)" : "rgba(34, 197, 94, 0.1)",
                        color: isDark ? "#86efac" : "#16a34a",
                        wordBreak: "break-word",
                      }}
                    >
                      {diff.after.slice(0, 80)}{diff.after.length > 80 ? "..." : ""}
                    </span>
                  )}
                </div>
              </div>
            ) : (
              /* No direct content change - show contextual message */
              <div className="mb-2">
                <div 
                  className="text-[11px] leading-relaxed"
                  style={{ color: isDark ? "#a3a3a3" : "#525252" }}
                >
                  This content may be affected by changes in the source. Review to ensure it still reflects the latest information.
                </div>
                {sourceChangeSnippet && (
                  <div className="mt-2">
                    <div 
                      className="text-[10px] uppercase tracking-wider mb-1 font-medium"
                      style={{ color: isDark ? "#525252" : "#a3a3a3" }}
                    >
                      What changed in the source
                    </div>
                    <div 
                      className="text-[11px] px-2 py-1.5 rounded-sm italic"
                      style={{ 
                        backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
                        color: isDark ? "#a3a3a3" : "#525252",
                        borderLeft: `2px solid ${isDark ? "#818cf8" : "#6366f1"}`,
                      }}
                    >
                      "{sourceChangeSnippet.slice(0, 120)}{sourceChangeSnippet.length > 120 ? "..." : ""}"
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* Source link */}
            {diff.triggeredBySourceId && diff.triggeredBySourceTitle && (
              <button
                onClick={handleSourceClick}
                className="text-[10px] flex items-center gap-1 hover:underline"
                style={{ color: isDark ? "#818cf8" : "#6366f1" }}
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                </svg>
                View source
              </button>
            )}
          </div>
          
          {/* Ignore button */}
          <button
            onClick={onAccept}
            className="shrink-0 px-2.5 py-1.5 text-[10px] font-medium transition-colors rounded-sm"
            style={{ 
              backgroundColor: isDark ? "rgba(129, 140, 248, 0.15)" : "rgba(99, 102, 241, 0.1)",
              color: isDark ? "#818cf8" : "#6366f1",
            }}
          >
            Ignore
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Hook to manage diff highlight dismissal state
 * Returns whether the banner should be shown and a dismiss function
 */
import { useState, useCallback, useEffect } from "react";

export function useDiffHighlight(itemId: string | undefined, lastDiff: DiffSummary | null | undefined) {
  // Track dismissed items in session state
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  
  const isDismissed = itemId ? dismissedIds.has(itemId) : true;
  // Show banner if there's any lastDiff (with message, or with before/after content)
  const shouldShow = !isDismissed && !!lastDiff;
  
  const dismiss = useCallback(() => {
    if (itemId) {
      setDismissedIds(prev => {
        const next = new Set(prev);
        next.add(itemId);
        return next;
      });
    }
  }, [itemId]);
  
  // Reset dismissed state when switching to a different item
  // (we don't reset for the same item so dismissal persists in session)
  
  return {
    shouldShow,
    dismiss,
  };
}
