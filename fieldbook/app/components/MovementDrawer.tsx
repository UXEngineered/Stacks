"use client";

/**
 * MovementDrawer - Right-side drawer for significant shifts in the fieldbook
 *
 * Shows only meaningful movement events, not activity tracking.
 * Scannable in ~5-7 seconds. Progressive disclosure for details.
 */

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "./ThemeProvider";
import type { MovementEvent, MovementFilter } from "@/app/lib/movement/types";
import { deriveSeverity } from "@/app/lib/movement/types";
import { getLastSeenAt, getUnseenCount, setLastSeenAt } from "@/app/lib/movement/mock";

// ─── Helpers ──────────────────────────────────────────────────────────────────

interface MovementDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  events: MovementEvent[];
  projectId: string;
  userId?: string;
  onNavigateToItem?: (id: string) => void;
}

const FILTER_LABELS: Record<MovementFilter, string> = {
  all: "All",
  upstream: "Upstream",
  synthesis: "Synthesis",
  artifacts: "Artifacts",
  structural: "Structural",
};

const TYPE_TO_FILTER: Record<MovementEvent["type"], MovementFilter> = {
  source_added: "upstream",
  source_replaced: "upstream",
  synthesis_recalibrated: "synthesis",
  artifact_checkpoint: "artifacts",
  artifact_major_update: "artifacts",
  lineage_changed: "structural",
  node_created: "structural",
  node_archived: "structural",
};

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString();
}

/** 24-hour boundary for "Recent" vs "Earlier" bucketing */
function isWithin24h(iso: string): boolean {
  return Date.now() - new Date(iso).getTime() < 24 * 60 * 60 * 1000;
}

// ─── Chip selection logic ─────────────────────────────────────────────────────

/**
 * Pick the single most informative chip to show by default.
 * Returns { primary, hiddenCount }.
 */
function selectPrimaryChip(event: MovementEvent): {
  primary: string | null;
  all: string[];
} {
  const chips: string[] = [];
  if (event.affectedNodeIds.length > 0) {
    chips.push(`Affects ${event.affectedNodeIds.length} downstream`);
  }
  event.impactedArtifacts.forEach((a) => chips.push(`Impacts: ${a.name}`));

  if (chips.length === 0) return { primary: null, all: [] };

  // Prefer a single named artifact over the generic "Affects N"
  const artifactChip = event.impactedArtifacts.length === 1
    ? `Impacts: ${event.impactedArtifacts[0].name}`
    : null;

  const primary = artifactChip ?? chips[0];
  return { primary, all: chips };
}

// ─── Shared transition config ─────────────────────────────────────────────────

const COLLAPSE_DURATION_MS = 350;
const COLLAPSE_EASING = "cubic-bezier(0.16, 1, 0.3, 1)";

// ─── Chevron icon ─────────────────────────────────────────────────────────────

function ChevronIcon({ expanded, isDark }: { expanded: boolean; isDark: boolean }) {
  return (
    <svg
      className="w-3 h-3"
      style={{
        transform: expanded ? "rotate(90deg)" : "rotate(0deg)",
        transition: `transform ${COLLAPSE_DURATION_MS}ms ${COLLAPSE_EASING}`,
        color: isDark ? "#525252" : "#a3a3a3",
      }}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}

// ─── Animated collapsible wrapper ─────────────────────────────────────────────

function CollapsibleSection({
  collapsed,
  children,
}: {
  collapsed: boolean;
  children: React.ReactNode;
}) {
  const innerRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | "auto">(collapsed ? 0 : "auto");
  const isFirstRender = useRef(true);

  // Measure content height whenever collapsed state or children change
  useLayoutEffect(() => {
    if (!innerRef.current) return;

    if (isFirstRender.current) {
      // On first render, snap to correct state (no animation)
      isFirstRender.current = false;
      setHeight(collapsed ? 0 : innerRef.current.scrollHeight);
      return;
    }

    if (collapsed) {
      // Collapsing: set explicit height first so transition can animate from it
      const h = innerRef.current.scrollHeight;
      setHeight(h);
      // Force reflow, then set to 0
      requestAnimationFrame(() => {
        setHeight(0);
      });
    } else {
      // Expanding: animate to measured height, then switch to auto
      setHeight(innerRef.current.scrollHeight);
    }
  }, [collapsed]);

  // After expand animation ends, switch to auto so content can reflow
  const handleTransitionEnd = useCallback(() => {
    if (!collapsed) {
      setHeight("auto");
    }
  }, [collapsed]);

  return (
    <div
      style={{
        height: height === "auto" ? "auto" : height,
        overflow: "hidden",
        opacity: collapsed ? 0 : 1,
        transition: `height ${COLLAPSE_DURATION_MS}ms ${COLLAPSE_EASING}, opacity ${COLLAPSE_DURATION_MS}ms ${COLLAPSE_EASING}`,
      }}
      onTransitionEnd={handleTransitionEnd}
    >
      <div ref={innerRef}>
        {children}
      </div>
    </div>
  );
}

// ─── Filters ──────────────────────────────────────────────────────────────────

function MovementFilters({
  active,
  onChange,
  isDark,
}: {
  active: MovementFilter;
  onChange: (f: MovementFilter) => void;
  isDark: boolean;
}) {
  const filters: MovementFilter[] = ["all", "upstream", "synthesis", "artifacts", "structural"];
  const hoverBg = isDark ? "rgba(255,255,255,0.05)" : "#f5f5f5";

  return (
    <div className="flex flex-wrap gap-1">
      {filters.map((f) => (
        <button
          key={f}
          onClick={() => onChange(f)}
          className="px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer"
          style={{
            backgroundColor: active === f ? hoverBg : "transparent",
            color: active === f ? (isDark ? "#f5f5f5" : "#171717") : (isDark ? "#737373" : "#a3a3a3"),
          }}
          onMouseEnter={(e) => {
            if (active !== f) {
              e.currentTarget.style.backgroundColor = hoverBg;
              e.currentTarget.style.color = isDark ? "#a3a3a3" : "#525252";
            }
          }}
          onMouseLeave={(e) => {
            if (active !== f) {
              e.currentTarget.style.backgroundColor = "transparent";
              e.currentTarget.style.color = isDark ? "#737373" : "#a3a3a3";
            }
          }}
        >
          {FILTER_LABELS[f]}
        </button>
      ))}
    </div>
  );
}

// ─── Event row ────────────────────────────────────────────────────────────────

function MovementEventRow({
  event,
  isDark,
  isUnseen,
  isExpanded,
  onToggleExpand,
  onNavigate,
}: {
  event: MovementEvent;
  isDark: boolean;
  isUnseen: boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onNavigate?: (id: string) => void;
}) {
  const severity = deriveSeverity(event);
  const isMajor = severity === "major";
  const { primary, all: allChips } = selectPrimaryChip(event);
  const hiddenCount = primary ? allChips.length - 1 : 0;
  const secondaryChips = primary ? allChips.filter((c) => c !== primary) : [];
  const hasSummary = !!event.summary;

  const handleNavigate = useCallback(() => {
    if (event.nodeId && onNavigate) onNavigate(event.nodeId);
  }, [event.nodeId, onNavigate]);

  const handleRowClick = useCallback(() => {
    // If there are hidden details, toggle expand; otherwise navigate
    if (hiddenCount > 0 || event.createdBy) {
      onToggleExpand();
    } else {
      handleNavigate();
    }
  }, [hiddenCount, event.createdBy, onToggleExpand, handleNavigate]);

  // Dot opacity: major unseen = full, normal unseen = slightly softer
  const dotColor = isUnseen
    ? isMajor
      ? (isDark ? "#8b5cf6" : "#7c3aed")
      : (isDark ? "rgba(139,92,246,0.6)" : "rgba(124,58,237,0.6)")
    : "transparent";

  // Title color: major = normal text, normal = slightly dimmer
  const titleColor = isMajor
    ? (isDark ? "#f5f5f5" : "#171717")
    : (isDark ? "#d4d4d4" : "#404040");

  const titleWeight = isMajor ? 500 : 400;

  const chipBg = isDark ? "#262626" : "#f5f5f5";
  const chipColor = isDark ? "#a3a3a3" : "#525252";

  return (
    <div
      style={{
        borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`,
        padding: "3px 0",
      }}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={handleRowClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleRowClick();
          }
        }}
        className="rounded-md transition-colors flex gap-2.5"
        style={{
          cursor: "pointer",
          padding: "6px 8px",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = isDark ? "rgba(255,255,255,0.05)" : "#f5f5f5";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = "transparent";
        }}
      >
        {/* Unseen dot column */}
        <span
          className="shrink-0 mt-1 w-2 h-2 rounded-full"
          style={{ backgroundColor: dotColor }}
          aria-hidden
        />

        {/* Content */}
        <div className="min-w-0 flex-1">
          {/* Title */}
          <div
            className="text-xs leading-snug"
            style={{ color: titleColor, fontWeight: titleWeight }}
          >
            {event.title}
          </div>

          {/* Summary (optional) */}
          {hasSummary && (
            <p
              className="text-[11px] leading-relaxed mt-0.5"
              style={{ color: isDark ? "#a3a3a3" : "#737373" }}
            >
              {event.summary}
            </p>
          )}

          {/* Primary chip + hidden indicator */}
          {primary && (
            <div
              className="flex items-center gap-1"
              style={{ marginTop: hasSummary ? 4 : 3 }}
            >
              <span
                className="px-1.5 py-0.5 rounded text-[10px]"
                style={{ backgroundColor: chipBg, color: chipColor }}
              >
                {primary}
              </span>
              {hiddenCount > 0 && (
                <span
                  className="text-[10px]"
                  style={{ color: isDark ? "#525252" : "#a3a3a3" }}
                >
                  +{hiddenCount}
                </span>
              )}
            </div>
          )}

          {/* Expanded: secondary chips + author */}
          {isExpanded && (secondaryChips.length > 0 || event.createdBy) && (
            <div className="mt-1.5">
              {secondaryChips.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-1">
                  {secondaryChips.map((chip) => (
                    <span
                      key={chip}
                      className="px-1.5 py-0.5 rounded text-[10px]"
                      style={{ backgroundColor: chipBg, color: chipColor }}
                    >
                      {chip}
                    </span>
                  ))}
                </div>
              )}
              {event.createdBy && (
                <div
                  className="text-[10px]"
                  style={{ color: isDark ? "#525252" : "#a3a3a3" }}
                >
                  By {event.createdBy}
                </div>
              )}
              {event.nodeId && onNavigate && (
                <button
                  className="text-[10px] mt-1 cursor-pointer"
                  style={{ color: isDark ? "#8b5cf6" : "#7c3aed" }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleNavigate();
                  }}
                >
                  Go to node &rarr;
                </button>
              )}
            </div>
          )}

          {/* Timestamp (with author tooltip if not expanded) */}
          <div
            className="text-[10px] flex items-center"
            style={{
              color: isDark ? "#525252" : "#a3a3a3",
              marginTop: primary || hasSummary ? 3 : 2,
            }}
          >
            <span title={event.createdBy ? `By ${event.createdBy}` : undefined}>
              {formatTimestamp(event.createdAt)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Section header for collapsible "Earlier" ─────────────────────────────────

function SectionHeader({
  label,
  count,
  collapsed,
  onToggle,
  isDark,
  className,
}: {
  label: string;
  count?: number;
  collapsed?: boolean;
  onToggle?: () => void;
  isDark: boolean;
  className?: string;
}) {
  const isCollapsible = onToggle !== undefined;

  return (
    <div
      role={isCollapsible ? "button" : undefined}
      tabIndex={isCollapsible ? 0 : undefined}
      onClick={onToggle}
      onKeyDown={(e) => {
        if (isCollapsible && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onToggle?.();
        }
      }}
      className={`flex items-center justify-between ${className ?? ""}`}
      style={{
        cursor: isCollapsible ? "pointer" : "default",
        userSelect: "none",
      }}
    >
      <div className="flex items-center gap-1.5">
        {isCollapsible && <ChevronIcon expanded={!collapsed} isDark={isDark} />}
        <span
          className="text-[10px] font-semibold tracking-wider uppercase"
          style={{ color: isDark ? "#a3a3a3" : "#525252" }}
        >
          {label}
        </span>
      </div>
      {count !== undefined && (
        <span
          className="text-[10px]"
          style={{ color: isDark ? "#525252" : "#a3a3a3" }}
        >
          ({count})
        </span>
      )}
    </div>
  );
}

// ─── Main drawer ──────────────────────────────────────────────────────────────

export function MovementDrawer({
  isOpen,
  onClose,
  events,
  projectId,
  userId,
  onNavigateToItem,
}: MovementDrawerProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [filter, setFilter] = useState<MovementFilter>("all");
  const [lastSeenAt, setLastSeenAtState] = useState<string | null>(() =>
    typeof window !== "undefined" ? getLastSeenAt(projectId, userId) : null
  );
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const [earlierCollapsed, setEarlierCollapsed] = useState(true);

  // ── Filtered & bucketed events ──────────────────────────────────────────

  const filteredEvents = useMemo(() => {
    if (filter === "all") return events;
    return events.filter((e) => TYPE_TO_FILTER[e.type] === filter);
  }, [events, filter]);

  const unseenEvents = useMemo(() => {
    if (!lastSeenAt) return new Set(events.map((e) => e.id));
    const cutoff = new Date(lastSeenAt).getTime();
    return new Set(events.filter((e) => new Date(e.createdAt).getTime() > cutoff).map((e) => e.id));
  }, [events, lastSeenAt]);

  const unseenFiltered = useMemo(
    () => filteredEvents.filter((e) => unseenEvents.has(e.id)),
    [filteredEvents, unseenEvents]
  );

  const seenFiltered = useMemo(
    () => filteredEvents.filter((e) => !unseenEvents.has(e.id)),
    [filteredEvents, unseenEvents]
  );

  // Bucket "seen" into Recent (<24h) and Earlier (>24h)
  const recentSeen = useMemo(
    () => seenFiltered.filter((e) => isWithin24h(e.createdAt)),
    [seenFiltered]
  );
  const earlierSeen = useMemo(
    () => seenFiltered.filter((e) => !isWithin24h(e.createdAt)),
    [seenFiltered]
  );

  // ── Mark-as-seen logic ──────────────────────────────────────────────────

  useEffect(() => {
    setLastSeenAtState(getLastSeenAt(projectId, userId));
  }, [projectId, userId]);

  const hasBeenOpenRef = useRef(false);

  useEffect(() => {
    if (isOpen) hasBeenOpenRef.current = true;
    if (!isOpen && hasBeenOpenRef.current && projectId) {
      const now = new Date().toISOString();
      setLastSeenAt(projectId, userId, now);
      setLastSeenAtState(now);
      hasBeenOpenRef.current = false;
    }
  }, [isOpen, projectId, userId]);

  // Reset expanded row when drawer closes
  useEffect(() => {
    if (!isOpen) setExpandedRowId(null);
  }, [isOpen]);

  // ── Handlers ────────────────────────────────────────────────────────────

  const handleToggleExpand = useCallback((id: string) => {
    setExpandedRowId((prev) => (prev === id ? null : id));
  }, []);

  const renderRow = useCallback(
    (event: MovementEvent, isUnseen: boolean) => (
      <MovementEventRow
        key={event.id}
        event={event}
        isDark={isDark}
        isUnseen={isUnseen}
        isExpanded={expandedRowId === event.id}
        onToggleExpand={() => handleToggleExpand(event.id)}
        onNavigate={onNavigateToItem}
      />
    ),
    [isDark, expandedRowId, handleToggleExpand, onNavigateToItem]
  );

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 transition-opacity"
        style={{
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? "auto" : "none",
          backgroundColor: isDark ? "rgba(0,0,0,0.3)" : "rgba(0,0,0,0.15)",
        }}
        onClick={onClose}
        aria-hidden
      />

      {/* Drawer */}
      <div
        className="fixed top-0 right-0 h-full z-50 flex flex-col shadow-xl transition-transform"
        style={{
          width: 400,
          transform: isOpen ? "translateX(0)" : "translateX(100%)",
          transition: "transform 300ms cubic-bezier(0.16, 1, 0.3, 1)",
          backgroundColor: isDark ? "#1c1c1c" : "#ffffff",
          borderLeft: `1px solid ${isDark ? "#333333" : "#e5e5e5"}`,
        }}
        role="dialog"
        aria-label="Movement"
      >
        {/* Header */}
        <div
          className="shrink-0 px-5 py-4 flex items-center justify-between"
          style={{ borderBottom: `1px solid ${isDark ? "#333333" : "#e5e5e5"}` }}
        >
          <div>
            <h2
              className="text-sm font-medium"
              style={{ color: isDark ? "#fafafa" : "#171717" }}
            >
              Movement
            </h2>
            <p
              className="text-[11px] mt-0.5"
              style={{ color: isDark ? "#737373" : "#a3a3a3" }}
            >
              Significant shifts in this fieldbook
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded transition-colors cursor-pointer"
            style={{ color: isDark ? "#737373" : "#a3a3a3" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = isDark ? "#fafafa" : "#171717";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = isDark ? "#737373" : "#a3a3a3";
            }}
            aria-label="Close"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Filters */}
        <div
          className="shrink-0 px-5 py-3"
          style={{ borderBottom: `1px solid ${isDark ? "#262626" : "#f5f5f5"}` }}
        >
          <MovementFilters active={filter} onChange={setFilter} isDark={isDark} />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {filteredEvents.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <p
                className="text-sm"
                style={{ color: isDark ? "#737373" : "#a3a3a3" }}
              >
                No significant movement yet. Add a source or recalibrate a synthesis.
              </p>
            </div>
          ) : (
            <div className="px-5 py-1">
              {/* ── Unseen section ──────────────────────────────────────── */}
              {unseenFiltered.length > 0 && (
                <div className="mb-1">
                  <SectionHeader label="Unseen" isDark={isDark} className="mt-2 mb-1" />
                  {unseenFiltered.map((e) => renderRow(e, true))}
                </div>
              )}

              {/* ── Recent (<24h, seen) ────────────────────────────────── */}
              {recentSeen.length > 0 && (
                <div className="mb-1">
                  <SectionHeader label="Recent" isDark={isDark} className="mt-2 mb-1" />
                  {recentSeen.map((e) => renderRow(e, false))}
                </div>
              )}

              {/* ── Earlier (>24h, seen) — collapsed by default ─────── */}
              {earlierSeen.length > 0 && (
                <div className="mb-1">
                  <SectionHeader
                    label="Earlier"
                    count={earlierSeen.length}
                    collapsed={earlierCollapsed}
                    onToggle={() => setEarlierCollapsed((v) => !v)}
                    isDark={isDark}
                    className="mt-2 mb-1"
                  />
                  <CollapsibleSection collapsed={earlierCollapsed}>
                    {earlierSeen.map((e) => renderRow(e, false))}
                  </CollapsibleSection>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
