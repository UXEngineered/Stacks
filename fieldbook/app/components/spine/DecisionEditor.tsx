"use client";

/**
 * DecisionEditor - Editor-first Decision editing experience
 * 
 * Features:
 * - Inline editable title (becomes the decision statement)
 * - Confidence level selector
 * - Rich text editor for rationale
 * - Derivation linking
 * - Explicit save with dirty state tracking
 */

import { useState, useCallback, useRef, useEffect, useLayoutEffect } from "react";
import type { DecisionItem, SpineItem, ConfidenceLevel } from "./types";
import { DocumentEditor } from "../editor/DocumentEditor";
import type { FieldbookDocument } from "../../lib/blocks";
import { useTheme } from "../ThemeProvider";

interface DecisionEditorProps {
  decision: DecisionItem | null;
  isNew?: boolean;
  allItems: SpineItem[];
  onSave?: (decision: DecisionItem) => void;
  onDiscard?: () => void;
  onDelete?: (id: string) => void;
  /** When true, disables all editing controls */
  readOnly?: boolean;
}

export function DecisionEditor({
  decision,
  isNew = false,
  allItems,
  onSave,
  onDiscard,
  onDelete,
  readOnly = false,
}: DecisionEditorProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  
  const [title, setTitle] = useState(decision?.title || "");
  const [statement, setStatement] = useState(decision?.statement || "");
  const [confidence, setConfidence] = useState<ConfidenceLevel>(decision?.confidence || "medium");
  const [status, setStatus] = useState<DecisionItem["status"]>(decision?.status || "proposed");
  const [content, setContent] = useState<FieldbookDocument>(() => getInitialContent(decision));
  const [derivedFrom, setDerivedFrom] = useState<string[]>(decision?.derivedFrom || []);
  
  const originalTitle = useRef(decision?.title || "");
  const originalStatement = useRef(decision?.statement || "");
  const originalConfidence = useRef(decision?.confidence || "medium");
  const originalStatus = useRef(decision?.status || "proposed");
  const originalContent = useRef(decision?.content || "");
  const originalDerivedFrom = useRef(decision?.derivedFrom || []);
  
  const [isDirty, setIsDirty] = useState(isNew);
  const contentRef = useRef<string>(decision?.content || "");
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Scroll to top when switching between decisions (before browser paints)
  useLayoutEffect(() => {
    if (scrollContainerRef.current) scrollContainerRef.current.scrollTop = 0;
  }, [decision?.id]);

  // Can derive from sources, syntheses, and other decisions
  const availableItems = allItems.filter(
    (item) => item.type === "source" || item.type === "synthesis"
  );

  useEffect(() => {
    const titleChanged = title !== originalTitle.current;
    const statementChanged = statement !== originalStatement.current;
    const confidenceChanged = confidence !== originalConfidence.current;
    const statusChanged = status !== originalStatus.current;
    const contentChanged = contentRef.current !== originalContent.current;
    const derivedChanged = JSON.stringify(derivedFrom) !== JSON.stringify(originalDerivedFrom.current);
    setIsDirty(titleChanged || statementChanged || confidenceChanged || statusChanged || contentChanged || derivedChanged || isNew);
  }, [title, statement, confidence, status, derivedFrom, isNew]);

  const handleContentChange = useCallback((newContent: FieldbookDocument) => {
    setContent(newContent);
    const serialized = JSON.stringify(newContent);
    contentRef.current = serialized;
    setIsDirty(true);
  }, []);

  const toggleDerivedFrom = useCallback((itemId: string) => {
    setDerivedFrom((prev) => 
      prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]
    );
  }, []);

  const handleSave = useCallback(() => {
    if (!title.trim()) return;

    const now = new Date().toISOString();
    const serializedContent = JSON.stringify(content);
    
    const savedDecision: DecisionItem = {
      id: decision?.id || `decision-${Date.now()}`,
      type: "decision",
      title: title.trim(),
      statement: statement.trim() || title.trim(),
      content: serializedContent,
      confidence,
      status,
      derivedFrom,
      rationale: decision?.rationale,
      evidence: decision?.evidence,
      alternatives: decision?.alternatives,
      createdAt: decision?.createdAt || now,
      updatedAt: now,
    };

    originalTitle.current = title.trim();
    originalStatement.current = statement.trim() || title.trim();
    originalConfidence.current = confidence;
    originalStatus.current = status;
    originalContent.current = serializedContent;
    originalDerivedFrom.current = derivedFrom;
    
    setIsDirty(false);
    onSave(savedDecision);
  }, [decision, title, statement, confidence, status, content, derivedFrom, onSave]);

  const getStatusText = () => {
    if (isNew && !decision) return "Draft";
    if (isDirty) return "Unsaved changes";
    return "Saved";
  };

  const statusLabels: Record<DecisionItem["status"], string> = {
    proposed: "Proposed",
    accepted: "Accepted",
    rejected: "Rejected",
    revisiting: "Revisiting",
  };

  const statusText = getStatusText();

  return (
    <div className="h-full flex flex-col">
      {/* Minimal header bar */}
      <div 
        className="px-8 py-2.5 flex items-center justify-between shrink-0"
        style={{ borderBottom: `1px solid ${isDark ? "#262626" : "#e5e5e5"}` }}
      >
        <div className="flex items-center gap-2">
          <span 
            className="text-[10px] font-medium tracking-wider uppercase"
            style={{ color: isDark ? "#d4d4d4" : "#525252" }}
          >
            Decision
          </span>
          <span style={{ color: isDark ? "#333" : "#d4d4d4" }}>·</span>
          <span 
            className="text-[9px]"
            style={{ color: isDirty ? (isDark ? "#fbbf24" : "#d97706") : (isDark ? "#525252" : "#a3a3a3") }}
          >
            {statusText}
          </span>
        </div>
        
        {!readOnly && (
          <div className="flex items-center gap-1">
            {isNew && onDiscard && (
              <button
                onClick={onDiscard}
                className="px-2.5 py-1 text-[11px] font-medium transition-colors"
                style={{ color: isDark ? "#737373" : "#737373" }}
              >
                Discard
              </button>
            )}
            {!isNew && onDelete && decision && (
              <button
                onClick={() => onDelete(decision.id)}
                className="px-2.5 py-1 text-[11px] font-medium transition-colors hover:text-red-500"
                style={{ color: isDark ? "#737373" : "#737373" }}
              >
                Delete
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={!isDirty || !title.trim()}
              className="px-3 py-1 text-[11px] font-medium transition-colors"
              style={{
                backgroundColor: isDirty && title.trim() ? (isDark ? "#404040" : "#171717") : "transparent",
                color: isDirty && title.trim() ? "#ffffff" : (isDark ? "#525252" : "#a3a3a3"),
                cursor: isDirty && title.trim() ? "pointer" : "not-allowed",
                borderRadius: "0.125rem",
              }}
            >
              Save
            </button>
          </div>
        )}
      </div>

      {/* Continuous writing surface */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto">
        <div className="px-8 py-6 max-w-2xl">
          {/* Title - wrapping */}
          <textarea
            value={title}
            onChange={(e) => { setTitle(e.target.value); e.target.style.height = "auto"; e.target.style.height = e.target.scrollHeight + "px"; }}
            placeholder="Untitled decision"
            rows={1}
            className="w-full text-lg font-medium placeholder-neutral-500 border-none outline-none bg-transparent mb-3 resize-none overflow-hidden"
            style={{ color: isDark ? "#e5e5e5" : "#171717", letterSpacing: "-0.01em" }}
            autoFocus={isNew}
            disabled={readOnly}
            ref={(el) => { if (el) { el.style.height = "auto"; el.style.height = el.scrollHeight + "px"; } }}
            onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }}
          />

          {/* Decision statement - understated semantic marker */}
          <div 
            className="mb-5 pl-3"
            style={{ borderLeft: `2px solid ${isDark ? "#d97706" : "#fbbf24"}` }}
          >
            <div 
              className="text-[10px] font-medium tracking-wider uppercase mb-1"
              style={{ color: isDark ? "#d97706" : "#d97706" }}
            >
              Statement
            </div>
            <textarea
              value={statement}
              onChange={(e) => setStatement(e.target.value)}
              placeholder="We will..."
              rows={2}
              className="w-full text-sm placeholder-neutral-500 border-none outline-none bg-transparent resize-none"
              style={{ color: isDark ? "#d4d4d4" : "#404040" }}
            />
          </div>

          {/* Confidence & Status - compact inline */}
          <div className="flex gap-6 mb-5">
            <div>
              <div 
                className="text-[10px] font-medium tracking-wider uppercase mb-1.5"
                style={{ color: isDark ? "#d4d4d4" : "#525252" }}
              >
                Confidence
              </div>
              <div className="flex gap-1">
                {(["low", "medium", "high"] as const).map((level) => (
                  <button
                    key={level}
                    onClick={readOnly ? undefined : () => setConfidence(level)}
                    disabled={readOnly}
                    className="px-2 py-0.5 text-[11px] font-medium transition-colors"
                    style={{
                      backgroundColor: confidence === level 
                        ? (level === "high" ? "#10b981" : level === "low" ? "#ef4444" : "#f59e0b")
                        : "transparent",
                      color: confidence === level 
                        ? "#ffffff"
                        : (isDark ? "#737373" : "#737373"),
                      border: `1px solid ${confidence === level 
                        ? (level === "high" ? "#10b981" : level === "low" ? "#ef4444" : "#f59e0b")
                        : (isDark ? "#333" : "#d4d4d4")}`,
                      borderRadius: "0.125rem",
                      cursor: readOnly ? "default" : "pointer",
                      opacity: readOnly && confidence !== level ? 0.5 : 1,
                    }}
                  >
                    {level.charAt(0).toUpperCase() + level.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div 
                className="text-[10px] font-medium tracking-wider uppercase mb-1.5"
                style={{ color: isDark ? "#d4d4d4" : "#525252" }}
              >
                Status
              </div>
              <div className="flex gap-1">
                {(["proposed", "accepted", "rejected", "revisiting"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={readOnly ? undefined : () => setStatus(s)}
                    disabled={readOnly}
                    className="px-2 py-0.5 text-[11px] font-medium transition-colors"
                    style={{
                      backgroundColor: status === s ? (isDark ? "#404040" : "#262626") : "transparent",
                      color: status === s ? "#ffffff" : (isDark ? "#737373" : "#737373"),
                      border: `1px solid ${status === s ? (isDark ? "#404040" : "#262626") : (isDark ? "#333" : "#d4d4d4")}`,
                      borderRadius: "0.125rem",
                      cursor: readOnly ? "default" : "pointer",
                      opacity: readOnly && status !== s ? 0.5 : 1,
                    }}
                  >
                    {statusLabels[s]}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Evidence sources - minimal (hidden in read-only mode since can't edit) */}
          {availableItems.length > 0 && !readOnly && (
            <div className="mb-5">
              <div 
                className="text-[10px] font-medium tracking-wider uppercase mb-2"
                style={{ color: isDark ? "#d4d4d4" : "#525252" }}
              >
                Evidence {derivedFrom.length > 0 && `(${derivedFrom.length})`}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {availableItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => toggleDerivedFrom(item.id)}
                    className="px-2 py-0.5 text-[11px] transition-colors"
                    style={{
                      backgroundColor: derivedFrom.includes(item.id) 
                        ? (isDark ? "#404040" : "#262626")
                        : "transparent",
                      color: derivedFrom.includes(item.id) ? "#ffffff" : (isDark ? "#737373" : "#737373"),
                      border: `1px solid ${derivedFrom.includes(item.id) 
                        ? (isDark ? "#404040" : "#262626")
                        : (isDark ? "#333" : "#d4d4d4")}`,
                      borderRadius: "0.125rem",
                    }}
                  >
                    {item.title}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Rationale - section label */}
          <div 
            className="text-[10px] font-medium tracking-wider uppercase mb-2"
            style={{ color: isDark ? "#d4d4d4" : "#525252" }}
          >
            Rationale
          </div>
          <DocumentEditor
            key={decision?.id || "new"}
            initialContent={content}
            onChange={readOnly ? undefined : handleContentChange}
            placeholder="Document reasoning, evidence, alternatives..."
            readOnly={readOnly}
          />
        </div>
      </div>
    </div>
  );
}

function getInitialContent(decision: DecisionItem | null): FieldbookDocument {
  if (!decision?.content) {
    return { type: "doc", content: [{ type: "paragraph", content: [] }] };
  }
  try {
    const parsed = JSON.parse(decision.content);
    if (parsed.type === "doc") return parsed;
  } catch {}
  return {
    type: "doc",
    content: decision.content.split("\n\n").map((para) => ({
      type: "paragraph" as const,
      content: para ? [{ type: "text" as const, text: para }] : [],
    })),
  };
}
