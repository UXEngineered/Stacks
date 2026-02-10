"use client";

/**
 * DraftSynthesisBanner - Shows commit/discard actions for auto-generated draft syntheses
 * 
 * Appears at the top of draft syntheses to force user to either:
 * - Commit: Accept the draft (changes status to "committed")
 * - Discard: Delete the draft synthesis
 */

import { useState, useCallback, useRef } from "react";
import { useTheme } from "./ThemeProvider";

interface DraftSynthesisBannerProps {
  sourceTitle?: string;
  onCommit: () => void;
  onDiscard: () => void;
}

export function DraftSynthesisBanner({ 
  sourceTitle,
  onCommit, 
  onDiscard,
}: DraftSynthesisBannerProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [commitHover, setCommitHover] = useState(false);
  const [discardHover, setDiscardHover] = useState(false);
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
  
  // Button base styles matching Button component structure
  const buttonBase = {
    fontSize: "11px",
    fontWeight: 500,
    padding: "6px 12px",
    borderRadius: "6px",
    cursor: "pointer" as const,
    transition: "all 150ms cubic-bezier(0.16, 1, 0.3, 1)",
  };
  
  // Primary button styles (Commit)
  const primaryBg = isDark ? "#fbbf24" : "#f59e0b";
  const primaryHoverBg = isDark ? "#f59e0b" : "#d97706";
  
  // Secondary button styles (Discard)
  const secondaryBg = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)";
  const secondaryHoverBg = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)";
  
  return (
    <div 
      ref={containerRef}
      className="mb-4 p-4 rounded-md"
      style={{
        backgroundColor: isDark ? "rgba(251, 191, 36, 0.08)" : "rgba(245, 158, 11, 0.06)",
        border: `1px solid ${isDark ? "rgba(251, 191, 36, 0.2)" : "rgba(245, 158, 11, 0.15)"}`,
        transition: "height 450ms cubic-bezier(0.16, 1, 0.3, 1), opacity 450ms cubic-bezier(0.16, 1, 0.3, 1), margin-bottom 450ms cubic-bezier(0.16, 1, 0.3, 1), padding 450ms cubic-bezier(0.16, 1, 0.3, 1)",
        pointerEvents: isDismissing ? "none" : "auto",
      }}
    >
      <div className="mb-3">
        <p 
          className="text-[13px] font-medium mb-1"
          style={{ color: isDark ? "#fcd34d" : "#b45309" }}
        >
          Auto-generated Draft
        </p>
        <p 
          className="text-[12px] leading-relaxed"
          style={{ color: isDark ? "#a3a3a3" : "#525252" }}
        >
          {sourceTitle 
            ? `This synthesis was automatically generated from "${sourceTitle}". Review the content and commit to keep it, or discard if not needed.`
            : "This synthesis was automatically generated. Review the content and commit to keep it, or discard if not needed."
          }
        </p>
      </div>
      
      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => animateDismiss(onCommit)}
          onMouseEnter={() => setCommitHover(true)}
          onMouseLeave={() => setCommitHover(false)}
          className="inline-flex items-center justify-center"
          style={{ 
            ...buttonBase,
            backgroundColor: commitHover ? primaryHoverBg : primaryBg,
            color: "#171717",
            border: `0.5px solid ${isDark ? "rgba(0,0,0,0.1)" : "rgba(0,0,0,0.1)"}`,
          }}
        >
          Commit
        </button>
        <button
          onClick={() => animateDismiss(onDiscard)}
          onMouseEnter={() => setDiscardHover(true)}
          onMouseLeave={() => setDiscardHover(false)}
          className="inline-flex items-center justify-center"
          style={{ 
            ...buttonBase,
            backgroundColor: discardHover ? secondaryHoverBg : secondaryBg,
            color: isDark ? "#a3a3a3" : "#525252",
            border: `0.5px solid ${isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)"}`,
          }}
        >
          Discard
        </button>
      </div>
    </div>
  );
}
