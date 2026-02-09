"use client";

/**
 * DraftSynthesisBanner - Shows commit/discard actions for auto-generated draft syntheses
 * 
 * Appears at the top of draft syntheses to force user to either:
 * - Commit: Accept the draft (changes status to "committed")
 * - Discard: Delete the draft synthesis
 */

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
  
  return (
    <div 
      className="mb-4 p-4 rounded-md"
      style={{
        backgroundColor: isDark ? "rgba(251, 191, 36, 0.08)" : "rgba(245, 158, 11, 0.06)",
        border: `1px solid ${isDark ? "rgba(251, 191, 36, 0.2)" : "rgba(245, 158, 11, 0.15)"}`,
      }}
    >
      <div className="flex items-start gap-2.5 mb-3">
        {/* Auto-generated icon */}
        <div 
          className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5"
          style={{ 
            backgroundColor: isDark ? "rgba(251, 191, 36, 0.2)" : "rgba(245, 158, 11, 0.15)",
          }}
        >
          <svg 
            className="w-3.5 h-3.5" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24" 
            strokeWidth={1.5}
            style={{ color: isDark ? "#fcd34d" : "#d97706" }}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
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
      </div>
      
      {/* Action Buttons */}
      <div className="flex items-center gap-2 pl-8">
        <button
          onClick={onCommit}
          className="px-3 py-1.5 text-[11px] font-medium transition-all rounded-md"
          style={{ 
            backgroundColor: isDark ? "#fbbf24" : "#f59e0b",
            color: "#171717",
          }}
        >
          Commit
        </button>
        <button
          onClick={onDiscard}
          className="px-3 py-1.5 text-[11px] font-medium transition-colors rounded-md"
          style={{ 
            backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)",
            color: isDark ? "#a3a3a3" : "#525252",
          }}
        >
          Discard
        </button>
      </div>
    </div>
  );
}
