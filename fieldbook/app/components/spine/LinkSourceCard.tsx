"use client";

/**
 * LinkSourceCard - Reference-style card for external link sources
 * 
 * Left-aligned layout matching other source editors.
 * - Editable title
 * - URL input with inline copy icon
 * - "Open original" as secondary button
 * - Metadata (capturedAt, domain)
 * - Honesty guardrail notice
 */

import { useState, useCallback, useEffect, useRef } from "react";
import type { SourceItem } from "./types";
import { useTheme } from "../ThemeProvider";
import { Button } from "../Button";

interface LinkSourceCardProps {
  source: SourceItem;
  onSave?: (source: SourceItem) => void;
  onDelete?: (id: string) => void;
  /** When true, disables all editing controls */
  readOnly?: boolean;
  /** Whether this source has downstream items that depend on it */
  hasDownstreamDependencies?: boolean;
}

function InfoTooltip({ isDark, text }: { isDark: boolean; text: string }) {
  const iconRef = useRef<HTMLSpanElement>(null);
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  const handleEnter = useCallback(() => {
    if (iconRef.current) {
      const rect = iconRef.current.getBoundingClientRect();
      setPos({
        top: rect.top - 8,
        left: rect.left + rect.width / 2,
      });
    }
    setShow(true);
  }, []);

  return (
    <>
      <span
        ref={iconRef}
        className="inline-block align-middle ml-1.5 cursor-default"
        style={{ color: isDark ? "#737373" : "#a3a3a3" }}
        onMouseEnter={handleEnter}
        onMouseLeave={() => setShow(false)}
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
        </svg>
      </span>
      {show && (
        <span
          className="fixed px-3 py-2 rounded-md text-xs whitespace-nowrap pointer-events-none"
          style={{
            zIndex: 9999,
            top: pos.top,
            left: pos.left,
            transform: "translate(-50%, -100%)",
            backgroundColor: isDark ? "#262626" : "#171717",
            color: isDark ? "#a3a3a3" : "#e5e5e5",
            boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
          }}
        >
          {text}
        </span>
      )}
    </>
  );
}

export function LinkSourceCard({ source, onSave, onDelete, readOnly = false, hasDownstreamDependencies = false }: LinkSourceCardProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  
  const [title, setTitle] = useState(source.title);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [isDeleteConfirm, setIsDeleteConfirm] = useState(false);
  
  // Reset delete confirm state after timeout
  useEffect(() => {
    if (isDeleteConfirm) {
      const timer = setTimeout(() => setIsDeleteConfirm(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isDeleteConfirm]);
  
  const borderColor = isDark ? "#404040" : "#e5e5e5";
  const textColor = isDark ? "#f5f5f5" : "#171717";
  const mutedColor = isDark ? "#a3a3a3" : "#737373";
  const linkColor = isDark ? "#60a5fa" : "#2563eb";
  
  const handleTitleSave = useCallback(() => {
    if (readOnly || !onSave) return;
    if (title.trim() !== source.title) {
      onSave({
        ...source,
        title: title.trim() || source.domain || "Untitled Link",
      });
    }
    setIsEditingTitle(false);
  }, [title, source, onSave, readOnly]);
  
  const handleOpenOriginal = useCallback(() => {
    if (source.url) {
      window.open(source.url, "_blank", "noopener,noreferrer");
    }
  }, [source.url]);
  
  const handleCopyLink = useCallback(async () => {
    if (source.url) {
      try {
        await navigator.clipboard.writeText(source.url);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      } catch (err) {
        console.error("Failed to copy:", err);
      }
    }
  }, [source.url]);
  
  // Format the captured date
  const capturedDate = source.capturedAt 
    ? new Date(source.capturedAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : null;

  return (
    <div className="h-full flex flex-col">
      {/* Header - matches SourceEditor */}
      <div 
        className="px-8 py-2.5 flex items-center justify-between shrink-0"
        style={{ borderBottom: `1px solid ${isDark ? "#262626" : "#e5e5e5"}` }}
      >
        <div className="flex items-center gap-2">
          <span 
            className="text-[10px] font-medium tracking-wider uppercase"
            style={{ color: isDark ? "#d4d4d4" : "#525252" }}
          >
            Source
          </span>
        </div>
        
        {!readOnly && (
          <div className="flex items-center gap-1">
            {onDelete && (
              hasDownstreamDependencies ? (
                isDeleteConfirm ? (
                  <button
                    onClick={() => onDelete(source.id)}
                    className="inline-flex items-center justify-center cursor-pointer"
                    style={{
                      fontSize: "12.5px",
                      fontWeight: 500,
                      padding: "5px 16px",
                      borderRadius: "6px",
                      backgroundColor: isDark ? "#7f1d1d" : "#dc2626",
                      color: "#ffffff",
                      border: `0.5px solid ${isDark ? "#991b1b" : "#b91c1c"}`,
                      transition: "all 150ms cubic-bezier(0.16, 1, 0.3, 1)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = isDark ? "#991b1b" : "#b91c1c";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = isDark ? "#7f1d1d" : "#dc2626";
                    }}
                  >
                    Confirm
                  </button>
                ) : (
                  <Button variant="secondary" onClick={() => setIsDeleteConfirm(true)}>
                    Delete
                  </Button>
                )
              ) : (
                <Button variant="secondary" onClick={() => onDelete(source.id)}>
                  Delete
                </Button>
              )
            )}
          </div>
        )}
      </div>
      
      {/* Content - left-aligned like other sources */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="px-8 py-6 max-w-2xl">
          {/* Title + info tooltip inline */}
          <div className="mb-1.5">
            {isEditingTitle && !readOnly ? (
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={handleTitleSave}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleTitleSave();
                  if (e.key === "Escape") {
                    setTitle(source.title);
                    setIsEditingTitle(false);
                  }
                }}
                autoFocus
                className="w-full text-lg font-medium bg-transparent border-none outline-none"
                style={{ color: textColor, letterSpacing: "-0.01em" }}
              />
            ) : (
              <span 
                className={`text-lg font-medium inline ${readOnly ? '' : 'cursor-pointer hover:opacity-80'}`}
                style={{ color: textColor, letterSpacing: "-0.01em" }}
                onClick={readOnly ? undefined : () => setIsEditingTitle(true)}
                title={readOnly ? undefined : "Click to edit title"}
              >
                {source.title}
              </span>
            )}
            {/* Info icon with fixed-position tooltip */}
            {!isEditingTitle && (
              <InfoTooltip isDark={isDark} text="Declared reference — not analyzed content" />
            )}
          </div>

          {/* Metadata - under title */}
          <div 
            className="mb-5 flex items-center gap-1.5 flex-wrap"
            style={{ fontSize: "12.5px", color: mutedColor }}
          >
            {source.domain && (
              <span>{source.domain}</span>
            )}
            {source.domain && capturedDate && (
              <span style={{ color: isDark ? "#333" : "#d4d4d4" }}>·</span>
            )}
            {capturedDate && (
              <span>{capturedDate}</span>
            )}
          </div>

          {/* URL input with copy icon inside + open-in-new-tab icon outside */}
          <div className="mb-5 flex items-center gap-2">
            <div className="relative flex-1 min-w-0">
              <div 
                className="w-full px-3 py-2 pr-9 rounded-md text-xs font-mono break-all"
                style={{ 
                  backgroundColor: isDark ? "#262626" : "#f5f5f5",
                  color: linkColor,
                  border: `0.5px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`,
                }}
              >
                {source.url}
              </div>
              <button
                onClick={handleCopyLink}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded transition-colors cursor-pointer"
                style={{ color: copySuccess ? (isDark ? "#4ade80" : "#16a34a") : mutedColor }}
                onMouseEnter={(e) => { if (!copySuccess) e.currentTarget.style.color = textColor; }}
                onMouseLeave={(e) => { if (!copySuccess) e.currentTarget.style.color = mutedColor; }}
                title={copySuccess ? "Copied!" : "Copy link"}
              >
                {copySuccess ? (
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                ) : (
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                  </svg>
                )}
              </button>
            </div>
            {/* Open in new tab icon */}
            <button
              onClick={handleOpenOriginal}
              className="shrink-0 p-2 rounded-md transition-colors cursor-pointer"
              style={{ 
                color: mutedColor,
                border: `0.5px solid ${isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)"}`,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = textColor; e.currentTarget.style.backgroundColor = isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = mutedColor; e.currentTarget.style.backgroundColor = "transparent"; }}
              title="Open in new tab"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
              </svg>
            </button>
          </div>

          {/* Note (if present) */}
          {source.note && (
            <div 
              className="mb-5 text-sm italic"
              style={{ color: mutedColor }}
            >
              &ldquo;{source.note}&rdquo;
            </div>
          )}
          
        </div>
      </div>
    </div>
  );
}
