"use client";

/**
 * LineagePanel - Right column showing derivation relationships
 * 
 * Displays what the selected item was derived from and what it informs.
 * Makes the reasoning chain explicit and traceable.
 * 
 * External Upstream Lineage:
 * - Shows external references from parent fieldbooks
 * - External refs appear with "External" badge and origin fieldbook label
 * - Availability states: AVAILABLE (clickable), RESTRICTED (locked), 
 *   SNAPSHOT_ONLY (view snapshot), UNKNOWN (not captured)
 */

import type { SpineItem, LineageReference, LineageAvailability } from "./types";
import { useTheme } from "../ThemeProvider";

interface LineagePanelProps {
  selectedItem: SpineItem | null;
  derivedFrom: SpineItem[];
  informs: SpineItem[];
  /** External lineage references from parent fieldbooks */
  externalDerivedFrom?: LineageReference[];
  onSelectItem: (id: string) => void;
  /** Parent fieldbook ID if this is a fork */
  parentFieldbookId?: string;
}

export function LineagePanel({
  selectedItem,
  derivedFrom,
  informs,
  externalDerivedFrom = [],
  onSelectItem,
  parentFieldbookId,
}: LineagePanelProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const borderColor = isDark ? "#404040" : "#e5e5e5";

  // Check if there are any external references
  const hasExternalLineage = externalDerivedFrom.length > 0;

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

        {/* External lineage callout */}
        {hasExternalLineage && (
          <div 
            className="mb-4 p-2 text-[10px] leading-relaxed"
            style={{ 
              backgroundColor: isDark ? "#262626" : "#fef3c7",
              color: isDark ? "#a3a3a3" : "#92400e",
              border: `1px solid ${isDark ? "#404040" : "#fcd34d"}`,
            }}
          >
            <div className="flex items-start gap-1.5">
              <svg 
                className="w-3 h-3 mt-0.5 shrink-0" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24" 
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
              </svg>
              <span>This item has upstream lineage in another Fieldbook.</span>
            </div>
          </div>
        )}

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
          
          {/* Local items */}
          {derivedFrom.length === 0 && externalDerivedFrom.length === 0 ? (
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
              {/* Local derived from items */}
              {derivedFrom.map((item) => (
                <LocalLineageItem
                  key={item.id}
                  item={item}
                  typeLabels={typeLabels}
                  isDark={isDark}
                  borderColor={borderColor}
                  onClick={() => onSelectItem(item.id)}
                />
              ))}
              
              {/* External derived from items */}
              {externalDerivedFrom.map((ref) => (
                <ExternalLineageItem
                  key={ref.id}
                  reference={ref}
                  typeLabels={typeLabels}
                  isDark={isDark}
                  borderColor={borderColor}
                />
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
                <LocalLineageItem
                  key={item.id}
                  item={item}
                  typeLabels={typeLabels}
                  isDark={isDark}
                  borderColor={borderColor}
                  onClick={() => onSelectItem(item.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Visual lineage indicator */}
        {(derivedFrom.length > 0 || informs.length > 0 || externalDerivedFrom.length > 0) && (
          <div 
            className="mt-6 pt-4"
            style={{ borderTop: `1px solid ${borderColor}` }}
          >
            <div 
              className="text-[10px] text-center"
              style={{ color: isDark ? "#737373" : "#737373" }}
            >
              {(derivedFrom.length > 0 || externalDerivedFrom.length > 0) && (
                <span>
                  {derivedFrom.length + externalDerivedFrom.length} upstream
                  {externalDerivedFrom.length > 0 && (
                    <span style={{ color: isDark ? "#525252" : "#a3a3a3" }}>
                      {" "}({externalDerivedFrom.length} external)
                    </span>
                  )}
                </span>
              )}
              {(derivedFrom.length > 0 || externalDerivedFrom.length > 0) && informs.length > 0 && (
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

// =============================================================================
// Local Lineage Item Component
// =============================================================================

interface LocalLineageItemProps {
  item: SpineItem;
  typeLabels: Record<string, string>;
  isDark: boolean;
  borderColor: string;
  onClick: () => void;
}

function LocalLineageItem({ item, typeLabels, isDark, borderColor, onClick }: LocalLineageItemProps) {
  // Check if this is an external link source (reference)
  const isExternalLink = item.type === "source" && "kind" in item && item.kind === "external_link";
  
  return (
    <button
      onClick={onClick}
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
        className="text-xs font-medium truncate flex items-center gap-1.5"
        style={{ color: isDark ? "#d4d4d4" : "#404040" }}
      >
        <span className="truncate">{item.title}</span>
        {/* Reference badge for external link sources */}
        {isExternalLink && (
          <span 
            className="text-[8px] px-1 py-0.5 rounded font-medium shrink-0"
            style={{ 
              backgroundColor: isDark ? "#1e3a5f" : "#dbeafe",
              color: isDark ? "#93c5fd" : "#1d4ed8",
            }}
            title="External reference - declared influence, not analyzed content"
          >
            Ref
          </span>
        )}
      </div>
      <div 
        className="text-[10px] uppercase tracking-wide mt-0.5"
        style={{ color: isDark ? "#737373" : "#737373" }}
      >
        {typeLabels[item.type]}
        {isExternalLink && " · Reference"}
      </div>
    </button>
  );
}

// =============================================================================
// External Lineage Item Component
// =============================================================================

interface ExternalLineageItemProps {
  reference: LineageReference;
  typeLabels: Record<string, string>;
  isDark: boolean;
  borderColor: string;
}

function ExternalLineageItem({ reference, typeLabels, isDark, borderColor }: ExternalLineageItemProps) {
  const isClickable = reference.availability === "AVAILABLE";
  
  // Handle click for available items - open in new tab
  const handleClick = () => {
    if (isClickable) {
      window.open(`/projects/${reference.originFieldbookId}`, "_blank");
    }
  };

  // Availability indicator
  const AvailabilityIndicator = () => {
    switch (reference.availability) {
      case "AVAILABLE":
        return (
          <div 
            className="flex items-center gap-1 text-[9px]"
            style={{ color: isDark ? "#22c55e" : "#16a34a" }}
          >
            <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
            </svg>
            <span>Open</span>
          </div>
        );
      case "RESTRICTED":
        return (
          <div 
            className="flex items-center gap-1 text-[9px]"
            style={{ color: isDark ? "#ef4444" : "#dc2626" }}
          >
            <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
            <span>Access required</span>
          </div>
        );
      case "SNAPSHOT_ONLY":
        return (
          <div 
            className="flex items-center gap-1 text-[9px]"
            style={{ color: isDark ? "#f59e0b" : "#d97706" }}
          >
            <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
            </svg>
            <span>Snapshot only</span>
          </div>
        );
      default:
        return (
          <div 
            className="flex items-center gap-1 text-[9px]"
            style={{ color: isDark ? "#737373" : "#a3a3a3" }}
          >
            <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
            </svg>
            <span>Not captured</span>
          </div>
        );
    }
  };

  const Component = isClickable ? "button" : "div";
  
  return (
    <Component
      onClick={isClickable ? handleClick : undefined}
      className={`w-full text-left p-2 transition-colors ${isClickable ? "cursor-pointer" : "cursor-default"}`}
      style={{ 
        border: `1px solid ${borderColor}`,
        backgroundColor: isDark ? "rgba(59, 130, 246, 0.05)" : "rgba(59, 130, 246, 0.03)",
      }}
      {...(isClickable && {
        onMouseEnter: (e: React.MouseEvent<HTMLButtonElement>) => {
          e.currentTarget.style.backgroundColor = isDark ? "rgba(59, 130, 246, 0.1)" : "rgba(59, 130, 246, 0.08)";
        },
        onMouseLeave: (e: React.MouseEvent<HTMLButtonElement>) => {
          e.currentTarget.style.backgroundColor = isDark ? "rgba(59, 130, 246, 0.05)" : "rgba(59, 130, 246, 0.03)";
        },
      })}
    >
      {/* Title */}
      <div 
        className="text-xs font-medium truncate"
        style={{ color: isDark ? "#93c5fd" : "#2563eb" }}
      >
        {reference.title}
      </div>
      
      {/* Type and External badge */}
      <div className="flex items-center gap-1.5 mt-0.5">
        <span 
          className="text-[10px] uppercase tracking-wide"
          style={{ color: isDark ? "#737373" : "#737373" }}
        >
          {typeLabels[reference.type] || reference.type}
        </span>
        <span 
          className="text-[9px] px-1 py-0.5 uppercase tracking-wide"
          style={{ 
            backgroundColor: isDark ? "#1e3a5f" : "#dbeafe",
            color: isDark ? "#93c5fd" : "#1e40af",
          }}
        >
          External
        </span>
      </div>
      
      {/* Origin fieldbook */}
      <div 
        className="text-[10px] mt-1 truncate"
        style={{ color: isDark ? "#525252" : "#a3a3a3" }}
      >
        From "{reference.originFieldbookLabel}"
      </div>
      
      {/* Availability indicator */}
      <div className="mt-1.5">
        <AvailabilityIndicator />
      </div>
    </Component>
  );
}
