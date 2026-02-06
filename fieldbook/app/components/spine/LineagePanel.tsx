"use client";

/**
 * LineagePanel - Right column showing derivation relationships
 * 
 * Displays what the selected item was derived from and what it informs.
 * Makes the reasoning chain explicit and traceable.
 */

import type { SpineItem } from "./types";
import { useTheme } from "../ThemeProvider";

interface LineagePanelProps {
  selectedItem: SpineItem | null;
  derivedFrom: SpineItem[];
  informs: SpineItem[];
  onSelectItem: (id: string) => void;
}

export function LineagePanel({
  selectedItem,
  derivedFrom,
  informs,
  onSelectItem,
}: LineagePanelProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const borderColor = isDark ? "#404040" : "#e5e5e5";

  if (!selectedItem) {
    return (
      <aside 
        className="w-56 h-full shrink-0"
      >
        <div className="p-4">
          <div 
            className="text-[10px] font-semibold tracking-wider uppercase"
            style={{ color: isDark ? "#525252" : "#737373" }}
          >
            Lineage
          </div>
          <p 
            className="text-xs mt-2"
            style={{ color: isDark ? "#737373" : "#737373" }}
          >
            Select an item to see its relationships
          </p>
        </div>
      </aside>
    );
  }

  const typeLabels: Record<string, string> = {
    source: "Source",
    synthesis: "Synthesis",
    decision: "Decision",
    artifact: "Artifact",
  };

  return (
    <aside 
      className="w-56 h-full shrink-0 overflow-y-auto"
    >
      <div className="p-4">
        {/* Current item indicator */}
        <div className="mb-6">
          <div 
            className="text-[10px] font-semibold tracking-wider uppercase mb-1"
            style={{ color: isDark ? "#a3a3a3" : "#525252" }}
          >
            Selected
          </div>
          <div 
            className="text-xs font-medium truncate"
            style={{ color: isDark ? "#f5f5f5" : "#171717" }}
          >
            {selectedItem.title}
          </div>
          <div 
            className="text-[10px] uppercase tracking-wide mt-0.5"
            style={{ color: isDark ? "#a3a3a3" : "#525252" }}
          >
            {typeLabels[selectedItem.type]}
          </div>
        </div>

        {/* Derived From section */}
        <div className="mb-6">
          <div 
            className="text-[10px] font-semibold tracking-wider uppercase mb-2 flex items-center gap-1"
            style={{ color: isDark ? "#a3a3a3" : "#525252" }}
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" />
            </svg>
            Derived From
          </div>
          {derivedFrom.length === 0 ? (
            <p 
              className="text-xs italic"
              style={{ color: isDark ? "#737373" : "#737373" }}
            >
              {selectedItem.type === "source" 
                ? "Sources are primary inputs" 
                : "No sources linked"}
            </p>
          ) : (
            <div className="space-y-1">
              {derivedFrom.map((item) => (
                <button
                  key={item.id}
                  onClick={() => onSelectItem(item.id)}
                  className="w-full text-left p-2 transition-colors cursor-pointer group"
                  style={{ 
                    border: `1px solid ${borderColor}`,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent";
                  }}
                >
                  <div 
                    className="text-xs font-medium truncate"
                    style={{ color: isDark ? "#d4d4d4" : "#404040" }}
                  >
                    {item.title}
                  </div>
                  <div 
                    className="text-[10px] uppercase tracking-wide mt-0.5"
                    style={{ color: isDark ? "#737373" : "#737373" }}
                  >
                    {typeLabels[item.type]}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Informs section */}
        <div>
          <div 
            className="text-[10px] font-semibold tracking-wider uppercase mb-2 flex items-center gap-1"
            style={{ color: isDark ? "#a3a3a3" : "#525252" }}
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 4.5l-15 15m0 0h11.25m-11.25 0V8.25" />
            </svg>
            Informs
          </div>
          {informs.length === 0 ? (
            <p 
              className="text-xs italic"
              style={{ color: isDark ? "#737373" : "#737373" }}
            >
              No downstream items yet
            </p>
          ) : (
            <div className="space-y-1">
              {informs.map((item) => (
                <button
                  key={item.id}
                  onClick={() => onSelectItem(item.id)}
                  className="w-full text-left p-2 transition-colors cursor-pointer group"
                  style={{ 
                    border: `1px solid ${borderColor}`,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent";
                  }}
                >
                  <div 
                    className="text-xs font-medium truncate"
                    style={{ color: isDark ? "#d4d4d4" : "#404040" }}
                  >
                    {item.title}
                  </div>
                  <div 
                    className="text-[10px] uppercase tracking-wide mt-0.5"
                    style={{ color: isDark ? "#737373" : "#737373" }}
                  >
                    {typeLabels[item.type]}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Visual lineage indicator */}
        {(derivedFrom.length > 0 || informs.length > 0) && (
          <div 
            className="mt-6 pt-4"
            style={{ borderTop: `1px solid ${borderColor}` }}
          >
            <div 
              className="text-[10px] text-center"
              style={{ color: isDark ? "#737373" : "#737373" }}
            >
              {derivedFrom.length > 0 && (
                <span>{derivedFrom.length} upstream</span>
              )}
              {derivedFrom.length > 0 && informs.length > 0 && (
                <span> · </span>
              )}
              {informs.length > 0 && (
                <span>{informs.length} downstream</span>
              )}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
