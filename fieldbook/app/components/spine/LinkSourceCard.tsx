"use client";

/**
 * LinkSourceCard - Reference-style card for external link sources
 * 
 * This is NOT a document editor. Link sources are declared influences
 * (references), not analyzed content. The card shows:
 * - Editable title
 * - URL (always visible)
 * - "Open original" and "Copy link" actions
 * - Metadata (capturedAt)
 * - "Reference" badge indicating this is a declared influence
 */

import { useState, useCallback } from "react";
import type { SourceItem } from "./types";
import { useTheme } from "../ThemeProvider";

interface LinkSourceCardProps {
  source: SourceItem;
  onSave: (source: SourceItem) => void;
  onDelete?: (id: string) => void;
}

export function LinkSourceCard({ source, onSave, onDelete }: LinkSourceCardProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  
  const [title, setTitle] = useState(source.title);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  
  const borderColor = isDark ? "#404040" : "#e5e5e5";
  const cardBg = isDark ? "#1a1a1a" : "#fafafa";
  const textColor = isDark ? "#f5f5f5" : "#171717";
  const mutedColor = isDark ? "#a3a3a3" : "#737373";
  const linkColor = isDark ? "#60a5fa" : "#2563eb";
  
  const handleTitleSave = useCallback(() => {
    if (title.trim() !== source.title) {
      onSave({
        ...source,
        title: title.trim() || source.domain || "Untitled Link",
      });
    }
    setIsEditingTitle(false);
  }, [title, source, onSave]);
  
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
      {/* Header */}
      <div 
        className="px-8 py-2.5 flex items-center justify-between shrink-0"
        style={{ borderBottom: `1px solid ${borderColor}` }}
      >
        <div className="flex items-center gap-2">
          <span 
            className="text-[9px] font-medium tracking-widest uppercase"
            style={{ color: mutedColor }}
          >
            Source
          </span>
          <span style={{ color: isDark ? "#333" : "#d4d4d4" }}>·</span>
          <span 
            className="text-[9px] px-1.5 py-0.5 rounded font-medium"
            style={{ 
              backgroundColor: isDark ? "#1e3a5f" : "#dbeafe",
              color: isDark ? "#93c5fd" : "#1d4ed8",
            }}
          >
            Reference
          </span>
        </div>
        
        {onDelete && (
          <button
            onClick={() => onDelete(source.id)}
            className="px-2.5 py-1 text-[11px] font-medium transition-colors hover:text-red-500"
            style={{ color: mutedColor }}
          >
            Delete
          </button>
        )}
      </div>
      
      {/* Card content */}
      <div className="flex-1 overflow-y-auto p-8">
        <div 
          className="max-w-xl mx-auto rounded-lg p-6"
          style={{ 
            backgroundColor: cardBg,
            border: `1px solid ${borderColor}`,
          }}
        >
          {/* Title (editable) */}
          <div className="mb-4">
            {isEditingTitle ? (
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
                style={{ color: textColor }}
              />
            ) : (
              <h2 
                className="text-lg font-medium cursor-pointer hover:opacity-80"
                style={{ color: textColor }}
                onClick={() => setIsEditingTitle(true)}
                title="Click to edit title"
              >
                {source.title}
              </h2>
            )}
          </div>
          
          {/* URL display */}
          <div 
            className="mb-4 p-3 rounded text-sm font-mono break-all"
            style={{ 
              backgroundColor: isDark ? "#262626" : "#f5f5f5",
              color: linkColor,
            }}
          >
            {source.url}
          </div>
          
          {/* Note (if present) */}
          {source.note && (
            <div 
              className="mb-4 text-sm italic"
              style={{ color: mutedColor }}
            >
              "{source.note}"
            </div>
          )}
          
          {/* Actions */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={handleOpenOriginal}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded transition-colors"
              style={{
                backgroundColor: isDark ? "#2563eb" : "#2563eb",
                color: "#ffffff",
              }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
              </svg>
              Open original
            </button>
            <button
              onClick={handleCopyLink}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded transition-colors"
              style={{
                backgroundColor: "transparent",
                color: mutedColor,
                border: `1px solid ${borderColor}`,
              }}
            >
              {copySuccess ? (
                <>
                  <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                  Copied!
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                  </svg>
                  Copy link
                </>
              )}
            </button>
          </div>
          
          {/* Metadata */}
          <div 
            className="pt-4 text-xs space-y-1"
            style={{ 
              borderTop: `1px solid ${borderColor}`,
              color: mutedColor,
            }}
          >
            {source.domain && (
              <div className="flex items-center gap-2">
                <span className="font-medium">Domain:</span>
                <span>{source.domain}</span>
              </div>
            )}
            {capturedDate && (
              <div className="flex items-center gap-2">
                <span className="font-medium">Captured:</span>
                <span>{capturedDate}</span>
              </div>
            )}
          </div>
          
          {/* Honesty guardrail notice */}
          <div 
            className="mt-6 p-3 rounded text-xs"
            style={{ 
              backgroundColor: isDark ? "#1c1917" : "#fef3c7",
              color: isDark ? "#fbbf24" : "#92400e",
              border: `1px solid ${isDark ? "#422006" : "#fcd34d"}`,
            }}
          >
            <div className="flex items-start gap-2">
              <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>
                This is a <strong>declared reference</strong>, not analyzed content. 
                The system has not read, parsed, or summarized this URL.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
