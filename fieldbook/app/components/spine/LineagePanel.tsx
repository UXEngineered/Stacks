"use client";

/**
 * LineagePanel - Right column showing derivation relationships and change tracking
 * 
 * Tabbed panel that toggles between:
 * - Lineage: What the selected item was derived from and what it informs
 * - Change Tracking: History of calibration decisions (ignored/changed)
 * 
 * External Upstream Lineage:
 * - Shows external references from parent fieldbooks
 * - External refs appear with "External" badge and origin fieldbook label
 * - Availability states: AVAILABLE (clickable), RESTRICTED (locked), 
 *   SNAPSHOT_ONLY (view snapshot), UNKNOWN (not captured)
 */

import { useState } from "react";
import type { SpineItem, SourceItem, LineageReference, LineageAvailability } from "./types";
import type { CalibrationDecision } from "@/app/lib/db/types";
import { useTheme } from "../ThemeProvider";
import { NodeTypeIcon } from "./SourcesPanel";

export type ContentVisibility = {
  sources: boolean;
  syntheses: boolean;
  artifacts: boolean;
};

type PanelTab = "lineage" | "changes";

/** A removed upstream item (deleted source/synthesis) */
export interface RemovedLineageItem {
  id: string;
  type: "source" | "synthesis";
}

interface LineagePanelProps {
  selectedItem: SpineItem | null;
  derivedFrom: SpineItem[];
  informs: SpineItem[];
  /** External lineage references from parent fieldbooks */
  externalDerivedFrom?: LineageReference[];
  /** Removed upstream items (deleted sources/syntheses) */
  removedDerivedFrom?: RemovedLineageItem[];
  onSelectItem: (id: string) => void;
  /** Parent fieldbook ID if this is a fork */
  parentFieldbookId?: string;
  /** Controls which content types are visible (for read-only mode) */
  visibility?: ContentVisibility;
  /** Calibration decisions for change tracking */
  calibrationHistory?: CalibrationDecision[];
  /** Navigate to item from change tracking */
  onNavigateToItem?: (itemId: string, itemType: "synthesis" | "artifact") => void;
}

export function LineagePanel({
  selectedItem,
  derivedFrom,
  informs,
  externalDerivedFrom = [],
  removedDerivedFrom = [],
  onSelectItem,
  parentFieldbookId,
  visibility,
  calibrationHistory = [],
  onNavigateToItem,
}: LineagePanelProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const borderColor = isDark ? "#404040" : "#e5e5e5";
  
  // Active tab state
  const [activeTab, setActiveTab] = useState<PanelTab>("lineage");

  // Check if there are any external references
  const hasExternalLineage = externalDerivedFrom.length > 0;
  
  // Helper to check if an item type is hidden in read-only view
  const isItemHidden = (itemType: string): boolean => {
    if (!visibility) return false;
    
    switch (itemType) {
      case "source": return !visibility.sources;
      case "synthesis": return !visibility.syntheses;
      case "artifact": return !visibility.artifacts;
      default: return false;
    }
  };

  // Tab toggle component (matching ShareModal style)
  const TabToggle = () => (
    <div 
      className="flex p-0.5 rounded-md mx-4 mt-3 mb-2"
      style={{ backgroundColor: isDark ? "#262626" : "#f5f5f5" }}
    >
      <button
        onClick={() => setActiveTab("lineage")}
        className="flex-1 px-2 py-1 font-medium rounded transition-all cursor-pointer"
        style={{
          fontSize: "12.5px",
          backgroundColor: activeTab === "lineage" 
            ? (isDark ? "#333333" : "#ffffff") 
            : "transparent",
          color: activeTab === "lineage"
            ? (isDark ? "#fafafa" : "#171717")
            : (isDark ? "#737373" : "#a3a3a3"),
          boxShadow: activeTab === "lineage" 
            ? (isDark ? "0 1px 3px rgba(0,0,0,0.4)" : "0 1px 2px rgba(0,0,0,0.1)") 
            : "none",
        }}
      >
        Lineage
      </button>
      <button
        onClick={() => setActiveTab("changes")}
        className="flex-1 px-2 py-1 font-medium rounded transition-all cursor-pointer flex items-center justify-center gap-1"
        style={{
          fontSize: "12.5px",
          backgroundColor: activeTab === "changes" 
            ? (isDark ? "#333333" : "#ffffff") 
            : "transparent",
          color: activeTab === "changes"
            ? (isDark ? "#fafafa" : "#171717")
            : (isDark ? "#737373" : "#a3a3a3"),
          boxShadow: activeTab === "changes" 
            ? (isDark ? "0 1px 3px rgba(0,0,0,0.4)" : "0 1px 2px rgba(0,0,0,0.1)") 
            : "none",
        }}
      >
        Changes
        {selectedItem && calibrationHistory.some(d => d.itemId === selectedItem.id) && (
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: isDark ? "#a78bfa" : "#7c3aed" }}
          />
        )}
      </button>
    </div>
  );

  return (
    <aside 
      className="w-56 h-full shrink-0 flex flex-col"
    >
      {/* Tab Toggle */}
      <TabToggle />
      
      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === "lineage" ? (
          <LineageContent
            selectedItem={selectedItem}
            derivedFrom={derivedFrom}
            informs={informs}
            externalDerivedFrom={externalDerivedFrom}
            removedDerivedFrom={removedDerivedFrom}
            hasExternalLineage={hasExternalLineage}
            onSelectItem={onSelectItem}
            isItemHidden={isItemHidden}
            isDark={isDark}
            borderColor={borderColor}
          />
        ) : (
          <ChangeTrackingContent
            selectedItem={selectedItem}
            calibrationHistory={calibrationHistory}
            isDark={isDark}
          />
        )}
      </div>
    </aside>
  );
}

// =============================================================================
// Lineage Content Component
// =============================================================================

interface LineageContentProps {
  selectedItem: SpineItem | null;
  derivedFrom: SpineItem[];
  informs: SpineItem[];
  externalDerivedFrom: LineageReference[];
  removedDerivedFrom: RemovedLineageItem[];
  hasExternalLineage: boolean;
  onSelectItem: (id: string) => void;
  isItemHidden: (itemType: string) => boolean;
  isDark: boolean;
  borderColor: string;
}

function LineageContent({
  selectedItem,
  derivedFrom,
  informs,
  externalDerivedFrom,
  removedDerivedFrom,
  hasExternalLineage,
  onSelectItem,
  isItemHidden,
  isDark,
  borderColor,
}: LineageContentProps) {
  if (!selectedItem) {
    return (
      <div className="p-4">
        <p 
          className="text-xs italic"
          style={{ color: "#737373" }}
        >
          Nothing selected
        </p>
      </div>
    );
  }

  return (
    <div className="p-4">
        {/* Current item indicator */}
        <div className="mb-6">
          <div 
            className="text-[10px] font-semibold tracking-wider uppercase mb-2"
            style={{ color: isDark ? "#a3a3a3" : "#525252" }}
          >
            Viewing
          </div>
          <div className="flex items-start gap-2 min-w-0">
            <span className="shrink-0 mt-0.5">
              <NodeTypeIcon 
                type={selectedItem.type === "source" ? "source" : selectedItem.type === "synthesis" ? "synthesis" : "artifact"} 
                color={isDark ? "#737373" : "#737373"}
                isLink={selectedItem.type === "source" && (selectedItem as SourceItem).kind === "external_link"}
              />
            </span>
            <div 
              className="text-xs font-medium break-words min-w-0 flex-1"
              style={{ color: isDark ? "#f5f5f5" : "#171717" }}
            >
              {selectedItem.title}
            </div>
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
          {derivedFrom.length === 0 && externalDerivedFrom.length === 0 && removedDerivedFrom.length === 0 ? (
            <p 
              className="text-xs italic"
              style={{ color: "#737373" }}
            >
              {selectedItem.type === "source" 
                ? "Sources are primary inputs" 
                : "No upstream items"}
            </p>
          ) : (
            <div className="space-y-1">
              {/* Local derived from items */}
              {derivedFrom.map((item) => (
                <LocalLineageItem
                  key={item.id}
                  item={item}
                  isDark={isDark}
                  onClick={() => onSelectItem(item.id)}
                  isHiddenInReadOnly={isItemHidden(item.type)}
                />
              ))}
              
              {/* External derived from items */}
              {externalDerivedFrom.map((ref) => (
                <ExternalLineageItem
                  key={ref.id}
                  reference={ref}
                  isDark={isDark}
                />
              ))}
              
              {/* Removed derived from items */}
              {removedDerivedFrom.map((removed) => (
                <RemovedLineageItemComponent
                  key={removed.id}
                  item={removed}
                  isDark={isDark}
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
              style={{ color: "#737373" }}
            >
              No downstream items
            </p>
          ) : (
            <div className="space-y-1">
              {informs.map((item) => (
                <LocalLineageItem
                  key={item.id}
                  item={item}
                  isDark={isDark}
                  onClick={() => onSelectItem(item.id)}
                  isHiddenInReadOnly={isItemHidden(item.type)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Visual lineage indicator */}
        {(derivedFrom.length > 0 || informs.length > 0 || externalDerivedFrom.length > 0 || removedDerivedFrom.length > 0) && (
          <div 
            className="mt-6 pt-4"
            style={{ borderTop: `1px solid ${borderColor}` }}
          >
            <div 
              className="text-[10px] text-center"
              style={{ color: isDark ? "#737373" : "#737373" }}
            >
              {(derivedFrom.length > 0 || externalDerivedFrom.length > 0 || removedDerivedFrom.length > 0) && (
                <span>
                  {derivedFrom.length + externalDerivedFrom.length + removedDerivedFrom.length} upstream
                  {(externalDerivedFrom.length > 0 || removedDerivedFrom.length > 0) && (
                    <span style={{ color: isDark ? "#525252" : "#a3a3a3" }}>
                      {" "}({externalDerivedFrom.length > 0 && `${externalDerivedFrom.length} external`}
                      {externalDerivedFrom.length > 0 && removedDerivedFrom.length > 0 && ", "}
                      {removedDerivedFrom.length > 0 && `${removedDerivedFrom.length} removed`})
                    </span>
                  )}
                </span>
              )}
              {(derivedFrom.length > 0 || externalDerivedFrom.length > 0 || removedDerivedFrom.length > 0) && informs.length > 0 && (
                <span> · </span>
              )}
              {informs.length > 0 && (
                <span>{informs.length} downstream</span>
              )}
            </div>
          </div>
        )}
      </div>
  );
}

// =============================================================================
// Change Tracking Content Component
// =============================================================================

interface ChangeTrackingContentProps {
  selectedItem: SpineItem | null;
  calibrationHistory: CalibrationDecision[];
  isDark: boolean;
}

function ChangeTrackingContent({
  selectedItem,
  calibrationHistory,
  isDark,
}: ChangeTrackingContentProps) {
  // Filter to only show changes for the selected item, then sort by timestamp
  const itemChanges = calibrationHistory
    .filter((decision) => selectedItem && decision.itemId === selectedItem.id)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

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

  if (!selectedItem) {
    return (
      <div className="p-4">
        <p 
          className="text-xs italic"
          style={{ color: "#737373" }}
        >
          Nothing selected
        </p>
      </div>
    );
  }

  if (itemChanges.length === 0) {
    return (
      <div className="p-4">
        <p 
          className="text-xs italic"
          style={{ color: "#737373" }}
        >
          No changes tracked
        </p>
      </div>
    );
  }

  return (
    <div className="py-2">
      {itemChanges.map((decision, index) => (
        <div
          key={decision.id}
          className="px-4 py-3"
          style={{
            borderBottom: index < itemChanges.length - 1 
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

          {/* Suggestion summary */}
          <div 
            className="text-[10px] leading-relaxed"
            style={{ color: "#737373" }}
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
            <span>from {decision.sourceTitle}</span>
          </div>
        </div>
      ))}
      
      {/* Footer with count */}
      <div
        className="px-4 py-2 text-center"
        style={{ 
          borderTop: `1px solid ${isDark ? "#262626" : "#e5e5e5"}`,
          color: isDark ? "#525252" : "#a3a3a3",
        }}
      >
        <span className="text-[10px]">
          {itemChanges.filter(d => d.decision === "changed").length} changed, {" "}
          {itemChanges.filter(d => d.decision === "ignored").length} ignored
        </span>
      </div>
    </div>
  );
}

// =============================================================================
// Local Lineage Item Component
// =============================================================================

interface LocalLineageItemProps {
  item: SpineItem;
  isDark: boolean;
  onClick: () => void;
  /** When true, item is hidden from read-only view */
  isHiddenInReadOnly?: boolean;
}

function LocalLineageItem({ item, isDark, onClick, isHiddenInReadOnly }: LocalLineageItemProps) {
  // Get the icon type
  const iconType = item.type === "source" ? "source" : item.type === "synthesis" ? "synthesis" : "artifact";
  const isLinkSource = item.type === "source" && (item as SourceItem).kind === "external_link";
  
  // If hidden in read-only view, show as non-clickable with badge
  if (isHiddenInReadOnly) {
    return (
      <div
        className="w-full text-left px-2.5 py-1.5 rounded-md opacity-50"
        style={{ 
          border: `0.5px dashed ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`,
        }}
      >
      <div className="flex items-start gap-2">
        <span className="shrink-0">
          <NodeTypeIcon type={iconType} isLink={isLinkSource} color={isDark ? "#525252" : "#a3a3a3"} />
        </span>
          <div 
            className="text-xs break-words flex items-start gap-1.5 min-w-0 flex-1"
            style={{ color: isDark ? "#737373" : "#a3a3a3" }}
          >
            <span className="break-words">{item.title}</span>
            <span 
              className="text-[8px] px-1 py-0.5 rounded font-medium shrink-0"
              style={{ 
                backgroundColor: isDark ? "#3f3f46" : "#e5e5e5",
                color: isDark ? "#a1a1aa" : "#737373",
              }}
              title="Not included in this read-only view"
            >
              Not included
            </span>
          </div>
        </div>
      </div>
    );
  }
  
  // Secondary button-style border, no fill
  const hoverBg = isDark ? "rgba(255, 255, 255, 0.04)" : "rgba(0, 0, 0, 0.03)";
  const border = isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)";
  
  return (
    <button
      onClick={onClick}
      className="w-full text-left px-2.5 py-1.5 rounded-md cursor-pointer"
      style={{ 
        border: `0.5px solid ${border}`,
        backgroundColor: "transparent",
        transition: "all 150ms cubic-bezier(0.16, 1, 0.3, 1)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = hoverBg;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = "transparent";
      }}
    >
      <div className="flex items-start gap-2">
        <span className="shrink-0">
          <NodeTypeIcon type={iconType} isLink={isLinkSource} color={isDark ? "#737373" : "#737373"} />
        </span>
        <div 
          className="text-xs break-words min-w-0 flex-1"
          style={{ color: isDark ? "#d4d4d4" : "#404040" }}
        >
          {item.title}
        </div>
      </div>
    </button>
  );
}

// =============================================================================
// External Lineage Item Component
// =============================================================================

interface ExternalLineageItemProps {
  reference: LineageReference;
  isDark: boolean;
}

function ExternalLineageItem({ reference, isDark }: ExternalLineageItemProps) {
  const isClickable = reference.availability === "AVAILABLE";
  const iconType = reference.type === "source" ? "source" : reference.type === "synthesis" ? "synthesis" : "artifact";
  
  // External items use blue accent border, no fill
  const hoverBg = isDark ? "rgba(59, 130, 246, 0.06)" : "rgba(59, 130, 246, 0.04)";
  const border = isDark ? "rgba(59, 130, 246, 0.3)" : "rgba(59, 130, 246, 0.25)";
  
  // Handle click for available items - open in new tab
  const handleClick = () => {
    if (isClickable) {
      window.open(`/projects/${reference.originFieldbookId}`, "_blank");
    }
  };

  const Component = isClickable ? "button" : "div";
  
  return (
    <Component
      onClick={isClickable ? handleClick : undefined}
      className={`w-full text-left px-2.5 py-1.5 rounded-md ${isClickable ? "cursor-pointer" : "cursor-default"}`}
      style={{ 
        border: `0.5px solid ${border}`,
        backgroundColor: "transparent",
        transition: "all 150ms cubic-bezier(0.16, 1, 0.3, 1)",
      }}
      {...(isClickable && {
        onMouseEnter: (e: React.MouseEvent<HTMLButtonElement>) => {
          e.currentTarget.style.backgroundColor = hoverBg;
        },
        onMouseLeave: (e: React.MouseEvent<HTMLButtonElement>) => {
          e.currentTarget.style.backgroundColor = "transparent";
        },
      })}
    >
      <div className="flex items-start gap-2">
        <span className="shrink-0">
          <NodeTypeIcon type={iconType} color={isDark ? "#60a5fa" : "#2563eb"} />
        </span>
        <div className="min-w-0 flex-1">
          <div 
            className="text-xs break-words"
            style={{ color: isDark ? "#93c5fd" : "#2563eb" }}
          >
            {reference.title}
          </div>
          <div 
            className="text-[10px] mt-0.5 break-words flex items-start gap-1"
            style={{ color: isDark ? "#525252" : "#a3a3a3" }}
          >
            <span 
              className="text-[9px] px-1 py-0.5 rounded shrink-0"
              style={{ 
                backgroundColor: isDark ? "#1e3a5f" : "#dbeafe",
                color: isDark ? "#93c5fd" : "#1e40af",
              }}
            >
              External
            </span>
            <span className="break-words">from {reference.originFieldbookLabel}</span>
          </div>
        </div>
      </div>
    </Component>
  );
}

// =============================================================================
// Removed Lineage Item Component
// =============================================================================

interface RemovedLineageItemProps {
  item: RemovedLineageItem;
  isDark: boolean;
}

function RemovedLineageItemComponent({ item, isDark }: RemovedLineageItemProps) {
  const iconType = item.type === "source" ? "source" : "synthesis";
  const border = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)";
  
  return (
    <div
      className="w-full text-left px-2.5 py-1.5 rounded-md"
      style={{ 
        border: `0.5px dashed ${border}`,
        opacity: 0.65,
      }}
    >
      <div className="flex items-start gap-2">
        <span className="shrink-0 relative">
          <NodeTypeIcon type={iconType} color={isDark ? "#525252" : "#a3a3a3"} />
          {/* Strikethrough overlay */}
          <svg 
            className="w-3 h-3 absolute inset-0" 
            viewBox="0 0 12 12"
            stroke={isDark ? "#525252" : "#a3a3a3"}
            strokeWidth="1"
          >
            <line x1="2" y1="10" x2="10" y2="2" />
          </svg>
        </span>
        <div 
          className="text-xs break-words min-w-0 flex-1 italic"
          style={{ color: isDark ? "#525252" : "#a3a3a3" }}
        >
          Removed source
        </div>
      </div>
    </div>
  );
}
