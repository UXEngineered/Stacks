"use client";

/**
 * ThematicOverlapModal - Shows when a new source's themes overlap with existing synthesis
 * 
 * Appears before auto-synthesis when:
 * - Auto-synthesis is enabled
 * - AI detects high thematic overlap with an existing synthesis
 * - The overlap can be explained in one sentence
 * 
 * User can choose to:
 * - Condense: Merge the source into the existing synthesis
 * - Keep Separate: Create a new synthesis
 */

import { useState } from "react";
import { useTheme } from "./ThemeProvider";

export interface OverlapDetection {
  hasOverlap: boolean;
  existingSynthesis: {
    id: string;
    title: string;
  } | null;
  explanation: string | null; // One-sentence explanation of why they're related
}

interface ThematicOverlapModalProps {
  isOpen: boolean;
  sourceTitle: string;
  overlap: OverlapDetection;
  onCondense: () => void; // Merge into existing synthesis
  onKeepSeparate: () => void; // Create new synthesis
  onCancel: () => void;
  onDontAskAgain: () => void; // Skip overlap checks for this fieldbook
  isLoading?: boolean;
}

export function ThematicOverlapModal({
  isOpen,
  sourceTitle,
  overlap,
  onCondense,
  onKeepSeparate,
  onCancel,
  onDontAskAgain,
  isLoading = false,
}: ThematicOverlapModalProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [condenseHover, setCondenseHover] = useState(false);
  const [separateHover, setSeparateHover] = useState(false);
  const [dontAskHover, setDontAskHover] = useState(false);
  
  if (!isOpen || !overlap.hasOverlap || !overlap.existingSynthesis) return null;
  
  // Button base styles
  const buttonBase = {
    fontSize: "12px",
    fontWeight: 500,
    padding: "8px 16px",
    borderRadius: "6px",
    cursor: isLoading ? "not-allowed" as const : "pointer" as const,
    opacity: isLoading ? 0.6 : 1,
    transition: "all 150ms cubic-bezier(0.16, 1, 0.3, 1)",
  };
  
  // Primary button (Condense)
  const primaryBg = isDark ? "#262626" : "#171717";
  const primaryHoverBg = isDark ? "#2a2a2a" : "#1f1f1f";
  
  // Secondary button (Keep Separate)
  const secondaryBg = "transparent";
  const secondaryHoverBg = isDark ? "rgba(255, 255, 255, 0.03)" : "rgba(0, 0, 0, 0.03)";
  
  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isLoading) onCancel();
      }}
    >
      <div 
        className="w-full max-w-md mx-4 rounded-lg shadow-2xl"
        style={{
          backgroundColor: isDark ? "#1c1c1c" : "#ffffff",
          border: `1px solid ${isDark ? "#333333" : "#e5e5e5"}`,
          animation: "modalIn 200ms cubic-bezier(0.16, 1, 0.3, 1) forwards",
        }}
      >
        <style>{`
          @keyframes modalIn {
            from {
              opacity: 0;
              transform: scale(0.95) translateY(-10px);
            }
            to {
              opacity: 1;
              transform: scale(1) translateY(0);
            }
          }
        `}</style>
        
        {/* Header */}
        <div 
          className="px-5 py-4"
          style={{ borderBottom: `1px solid ${isDark ? "#333333" : "#e5e5e5"}` }}
        >
          <h2 
            className="text-sm font-medium"
            style={{ color: isDark ? "#fafafa" : "#171717" }}
          >
            Similar themes detected
          </h2>
        </div>
        
        {/* Content */}
        <div className="px-5 py-4">
          <p 
            className="text-[13px] leading-relaxed mb-4"
            style={{ color: isDark ? "#a3a3a3" : "#525252" }}
          >
            {overlap.explanation}
          </p>
          
          <div 
            className="rounded-md px-3 py-2.5 mb-4"
            style={{ 
              backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
              border: `1px solid ${isDark ? "#333333" : "#e5e5e5"}`,
            }}
          >
            <div 
              className="text-[10px] uppercase tracking-wider mb-1"
              style={{ color: isDark ? "#525252" : "#a3a3a3" }}
            >
              Existing synthesis
            </div>
            <div 
              className="text-[13px] font-medium"
              style={{ color: isDark ? "#e5e5e5" : "#171717" }}
            >
              {overlap.existingSynthesis.title}
            </div>
          </div>
          
          <p 
            className="text-[12px] leading-relaxed"
            style={{ color: isDark ? "#737373" : "#737373" }}
          >
            Would you like to incorporate "{sourceTitle}" into this existing synthesis, or create a new one?
          </p>
        </div>
        
        {/* Actions */}
        <div 
          className="px-5 py-4 flex flex-col gap-3"
          style={{ borderTop: `1px solid ${isDark ? "#333333" : "#e5e5e5"}` }}
        >
          <div className="flex items-center justify-end gap-3">
            <button
              onClick={onKeepSeparate}
              disabled={isLoading}
              onMouseEnter={() => setSeparateHover(true)}
              onMouseLeave={() => setSeparateHover(false)}
              className="inline-flex items-center justify-center"
              style={{
                ...buttonBase,
                backgroundColor: separateHover ? secondaryHoverBg : secondaryBg,
                color: isDark ? "#a3a3a3" : "#525252",
                border: `0.5px solid ${isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)"}`,
              }}
            >
              Keep Separate
            </button>
            <button
              onClick={onCondense}
              disabled={isLoading}
              onMouseEnter={() => setCondenseHover(true)}
              onMouseLeave={() => setCondenseHover(false)}
              className="inline-flex items-center justify-center"
              style={{
                ...buttonBase,
                backgroundColor: condenseHover ? primaryHoverBg : primaryBg,
                color: isDark ? "#fafafa" : "#fafafa",
                border: `0.5px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`,
              }}
            >
              {isLoading ? "Condensing..." : "Condense"}
            </button>
          </div>
          
          {/* Quiet escape hatch for expert users */}
          <div className="flex justify-end">
            <button
              onClick={() => {
                onDontAskAgain();
                onKeepSeparate();
              }}
              disabled={isLoading}
              onMouseEnter={() => setDontAskHover(true)}
              onMouseLeave={() => setDontAskHover(false)}
              className="text-[10px] cursor-pointer"
              style={{
                color: dontAskHover 
                  ? (isDark ? "#a3a3a3" : "#525252") 
                  : (isDark ? "#525252" : "#a3a3a3"),
                transition: "color 150ms",
                background: "none",
                border: "none",
                padding: 0,
              }}
            >
              Always create new syntheses for this fieldbook
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
