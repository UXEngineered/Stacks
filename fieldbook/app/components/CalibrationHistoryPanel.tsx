"use client";

/**
 * CalibrationHistoryPanel - Toggleable panel showing calibration decision history
 * 
 * Displays a log of all calibration decisions (ignored/changed) made during the session.
 * Can be toggled on/off via a small button in the UI.
 */

import { useState } from "react";
import { useTheme } from "./ThemeProvider";
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
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-4 right-4 z-40 flex items-center gap-2 px-3 py-2 rounded-full shadow-lg transition-all hover:scale-105"
        style={{
          backgroundColor: isDark ? "#1f1f1f" : "#ffffff",
          border: `1px solid ${isDark ? "#333" : "#e5e5e5"}`,
          color: isDark ? "#a3a3a3" : "#525252",
        }}
        title="Calibration History"
      >
        <svg 
          className="w-4 h-4" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24" 
          strokeWidth={1.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="text-[11px] font-medium">
          {decisions.length > 0 ? decisions.length : ""}
        </span>
        {decisions.length > 0 && (
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: isDark ? "#818cf8" : "#6366f1" }}
          />
        )}
      </button>

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
              <div className="flex items-center gap-2">
                <svg 
                  className="w-4 h-4" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24" 
                  strokeWidth={1.5}
                  style={{ color: isDark ? "#818cf8" : "#6366f1" }}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span 
                  className="text-[13px] font-semibold"
                  style={{ color: isDark ? "#e5e5e5" : "#171717" }}
                >
                  Calibration History
                </span>
              </div>
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
                <div 
                  className="px-4 py-8 text-center"
                  style={{ color: isDark ? "#525252" : "#a3a3a3" }}
                >
                  <svg 
                    className="w-8 h-8 mx-auto mb-3 opacity-50" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24" 
                    strokeWidth={1}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
                  </svg>
                  <p className="text-[12px]">No calibration decisions yet</p>
                  <p className="text-[11px] mt-1 opacity-70">
                    Decisions will appear here when you respond to calibration alerts
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
