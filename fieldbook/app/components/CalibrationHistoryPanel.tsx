"use client";

/**
 * CalibrationHistoryPanel - Toggleable panel showing calibration decision history
 * 
 * Displays a log of all calibration decisions (ignored/changed) made during the session.
 * Can be toggled on/off via a small button in the UI.
 */

import { useState } from "react";
import { useTheme } from "./ThemeProvider";
import { Button } from "./Button";
import type { CalibrationDecision } from "@/app/lib/db/types";

interface CalibrationHistoryPanelProps {
  decisions: CalibrationDecision[];
  onNavigateToItem?: (itemId: string, itemType: "synthesis" | "artifact") => void;
}

export function CalibrationHistoryPanel({ decisions, onNavigateToItem }: CalibrationHistoryPanelProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [isOpen, setIsOpen] = useState(false);

  // Sort decisions by timestamp, most recent first
  const sortedDecisions = [...decisions].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const today = new Date();
    if (date.toDateString() === today.toDateString()) {
      return "Today";
    }
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  return (
    <>
      {/* Toggle Button - Fixed position at bottom right of workspace */}
      <Button
        variant="secondary"
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-4 right-4 z-40"
        title="Change Tracking"
      >
        Change Tracking
        {decisions.length > 0 && (
          <span
            className="w-2 h-2 rounded-full ml-2"
            style={{ backgroundColor: isDark ? "#8b5cf6" : "#7c3aed" }}
          />
        )}
      </Button>

      {/* Slide-out Panel */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            style={{ backgroundColor: "rgba(0,0,0,0.2)" }}
            onClick={() => setIsOpen(false)}
          />
          
          {/* Panel */}
          <div
            className="fixed right-0 top-0 bottom-0 w-80 z-50 overflow-hidden flex flex-col shadow-xl"
            style={{
              backgroundColor: isDark ? "#141414" : "#fafafa",
              borderLeft: `1px solid ${isDark ? "#262626" : "#e5e5e5"}`,
            }}
          >
            {/* Header */}
            <div
              className="px-4 py-3 flex items-center justify-between shrink-0"
              style={{ borderBottom: `1px solid ${isDark ? "#262626" : "#e5e5e5"}` }}
            >
              <span 
                className="text-[13px] font-semibold"
                style={{ color: isDark ? "#e5e5e5" : "#171717" }}
              >
                Change Tracking
              </span>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              {sortedDecisions.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <p 
                    className="text-xs italic"
                    style={{ color: "#737373" }}
                  >
                    No changes tracked
                  </p>
                </div>
              ) : (
                <div className="py-2">
                  {sortedDecisions.map((decision, index) => (
                    <div
                      key={decision.id}
                      className="px-4 py-3 transition-colors cursor-pointer hover:bg-black/5 dark:hover:bg-white/5"
                      onClick={() => onNavigateToItem?.(decision.itemId, decision.itemType)}
                      style={{
                        borderBottom: index < sortedDecisions.length - 1 
                          ? `1px solid ${isDark ? "#262626" : "#f0f0f0"}` 
                          : undefined,
                      }}
                    >
                      {/* Decision indicator + time */}
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-1.5">
                          {decision.decision === "changed" ? (
                            <span
                              className="px-1.5 py-0.5 rounded text-[9px] font-medium uppercase tracking-wider"
                              style={{
                                backgroundColor: isDark ? "rgba(74, 222, 128, 0.15)" : "rgba(34, 197, 94, 0.1)",
                                color: isDark ? "#86efac" : "#16a34a",
                              }}
                            >
                              Changed
                            </span>
                          ) : (
                            <span
                              className="px-1.5 py-0.5 rounded text-[9px] font-medium uppercase tracking-wider"
                              style={{
                                backgroundColor: isDark ? "rgba(161, 161, 170, 0.15)" : "rgba(113, 113, 122, 0.1)",
                                color: isDark ? "#a1a1aa" : "#71717a",
                              }}
                            >
                              Ignored
                            </span>
                          )}
                        </div>
                        <span 
                          className="text-[10px]"
                          style={{ color: isDark ? "#525252" : "#a3a3a3" }}
                        >
                          {formatDate(decision.timestamp)} {formatTime(decision.timestamp)}
                        </span>
                      </div>

                      {/* Item affected */}
                      <div 
                        className="text-[12px] font-medium mb-1 truncate"
                        style={{ color: isDark ? "#e5e5e5" : "#262626" }}
                      >
                        {decision.itemTitle}
                      </div>

                      {/* Suggestion summary */}
                      <div 
                        className="text-[11px] leading-relaxed line-clamp-2"
                        style={{ color: isDark ? "#737373" : "#737373" }}
                      >
                        {decision.suggestion}
                      </div>

                      {/* Source reference */}
                      <div 
                        className="text-[10px] mt-1.5 flex items-center gap-1"
                        style={{ color: isDark ? "#525252" : "#a3a3a3" }}
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                        </svg>
                        <span className="truncate">from {decision.sourceTitle}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer with count */}
            {sortedDecisions.length > 0 && (
              <div
                className="px-4 py-2 text-center shrink-0"
                style={{ 
                  borderTop: `1px solid ${isDark ? "#262626" : "#e5e5e5"}`,
                  color: isDark ? "#525252" : "#a3a3a3",
                }}
              >
                <span className="text-[10px]">
                  {sortedDecisions.filter(d => d.decision === "changed").length} changed, {" "}
                  {sortedDecisions.filter(d => d.decision === "ignored").length} ignored
                </span>
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}
