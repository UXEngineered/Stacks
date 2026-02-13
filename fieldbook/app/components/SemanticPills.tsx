"use client";

/**
 * SemanticPills — editable pill chips for Type, Status, and Visibility.
 *
 * Placed below the node title in each editor. Clicking a pill opens a
 * small dropdown populated from the catalog config.
 *
 * The dropdown renders via a React portal into document.body so it is
 * never clipped by parent `overflow` containers.
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useTheme } from "./ThemeProvider";
import type { NodeStatus, Visibility } from "./spine/types";
import { labelFor } from "../lib/catalog";

// ---------------------------------------------------------------------------
// Status colors
// ---------------------------------------------------------------------------

export const STATUS_COLORS: Record<NodeStatus, { dot: string; bg: string; bgDark: string }> = {
  draft: { dot: "#9ca3af", bg: "rgba(156,163,175,0.12)", bgDark: "rgba(156,163,175,0.18)" },
  proposed: { dot: "#f59e0b", bg: "rgba(245,158,11,0.10)", bgDark: "rgba(245,158,11,0.18)" },
  canonical: { dot: "#22c55e", bg: "rgba(34,197,94,0.10)", bgDark: "rgba(34,197,94,0.18)" },
  superseded: { dot: "#ef4444", bg: "rgba(239,68,68,0.10)", bgDark: "rgba(239,68,68,0.18)" },
};

/** Returns the color string for a given status (for coloring icons, dots, etc.) */
export function statusColor(status: NodeStatus | string): string {
  return STATUS_COLORS[status as NodeStatus]?.dot || "#9ca3af";
}

// ---------------------------------------------------------------------------
// Pill dropdown (portalled to body)
// ---------------------------------------------------------------------------

function PillDropdown({
  options,
  value,
  onSelect,
  onClose,
  isDark,
  anchorRef,
}: {
  options: string[];
  value: string;
  onSelect: (v: string) => void;
  onClose: () => void;
  isDark: boolean;
  anchorRef: React.RefObject<HTMLButtonElement | null>;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  // Position the dropdown below the anchor button
  useEffect(() => {
    if (anchorRef.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 4, left: rect.left });
    }
  }, [anchorRef]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        ref.current && !ref.current.contains(e.target as Node) &&
        anchorRef.current && !anchorRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose, anchorRef]);

  // Close on scroll (the editor panel might scroll)
  useEffect(() => {
    const handler = () => onClose();
    window.addEventListener("scroll", handler, true);
    return () => window.removeEventListener("scroll", handler, true);
  }, [onClose]);

  if (!pos) return null;

  return createPortal(
    <div
      ref={ref}
      className="fixed rounded-lg shadow-xl"
      style={{
        top: pos.top,
        left: pos.left,
        zIndex: 9999,
        backgroundColor: isDark ? "#1c1c1c" : "#ffffff",
        border: `1px solid ${isDark ? "#333333" : "#e5e5e5"}`,
        minWidth: 180,
        transformOrigin: "top left",
        animation: "pillDropdownIn 150ms cubic-bezier(0.16, 1, 0.3, 1) forwards",
      }}
    >
      <style>{`
        @keyframes pillDropdownIn {
          from { opacity: 0; transform: scale(0.95) translateY(-4px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
      <div className="p-1 flex flex-col gap-0.5">
        {options.map((opt) => {
          const isActive = opt === value;
          const statusEntry = STATUS_COLORS[opt as NodeStatus];
          return (
            <button
              key={opt}
              onClick={() => { onSelect(opt); onClose(); }}
              className="w-full text-left px-3 py-2 flex items-center gap-2.5 transition-colors rounded-md"
              style={{
                color: isActive
                  ? (isDark ? "#e5e5e5" : "#171717")
                  : (isDark ? "#d4d4d4" : "#525252"),
                backgroundColor: isActive
                  ? (isDark ? "rgba(255,255,255,0.05)" : "#f5f5f5")
                  : "transparent",
                fontSize: "12.5px",
                fontWeight: isActive ? 600 : 400,
              }}
              onMouseEnter={(e) => {
                if (!isActive) e.currentTarget.style.backgroundColor = isDark ? "rgba(255,255,255,0.05)" : "#f5f5f5";
              }}
              onMouseLeave={(e) => {
                if (!isActive) e.currentTarget.style.backgroundColor = "transparent";
              }}
            >
              {statusEntry && (
                <span
                  className="inline-block w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: statusEntry.dot }}
                />
              )}
              <span>{labelFor(opt)}</span>
              {isActive && (
                <svg className="w-3.5 h-3.5 ml-auto shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              )}
            </button>
          );
        })}
      </div>
    </div>,
    document.body,
  );
}

// ---------------------------------------------------------------------------
// Single pill
// ---------------------------------------------------------------------------

function Pill({
  label,
  value,
  options,
  onChange,
  isDark,
  readOnly,
  variant,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
  isDark: boolean;
  readOnly?: boolean;
  variant?: "status";
}) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const sc = variant === "status" ? STATUS_COLORS[value as NodeStatus] : null;

  // For status pills, use the status tint as background; otherwise match secondary button
  const bgDefault = sc
    ? (isDark ? sc.bgDark : sc.bg)
    : "transparent";
  const borderDefault = sc
    ? `0.5px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`
    : `0.5px solid ${isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)"}`;
  const bgHover = sc
    ? (isDark ? sc.bgDark : sc.bg) // keep tint on hover for status
    : (isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)");

  return (
    <div className="relative">
      <button
        ref={btnRef}
        onClick={() => !readOnly && setOpen(!open)}
        disabled={readOnly}
        className="inline-flex items-center gap-1.5"
        style={{
          fontSize: "12.5px",
          fontWeight: 500,
          padding: "5px 14px",
          borderRadius: "6px",
          backgroundColor: bgDefault,
          color: isDark ? "#a3a3a3" : "#525252",
          cursor: readOnly ? "default" : "pointer",
          border: borderDefault,
          transition: "all 150ms cubic-bezier(0.16, 1, 0.3, 1)",
        }}
        onMouseEnter={(e) => {
          if (!readOnly) e.currentTarget.style.backgroundColor = bgHover;
        }}
        onMouseLeave={(e) => {
          if (!readOnly) e.currentTarget.style.backgroundColor = bgDefault;
        }}
      >
        {variant === "status" && sc && (
          <span
            className="inline-block w-2 h-2 rounded-full"
            style={{ backgroundColor: sc.dot }}
          />
        )}
        {label && <span style={{ color: isDark ? "#737373" : "#a3a3a3" }}>{label}</span>}
        <span style={{ color: isDark ? "#e5e5e5" : "#262626", fontWeight: 500 }}>{labelFor(value)}</span>
        {!readOnly && (
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ opacity: 0.35, marginLeft: 2 }}>
            <path d="M2.5 3.75L5 6.25L7.5 3.75" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
        )}
      </button>
      {open && (
        <PillDropdown
          options={options}
          value={value}
          onSelect={onChange}
          onClose={() => setOpen(false)}
          isDark={isDark}
          anchorRef={btnRef}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// SemanticPills (exported)
// ---------------------------------------------------------------------------

export interface SemanticPillsProps {
  /** The node's semantic type value */
  typeValue: string;
  /** Allowed type options for this node category */
  typeOptions: string[];
  /** Unified lifecycle status */
  status: NodeStatus;
  /** Audience visibility */
  visibility: Visibility;
  /** Callbacks */
  onTypeChange: (v: string) => void;
  onStatusChange: (v: NodeStatus) => void;
  onVisibilityChange: (v: Visibility) => void;
  /** Disable editing */
  readOnly?: boolean;
}

export function SemanticPills({
  typeValue,
  typeOptions,
  status,
  visibility,
  onTypeChange,
  onStatusChange,
  onVisibilityChange,
  readOnly = false,
}: SemanticPillsProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  // Local state for instant visual feedback (props are async/delayed)
  const [localType, setLocalType] = useState(typeValue);
  const [localStatus, setLocalStatus] = useState<NodeStatus>(status);
  const [localVisibility, setLocalVisibility] = useState<Visibility>(visibility);

  // Sync local state when props change (e.g. after save round-trips or item switch)
  useEffect(() => { setLocalType(typeValue); }, [typeValue]);
  useEffect(() => { setLocalStatus(status); }, [status]);
  useEffect(() => { setLocalVisibility(visibility); }, [visibility]);

  const handleTypeChange = useCallback((v: string) => {
    setLocalType(v);
    onTypeChange(v);
  }, [onTypeChange]);

  const handleStatusChange = useCallback((v: string) => {
    setLocalStatus(v as NodeStatus);
    onStatusChange(v as NodeStatus);
  }, [onStatusChange]);

  const handleVisibilityChange = useCallback((v: string) => {
    setLocalVisibility(v as Visibility);
    onVisibilityChange(v as Visibility);
  }, [onVisibilityChange]);

  return (
    <div className="flex flex-wrap items-center gap-1.5 mb-4">
      <Pill
        label=""
        value={localType}
        options={typeOptions}
        onChange={handleTypeChange}
        isDark={isDark}
        readOnly={readOnly}
      />
      <Pill
        label=""
        value={localStatus}
        options={["draft", "proposed", "canonical", "superseded"]}
        onChange={handleStatusChange}
        isDark={isDark}
        readOnly={readOnly}
        variant="status"
      />
      <Pill
        label=""
        value={localVisibility}
        options={["internal", "client_shareable", "client_facing"]}
        onChange={handleVisibilityChange}
        isDark={isDark}
        readOnly={readOnly}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// StatusDot — small colored dot for use in left nav list items
// ---------------------------------------------------------------------------

export function StatusDot({ status }: { status: NodeStatus }) {
  const color = STATUS_COLORS[status]?.dot || "#9ca3af";
  return (
    <span
      className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0"
      style={{ backgroundColor: color }}
      title={labelFor(status)}
    />
  );
}
