"use client";

/**
 * DiffHighlightBanner - Shows AI-powered suggestions when upstream content changes
 * 
 * Appears when opening a Synthesis/Artifact that has lastDiff data.
 * - Shows AI-generated contextual suggestion (e.g., "Marcus Webb updated his stance...")
 * - Offers actionable options: "Yes, update" or "Dismiss"
 * - Falls back to generic message if AI suggestion not available
 */

import { useState, useCallback, useRef } from "react";
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
  const [makeChangeHover, setMakeChangeHover] = useState(false);
  const [ignoreHover, setIgnoreHover] = useState(false);
  const [fallbackIgnoreHover, setFallbackIgnoreHover] = useState(false);
  const [isDismissing, setIsDismissing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const animateDismiss = useCallback((callback: () => void) => {
    setIsDismissing(true);
    const el = containerRef.current;
    if (el) {
      const height = el.offsetHeight;
      el.style.height = height + "px";
      el.style.overflow = "hidden";
      // Force reflow
      el.offsetHeight;
      el.style.height = "0px";
      el.style.opacity = "0";
      el.style.marginBottom = "0px";
      el.style.paddingTop = "0px";
      el.style.paddingBottom = "0px";
    }
    setTimeout(callback, 450);
  }, []);
  
  const handleSourceClick = () => {
    if (diff.triggeredBySourceId && onNavigateToSource) {
      onNavigateToSource(diff.triggeredBySourceId);
    }
  };
  
  // Determine display mode based on available data
  const hasAISuggestion = diff.aiSuggestion?.changeDescription && diff.aiSuggestion?.suggestedAction;
  const hasContentChanges = diff.before || diff.after;
  
  // Button base styles matching Button component structure
  const buttonBase = {
    fontSize: "11px",
    fontWeight: 500,
    padding: "6px 12px",
    borderRadius: "6px",
    cursor: "pointer" as const,
    transition: "all 150ms cubic-bezier(0.16, 1, 0.3, 1)",
  };
  
  // Primary button styles (Make Change)
  const primaryBg = isDark ? "#8b5cf6" : "#7c3aed";
  const primaryHoverBg = isDark ? "#7c3aed" : "#6d28d9";
  
  // Secondary button styles (Ignore)
  const secondaryBg = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)";
  const secondaryHoverBg = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)";
  
  // Fallback Ignore button (uses banner accent color)
  const fallbackIgnoreBg = isDark ? "rgba(129, 140, 248, 0.15)" : "rgba(99, 102, 241, 0.1)";
  const fallbackIgnoreHoverBg = isDark ? "rgba(129, 140, 248, 0.25)" : "rgba(99, 102, 241, 0.18)";
  
  return (
    <div 
      ref={containerRef}
      className="mb-4 p-4 rounded-md"
      style={{
        backgroundColor: isDark ? "rgba(129, 140, 248, 0.08)" : "rgba(99, 102, 241, 0.06)",
        border: `1px solid ${isDark ? "rgba(129, 140, 248, 0.2)" : "rgba(99, 102, 241, 0.15)"}`,
        transition: "height 450ms cubic-bezier(0.16, 1, 0.3, 1), opacity 450ms cubic-bezier(0.16, 1, 0.3, 1), margin-bottom 450ms cubic-bezier(0.16, 1, 0.3, 1), padding 450ms cubic-bezier(0.16, 1, 0.3, 1)",
        pointerEvents: isDismissing ? "none" : "auto",
      }}
    >
      {/* AI-Powered Suggestion (primary display when available) */}
      {hasAISuggestion ? (
        <div>
          {/* Change Description */}
          <div className="mb-3">
            <p 
              className="text-[13px] leading-relaxed"
              style={{ color: isDark ? "#e5e5e5" : "#262626" }}
            >
              {diff.aiSuggestion.changeDescription}
            </p>
          </div>
          
          {/* Suggested Action */}
          <div 
            className="text-[13px] leading-relaxed mb-4"
            style={{ color: isDark ? "#a3a3a3" : "#525252" }}
          >
            {diff.aiSuggestion.suggestedAction}
          </div>
          
          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {onRequestAIUpdate && (
              <button
                onClick={() => animateDismiss(onRequestAIUpdate)}
                onMouseEnter={() => setMakeChangeHover(true)}
                onMouseLeave={() => setMakeChangeHover(false)}
                className="inline-flex items-center justify-center"
                style={{ 
                  ...buttonBase,
                  backgroundColor: makeChangeHover ? primaryHoverBg : primaryBg,
                  color: "#ffffff",
                  border: `0.5px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`,
                }}
              >
                Make Change
              </button>
            )}
            <button
              onClick={() => animateDismiss(onAccept)}
              onMouseEnter={() => setIgnoreHover(true)}
              onMouseLeave={() => setIgnoreHover(false)}
              className="inline-flex items-center justify-center"
              style={{ 
                ...buttonBase,
                backgroundColor: ignoreHover ? secondaryHoverBg : secondaryBg,
                color: isDark ? "#a3a3a3" : "#525252",
                border: `0.5px solid ${isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)"}`,
              }}
            >
              Ignore
            </button>
            {diff.triggeredBySourceId && (
              <button
                onClick={handleSourceClick}
                className="ml-auto text-[10px] flex items-center gap-1 hover:underline cursor-pointer"
                style={{ color: isDark ? "#a78bfa" : "#7c3aed" }}
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
            <div className="mb-2">
              <span 
                className="text-[11px] font-medium"
                style={{ color: isDark ? "#a78bfa" : "#7c3aed" }}
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
                        borderLeft: `2px solid ${isDark ? "#a78bfa" : "#7c3aed"}`,
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
                className="text-[10px] flex items-center gap-1 hover:underline cursor-pointer"
                style={{ color: isDark ? "#a78bfa" : "#7c3aed" }}
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
            onClick={() => animateDismiss(onAccept)}
            onMouseEnter={() => setFallbackIgnoreHover(true)}
            onMouseLeave={() => setFallbackIgnoreHover(false)}
            className="shrink-0 inline-flex items-center justify-center"
            style={{ 
              ...buttonBase,
              backgroundColor: fallbackIgnoreHover ? fallbackIgnoreHoverBg : fallbackIgnoreBg,
              color: isDark ? "#a78bfa" : "#7c3aed",
              border: `0.5px solid ${isDark ? "rgba(139, 92, 246, 0.2)" : "rgba(124, 58, 237, 0.15)"}`,
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
