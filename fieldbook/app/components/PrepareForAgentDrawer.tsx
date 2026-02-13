"use client";

/**
 * PrepareForAgentDrawer — Compile artifact output for human or AI/agent consumption.
 *
 * Options:
 *   Compile target   → Human Brief (MD), Agent Context (MD + tasks), Both
 *   Scope            → This artifact only, +lineage (1 hop), +lineage (full)
 *   Output format    → Markdown, JSON (preview only), Repo bundle (coming soon)
 */

import { useState, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { useTheme } from "./ThemeProvider";
import { Button } from "./Button";

// ─── Types ───────────────────────────────────────────────────────────────────

type CompileTarget = "human" | "agent" | "both";
type Scope = "artifact" | "lineage-1" | "lineage-full";
type OutputFormat = "markdown" | "json" | "bundle";

interface PrepareForAgentDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  artifactTitle: string;
  /** Fieldbook ID for compile API call */
  fieldbookId?: string;
  /** Node ID for compile API call */
  nodeId?: string;
  /** Legacy callback — used if fieldbookId/nodeId not provided */
  onCompile?: (options: {
    target: CompileTarget;
    scope: Scope;
    format: OutputFormat;
  }) => void;
}

// ─── Option group component ──────────────────────────────────────────────────

function OptionGroup({
  label,
  options,
  value,
  onChange,
  isDark,
}: {
  label: string;
  options: { id: string; label: string; description?: string; disabled?: boolean; badge?: string }[];
  value: string;
  onChange: (id: string) => void;
  isDark: boolean;
}) {
  return (
    <div className="mb-8">
      <div
        className="text-[10px] font-medium tracking-wider uppercase mb-3"
        style={{ color: isDark ? "#d4d4d4" : "#525252" }}
      >
        {label}
      </div>
      <div className="flex flex-col gap-1">
        {options.map((opt) => {
          const isSelected = value === opt.id;
          const isDisabled = opt.disabled;

          return (
            <button
              key={opt.id}
              onClick={() => !isDisabled && onChange(opt.id)}
              disabled={isDisabled}
              className="text-left px-3 py-2.5 rounded-md transition-colors flex items-start gap-3"
              style={{
                backgroundColor: isSelected
                  ? (isDark ? "rgba(139, 92, 246, 0.1)" : "rgba(124, 58, 237, 0.06)")
                  : "transparent",
                border: `0.5px solid ${
                  isSelected
                    ? (isDark ? "rgba(139, 92, 246, 0.3)" : "rgba(124, 58, 237, 0.2)")
                    : (isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)")
                }`,
                cursor: isDisabled ? "default" : "pointer",
                opacity: isDisabled ? 0.4 : 1,
              }}
              onMouseEnter={(e) => {
                if (!isSelected && !isDisabled) {
                  e.currentTarget.style.backgroundColor = isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isSelected && !isDisabled) {
                  e.currentTarget.style.backgroundColor = "transparent";
                }
              }}
            >
              {/* Radio dot */}
              <span
                className="shrink-0 mt-0.5 w-3.5 h-3.5 rounded-full border flex items-center justify-center"
                style={{
                  borderColor: isSelected
                    ? (isDark ? "#8b5cf6" : "#7c3aed")
                    : (isDark ? "#525252" : "#d4d4d4"),
                  transition: "border-color 150ms ease",
                }}
              >
                {isSelected && (
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{
                      backgroundColor: isDark ? "#8b5cf6" : "#7c3aed",
                      animation: "agentDotIn 200ms cubic-bezier(0.16, 1, 0.3, 1) both",
                    }}
                  />
                )}
              </span>

              {/* Label + description */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className="text-xs font-medium"
                    style={{
                      color: isSelected
                        ? (isDark ? "#f5f5f5" : "#171717")
                        : (isDark ? "#d4d4d4" : "#404040"),
                    }}
                  >
                    {opt.label}
                  </span>
                  {opt.badge && (
                    <span
                      className="text-[9px] px-1.5 py-0.5 rounded-sm font-medium"
                      style={{
                        backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
                        color: isDark ? "#737373" : "#a3a3a3",
                      }}
                    >
                      {opt.badge}
                    </span>
                  )}
                </div>
                {opt.description && (
                  <p
                    className="text-[11px] mt-0.5 leading-relaxed"
                    style={{ color: isDark ? "#737373" : "#a3a3a3" }}
                  >
                    {opt.description}
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function sanitize(name: string): string {
  return name
    .replace(/[^a-z0-9\s-]/gi, "")
    .replace(/\s+/g, "-")
    .toLowerCase()
    .slice(0, 50) || "stacks-export";
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── Main drawer ─────────────────────────────────────────────────────────────

export function PrepareForAgentDrawer({
  isOpen,
  onClose,
  artifactTitle,
  fieldbookId,
  nodeId,
  onCompile,
}: PrepareForAgentDrawerProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [target, setTarget] = useState<CompileTarget>("agent");
  const [scope, setScope] = useState<Scope>("lineage-1");
  const [format, setFormat] = useState<OutputFormat>("markdown");
  const [isCompiling, setIsCompiling] = useState(false);

  const handleCompile = useCallback(async () => {
    // If we have fieldbookId and nodeId, call the compile API directly
    if (fieldbookId && nodeId) {
      setIsCompiling(true);
      try {
        const res = await fetch(`/api/v2/fieldbooks/${fieldbookId}/compile`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nodeId, target, scope, format }),
        });

        if (!res.ok) {
          const errBody = await res.json().catch(() => null);
          console.error("Compile failed:", errBody);
          return;
        }

        // Handle file download based on format
        if (format === "markdown") {
          const text = await res.text();
          const blob = new Blob([text], { type: "text/markdown" });
          downloadBlob(blob, `${sanitize(artifactTitle)}.md`);
        } else if (format === "bundle") {
          const blob = await res.blob();
          downloadBlob(blob, `${sanitize(artifactTitle)}-bundle.zip`);
        } else {
          // JSON — download as file
          const data = await res.json();
          const blob = new Blob([JSON.stringify(data.data ?? data, null, 2)], {
            type: "application/json",
          });
          downloadBlob(blob, `${sanitize(artifactTitle)}.json`);
        }

        onClose();
      } catch (error) {
        console.error("Compile error:", error);
      } finally {
        setIsCompiling(false);
      }
    } else {
      // Legacy: delegate to parent callback
      onCompile?.({ target, scope, format });
    }
  }, [target, scope, format, fieldbookId, nodeId, artifactTitle, onCompile, onClose]);

  // Portal target — render at document.body to escape stacking contexts
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setPortalTarget(document.body);
  }, []);

  if (!portalTarget) return null;

  return createPortal(
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
        className="fixed top-0 right-0 h-full z-50 flex flex-col shadow-xl"
        style={{
          width: 400,
          transform: isOpen ? "translateX(0)" : "translateX(100%)",
          transition: "transform 300ms cubic-bezier(0.16, 1, 0.3, 1)",
          backgroundColor: isDark ? "#1c1c1c" : "#ffffff",
          borderLeft: `1px solid ${isDark ? "#333333" : "#e5e5e5"}`,
        }}
        role="dialog"
        aria-label="Prepare for Agent"
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
              Prepare for Agent
            </h2>
            <p
              className="text-[11px] mt-0.5 truncate max-w-[280px]"
              style={{ color: isDark ? "#737373" : "#a3a3a3" }}
            >
              {artifactTitle}
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

        {/* Content */}
        <div className="flex-1 overflow-y-auto min-h-0 px-5 py-5">
          <OptionGroup
            label="Compile target"
            value={target}
            onChange={(id) => setTarget(id as CompileTarget)}
            isDark={isDark}
            options={[
              {
                id: "human",
                label: "Human Brief",
                description: "Clean markdown for reading, sharing, or pasting into docs.",
              },
              {
                id: "agent",
                label: "Agent Context",
                description: "Markdown with structured tasks, context window, and lineage metadata.",
              },
              {
                id: "both",
                label: "Both",
                description: "Human-readable brief + machine-readable context in one output.",
              },
            ]}
          />

          <OptionGroup
            label="Scope"
            value={scope}
            onChange={(id) => setScope(id as Scope)}
            isDark={isDark}
            options={[
              {
                id: "artifact",
                label: "This artifact only",
                description: "Just the artifact content and metadata.",
              },
              {
                id: "lineage-1",
                label: "Artifact + lineage (1 hop)",
                description: "Include direct upstream sources and syntheses.",
              },
              {
                id: "lineage-full",
                label: "Artifact + lineage (full)",
                description: "Walk the entire derivation tree to root sources.",
              },
            ]}
          />

          <OptionGroup
            label="Output format"
            value={format}
            onChange={(id) => setFormat(id as OutputFormat)}
            isDark={isDark}
            options={[
              {
                id: "markdown",
                label: "Markdown",
                description: "Universal, paste-anywhere format.",
              },
              {
                id: "json",
                label: "JSON",
                description: "Structured output for programmatic use.",
              },
              {
                id: "bundle",
                label: "Bundle (.zip)",
                description: "context.json + stack.md + lineage.json packaged together.",
              },
            ]}
          />
        </div>

        {/* Footer */}
        <div
          className="shrink-0 px-5 py-4 flex items-center justify-between"
          style={{ borderTop: `1px solid ${isDark ? "#333333" : "#e5e5e5"}` }}
        >
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleCompile} disabled={isCompiling}>
            {isCompiling ? "Compiling..." : "Compile"}
          </Button>
        </div>
      </div>

      {/* Keyframes */}
      <style>{`
        @keyframes agentDotIn {
          0% { transform: scale(0); }
          100% { transform: scale(1); }
        }
      `}</style>
    </>,
    portalTarget
  );
}
