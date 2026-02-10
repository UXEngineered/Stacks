"use client";

/**
 * SynthesisEditor - AI-assisted Synthesis generation and editing
 * 
 * Features:
 * - Select sources to synthesize from
 * - AI generates synthesis (faked for now)
 * - Full editing capability after generation
 * - Cannot be created from scratch - must be generated
 */

import { useState, useCallback, useRef, useEffect, useLayoutEffect } from "react";
import type { SynthesisItem, SourceItem, SpineItem } from "./types";
import { DocumentEditor } from "../editor/DocumentEditor";
import type { FieldbookDocument } from "../../lib/blocks";
import { useTheme } from "../ThemeProvider";
import { ExportDropdown } from "../ExportDropdown";
import { RecalibrationIndicator, RecalibrationShimmer, LastRecalibratedInfo } from "../RecalibrationIndicator";
import { DiffHighlightBanner, useDiffHighlight } from "../DiffHighlightBanner";
import { DraftSynthesisBanner } from "../DraftSynthesisBanner";
import { Button } from "../Button";
import { NodeTypeIcon } from "./SourcesPanel";

interface RecordDecisionParams {
  itemId: string;
  itemTitle: string;
  itemType: "synthesis" | "artifact";
  sourceId: string;
  sourceTitle: string;
  suggestion: string;
  decision: "ignored" | "changed";
  targetSection?: string;
}

interface SynthesisEditorProps {
  synthesis: SynthesisItem | null;
  isNew?: boolean;
  /** All items available for derivation linking */
  allItems: SpineItem[];
  /** Pre-selected source IDs (when triggered from source editor) */
  preSelectedSources?: string[];
  onSave?: (synthesis: SynthesisItem) => void;
  onDiscard?: () => void;
  onDelete?: (id: string) => void;
  /** Called when committing a draft synthesis */
  onCommitDraft?: (synthesis: SynthesisItem) => void;
  /** Called when user wants to navigate to a different item */
  onSelectItem?: (itemId: string) => void;
  /** Called when user accepts a diff (clears lastDiff) */
  onClearDiff?: (id: string) => void;
  /** Called when user makes a calibration decision */
  onRecordCalibrationDecision?: (params: RecordDecisionParams) => void;
  /** When true, disables all editing controls */
  readOnly?: boolean;
}

// ---------------------------------------------------------------------------
// SynthesisSourceChip: selectable source chip with hover icon preview
// ---------------------------------------------------------------------------
function SynthesisSourceChip({
  item,
  isSelected,
  onToggle,
  isDark,
}: {
  item: SpineItem;
  isSelected: boolean;
  onToggle: () => void;
  isDark: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const isLinkSource = item.type === "source" && (item as SourceItem).kind === "external_link";
  const purpleIcon = isDark ? "#a78bfa" : "#7c3aed";
  const textColor = isDark ? "#d4d4d4" : "#404040";
  const mutedIcon = "#737373";
  const borderColor = isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)";
  const hoverBg = isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)";

  return (
    <button
      onClick={onToggle}
      className="text-left px-2.5 py-1.5 rounded-md cursor-pointer inline-flex items-center gap-2"
      style={{
        backgroundColor: hovered ? hoverBg : "transparent",
        color: textColor,
        border: `0.5px solid ${borderColor}`,
        transition: "background-color 150ms ease",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <span className="shrink-0">
        <NodeTypeIcon
          type="source"
          className="w-3 h-3"
          color={(isSelected || hovered) ? purpleIcon : mutedIcon}
          isLink={isLinkSource}
        />
      </span>
      <span className="text-xs truncate">{item.title}</span>
      {isSelected && (
        <svg className="w-3 h-3 ml-auto shrink-0 opacity-60" fill="none" stroke={textColor} viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
      )}
    </button>
  );
}

export function SynthesisEditor({
  synthesis,
  isNew = false,
  allItems,
  preSelectedSources = [],
  onSave,
  onDiscard,
  onDelete,
  onCommitDraft,
  onSelectItem,
  onClearDiff,
  onRecordCalibrationDecision,
  readOnly = false,
}: SynthesisEditorProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  
  // Check if this is a draft synthesis (auto-generated, not yet committed)
  const isDraft = synthesis?.status === "draft";
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  // Diff highlight state (for showing change banners)
  const { shouldShow: showDiffBanner, dismiss: dismissDiffBanner } = useDiffHighlight(
    synthesis?.id,
    synthesis?.lastDiff
  );
  
  // Handle ignoring the diff (dismiss and record decision)
  const handleIgnoreDiff = useCallback(() => {
    // Record the decision before clearing
    if (synthesis?.id && synthesis?.lastDiff && onRecordCalibrationDecision) {
      onRecordCalibrationDecision({
        itemId: synthesis.id,
        itemTitle: synthesis.title || "Untitled Synthesis",
        itemType: "synthesis",
        sourceId: synthesis.lastDiff.triggeredBySourceId || "",
        sourceTitle: synthesis.lastDiff.triggeredBySourceTitle || "Unknown Source",
        suggestion: synthesis.lastDiff.aiSuggestion?.suggestedAction || synthesis.lastDiff.message || "",
        decision: "ignored",
        targetSection: synthesis.lastDiff.aiSuggestion?.targetSection,
      });
    }
    dismissDiffBanner();
    if (synthesis?.id && onClearDiff) {
      onClearDiff(synthesis.id);
    }
  }, [synthesis, onClearDiff, dismissDiffBanner, onRecordCalibrationDecision]);
  
  // Handle making a change (record decision and trigger regeneration)
  const handleMakeChange = useCallback(() => {
    // Record the decision
    if (synthesis?.id && synthesis?.lastDiff && onRecordCalibrationDecision) {
      onRecordCalibrationDecision({
        itemId: synthesis.id,
        itemTitle: synthesis.title || "Untitled Synthesis",
        itemType: "synthesis",
        sourceId: synthesis.lastDiff.triggeredBySourceId || "",
        sourceTitle: synthesis.lastDiff.triggeredBySourceTitle || "Unknown Source",
        suggestion: synthesis.lastDiff.aiSuggestion?.suggestedAction || synthesis.lastDiff.message || "",
        decision: "changed",
        targetSection: synthesis.lastDiff.aiSuggestion?.targetSection,
      });
    }
    dismissDiffBanner();
    if (synthesis?.id && onClearDiff) {
      onClearDiff(synthesis.id);
    }
    // TODO: Trigger AI regeneration here
    // For now, just dismiss and let the user edit manually
  }, [synthesis, onClearDiff, dismissDiffBanner, onRecordCalibrationDecision]);
  
  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(!isNew || !!synthesis?.content);
  const [justGenerated, setJustGenerated] = useState(false);
  
  // Synthesis state
  const [title, setTitle] = useState(synthesis?.title || "");
  const [content, setContent] = useState<FieldbookDocument>(() => getInitialContent(synthesis));
  const [derivedFrom, setDerivedFrom] = useState<string[]>(
    synthesis?.derivedFrom || preSelectedSources
  );
  
  const originalTitle = useRef(synthesis?.title || "");
  const originalContent = useRef(synthesis?.contentRendered || synthesis?.content || "");
  const originalDerivedFrom = useRef(synthesis?.derivedFrom || []);
  
  const [isDirty, setIsDirty] = useState(false);
  const contentRef = useRef<string>(synthesis?.contentRendered || synthesis?.content || "");

  // Scroll to top when switching between syntheses (before browser paints)
  useLayoutEffect(() => {
    if (scrollContainerRef.current) scrollContainerRef.current.scrollTop = 0;
  }, [synthesis?.id]);

  // Available items to derive from (sources and other syntheses)
  const availableSources = allItems.filter((item) => item.type === "source");
  
  // Get selected source items
  const selectedSources = availableSources.filter((item) => derivedFrom.includes(item.id));

  useEffect(() => {
    if (!hasGenerated) return;
    const titleChanged = title !== originalTitle.current;
    const contentChanged = contentRef.current !== originalContent.current;
    const derivedChanged = JSON.stringify(derivedFrom) !== JSON.stringify(originalDerivedFrom.current);
    setIsDirty(titleChanged || contentChanged || derivedChanged);
  }, [title, derivedFrom, hasGenerated]);

  const handleContentChange = useCallback((newContent: FieldbookDocument) => {
    setContent(newContent);
    const serialized = JSON.stringify(newContent);
    contentRef.current = serialized;
    setIsDirty(true);
  }, []);

  const toggleDerivedFrom = useCallback((itemId: string) => {
    setDerivedFrom((prev) => 
      prev.includes(itemId) 
        ? prev.filter((id) => id !== itemId)
        : [...prev, itemId]
    );
  }, []);

  // AI generation using OpenAI
  const handleGenerate = useCallback(async () => {
    if (derivedFrom.length === 0) return;
    
    setIsGenerating(true);
    
    try {
      // Prepare sources for the API
      const sourcesForApi = selectedSources.map((s) => ({
        title: s.title,
        content: s.content,
      }));
      
      // Call the AI generation API
      const response = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "synthesis",
          sources: sourcesForApi,
        }),
      });
      
      if (!response.ok) {
        let error: Record<string, unknown> = {};
        try {
          error = await response.json();
        } catch {
          // Response body might not be JSON
        }
        console.log("[Synthesis] AI API unavailable, using fallback generation");
        // Show user-friendly error if quota exceeded
        if (error.quota_exceeded) {
          alert("OpenAI API quota exceeded. Using fallback generation.");
        }
        // Fall back to fake generation on error
        const sourceTitles = selectedSources.map((s) => s.title);
        const fakeContent = generateFakeSynthesis(sourceTitles);
        setTitle(`Synthesis: ${sourceTitles.length} sources`);
        setContent(fakeContent);
        contentRef.current = JSON.stringify(fakeContent);
      } else {
        const result = await response.json();
        setTitle(result.title || `Synthesis: ${selectedSources.length} sources`);
        setContent(result.content);
        contentRef.current = JSON.stringify(result.content);
      }
      
      setJustGenerated(true);
      setHasGenerated(true);
      setIsDirty(true);
      // Clear the animation flag after animation completes
      setTimeout(() => setJustGenerated(false), 600);
    } catch {
      console.log("[Synthesis] AI generation unavailable, using fallback");
      // Fall back to fake generation on error
      const sourceTitles = selectedSources.map((s) => s.title);
      const fakeContent = generateFakeSynthesis(sourceTitles);
      setTitle(`Synthesis: ${sourceTitles.length} sources`);
      setContent(fakeContent);
      contentRef.current = JSON.stringify(fakeContent);
      setJustGenerated(true);
      setHasGenerated(true);
      setIsDirty(true);
      setTimeout(() => setJustGenerated(false), 600);
    } finally {
      setIsGenerating(false);
    }
  }, [derivedFrom, selectedSources]);

  const handleSave = useCallback(() => {
    if (!title.trim()) return;

    const now = new Date().toISOString();
    const serializedContent = JSON.stringify(content);
    
    const savedSynthesis: SynthesisItem = {
      id: synthesis?.id || `synthesis-${Date.now()}`,
      type: "synthesis",
      title: title.trim(),
      content: serializedContent,
      sourceCount: derivedFrom.length,
      derivedFrom,
      themes: synthesis?.themes,
      // When saving, always mark as committed (user has reviewed/saved)
      status: "committed",
      createdAt: synthesis?.createdAt || now,
      updatedAt: now,
    };

    originalTitle.current = title.trim();
    originalContent.current = serializedContent;
    originalDerivedFrom.current = derivedFrom;
    
    setIsDirty(false);
    onSave(savedSynthesis);
  }, [synthesis, title, content, derivedFrom, onSave]);

  // Handle committing a draft synthesis
  const handleCommitDraft = useCallback(() => {
    if (!synthesis) return;
    
    const now = new Date().toISOString();
    const serializedContent = JSON.stringify(content);
    
    const committedSynthesis: SynthesisItem = {
      id: synthesis.id,
      type: "synthesis",
      title: title.trim() || synthesis.title,
      content: serializedContent,
      sourceCount: derivedFrom.length,
      derivedFrom,
      themes: synthesis.themes,
      status: "committed",
      createdAt: synthesis.createdAt,
      updatedAt: now,
    };
    
    if (onCommitDraft) {
      onCommitDraft(committedSynthesis);
    } else if (onSave) {
      onSave(committedSynthesis);
    }
  }, [synthesis, title, content, derivedFrom, onCommitDraft, onSave]);

  // Handle discarding a draft synthesis
  const handleDiscardDraft = useCallback(() => {
    if (synthesis && onDelete) {
      onDelete(synthesis.id);
    }
  }, [synthesis, onDelete]);

  // Get source title for draft banner
  const getDraftSourceTitle = useCallback(() => {
    if (!synthesis?.derivedFrom || synthesis.derivedFrom.length === 0) return undefined;
    const sourceId = synthesis.derivedFrom[0];
    const source = allItems.find(item => item.id === sourceId);
    return source?.title;
  }, [synthesis?.derivedFrom, allItems]);

  const getStatus = () => {
    if (isGenerating) return { label: "Generating...", type: "saving" as const };
    if (!hasGenerated) return { label: "Not generated", type: "draft" as const };
    if (isDraft) return { label: "Review required", type: "draft" as const };
    return null;
  };

  // Cmd+S / Ctrl+S keyboard shortcut for manual save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        if (isDirty && title.trim()) handleSave();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isDirty, title, handleSave]);

  // Show generation UI for new syntheses
  if (isNew && !hasGenerated) {
    return (
      <div className="h-full flex flex-col overflow-hidden">
        {/* Minimal header */}
        <div 
          className="px-8 py-2.5 flex items-center justify-between shrink-0"
          style={{ borderBottom: `1px solid ${isDark ? "#262626" : "#e5e5e5"}` }}
        >
          <span 
            className="text-[10px] font-medium tracking-wider uppercase"
            style={{ color: isDark ? "#d4d4d4" : "#525252" }}
          >
            Generate Synthesis
          </span>
          {onDiscard && (
            <Button variant="secondary" onClick={onDiscard}>
              Discard
            </Button>
          )}
        </div>

        {/* Generation UI */}
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto min-h-0">
          <div className="px-8 py-6 max-w-xl">
            {/* Available Sources - grouped by type */}
            <div className="mb-6">
              <div 
                className="text-[10px] font-medium tracking-wider uppercase mb-2"
                style={{ color: isDark ? "#d4d4d4" : "#525252" }}
              >
                Derive from {derivedFrom.length > 0 && `(${derivedFrom.length} selected)`}
              </div>
              {availableSources.length === 0 ? (
                <p className="text-[11px] italic" style={{ color: isDark ? "#525252" : "#a3a3a3" }}>
                  Add sources first to synthesize
                </p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {availableSources.map((item) => (
                    <SynthesisSourceChip
                      key={item.id}
                      item={item}
                      isSelected={derivedFrom.includes(item.id)}
                      onToggle={() => toggleDerivedFrom(item.id)}
                      isDark={isDark}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Generate */}
            <Button
              variant="secondary"
              onClick={handleGenerate}
              disabled={derivedFrom.length === 0 || isGenerating}
            >
              {isGenerating ? "Synthesizing..." : "Synthesize"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Show editor UI after generation
  const status = getStatus();

  return (
    <div className="h-full flex flex-col overflow-hidden">
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
            Synthesis
          </span>
          {status && (
            <>
              <span style={{ color: isDark ? "#333" : "#d4d4d4" }}>·</span>
              <span 
                className="text-[9px] px-1.5 py-0.5 rounded-sm font-medium"
                style={{ 
                  backgroundColor: status.type === "draft"
                    ? (isDark ? "rgba(252, 211, 77, 0.15)" : "rgba(180, 83, 9, 0.1)")
                    : "transparent",
                  color: status.type === "saving"
                    ? (isDark ? "#22c55e" : "#16a34a")
                    : (isDark ? "#fcd34d" : "#b45309"),
                }}
              >
                {status.label}
              </span>
            </>
          )}
          {synthesis?.recalcStatus && synthesis.recalcStatus !== "idle" && (
            <>
              <span style={{ color: isDark ? "#333" : "#d4d4d4" }}>·</span>
              <RecalibrationIndicator status={synthesis.recalcStatus} />
            </>
          )}
        </div>
        
        {!readOnly && !isDraft && (
          <div className="flex items-center gap-1">
            {!isNew && synthesis && (
              <ExportDropdown 
                title={title || "Untitled Synthesis"} 
                content={content}
                disabled={isNew}
              />
            )}
            {!isNew && onDelete && synthesis && (
              <Button 
                variant="secondary" 
                onClick={() => onDelete(synthesis.id)}
              >
                Delete
              </Button>
            )}
            <div
              style={{
                maxWidth: isDirty && title.trim() ? "80px" : "0px",
                opacity: isDirty && title.trim() ? 1 : 0,
                transform: isDirty && title.trim() ? "translateX(0)" : "translateX(8px)",
                pointerEvents: isDirty && title.trim() ? "auto" : "none",
                overflow: "hidden",
                transition: "max-width 450ms cubic-bezier(0.16, 1, 0.3, 1), opacity 450ms cubic-bezier(0.16, 1, 0.3, 1), transform 450ms cubic-bezier(0.16, 1, 0.3, 1)",
              }}
            >
              <Button 
                variant="primary" 
                onClick={handleSave}
              >
                Save
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Continuous writing surface */}
      <RecalibrationShimmer status={synthesis?.recalcStatus}>
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto min-h-0">
          <div 
            className={`px-8 py-6 max-w-2xl ${justGenerated ? "animate-fade-in-up" : ""}`}
            style={justGenerated ? {
              animation: "fadeInUp 0.5s ease-out forwards",
            } : undefined}
          >
            {/* Inline keyframes for the animation */}
            {justGenerated && (
              <style>{`
                @keyframes fadeInUp {
                  from {
                    opacity: 0;
                    transform: translateY(12px);
                  }
                  to {
                    opacity: 1;
                    transform: translateY(0);
                  }
                }
              `}</style>
            )}
            {/* Title - wrapping */}
            <textarea
              value={title}
              onChange={(e) => { setTitle(e.target.value); e.target.style.height = "auto"; e.target.style.height = e.target.scrollHeight + "px"; }}
              placeholder="Untitled"
              rows={1}
              className="w-full text-lg font-medium placeholder-neutral-500 border-none outline-none bg-transparent mb-4 resize-none overflow-hidden"
              style={{ color: isDark ? "#e5e5e5" : "#171717", letterSpacing: "-0.01em" }}
              disabled={readOnly}
              ref={(el) => { if (el) { el.style.height = "auto"; el.style.height = el.scrollHeight + "px"; } }}
              onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }}
            />
            
            {/* Draft Synthesis Banner - shows for auto-generated drafts */}
            {isDraft && (
              <DraftSynthesisBanner
                sourceTitle={getDraftSourceTitle()}
                onCommit={handleCommitDraft}
                onDiscard={handleDiscardDraft}
              />
            )}
            
            {/* Diff Highlight Banner - shows when content changed due to upstream */}
            {showDiffBanner && synthesis?.lastDiff && !isDraft && (
              <DiffHighlightBanner 
                diff={synthesis.lastDiff}
                onAccept={handleIgnoreDiff}
                onRequestAIUpdate={handleMakeChange}
                sourceChangeSnippet={synthesis.lastDiff.sourceChangeSnippet}
                onNavigateToSource={onSelectItem}
              />
            )}
            
            {/* Last Recalibrated Info - shows timestamp and change summary */}
            {!showDiffBanner && synthesis?.lastRenderedAt && (
              <LastRecalibratedInfo 
                lastRenderedAt={synthesis.lastRenderedAt}
                lastDiff={synthesis.lastDiff}
              />
            )}

          {/* Sources - display only (not editable after generation) */}
          {derivedFrom.length > 0 && (
            <div className="mb-5">
              <div 
                className="text-[10px] font-medium tracking-wider uppercase mb-2"
                style={{ color: isDark ? "#d4d4d4" : "#525252" }}
              >
                Sources ({derivedFrom.length})
              </div>
              <div className="flex flex-wrap gap-1.5">
                {selectedSources.map((item) => {
                  const isLink = item.type === "source" && (item as SourceItem).kind === "external_link";
                  return (
                    <span
                      key={item.id}
                      className="inline-flex items-center gap-1.5 px-2 py-1 text-[11px] rounded-md"
                      style={{
                        color: isDark ? "#d4d4d4" : "#404040",
                        border: `0.5px solid ${isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)"}`,
                      }}
                    >
                      <NodeTypeIcon type="source" isLink={isLink} className="w-2.5 h-2.5" color={isDark ? "#737373" : "#737373"} />
                      {item.title}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* Editor */}
          <DocumentEditor
            key={synthesis?.id || "new"}
            initialContent={content}
            onChange={readOnly ? undefined : handleContentChange}
            placeholder="Edit synthesis..."
            readOnly={readOnly}
          />
          </div>
        </div>
      </RecalibrationShimmer>
    </div>
  );
}

function getInitialContent(synthesis: SynthesisItem | null): FieldbookDocument {
  // Use contentRendered (propagated content) or content field
  const contentStr = synthesis?.contentRendered || synthesis?.content;
  if (!contentStr) {
    return { type: "doc", content: [{ type: "paragraph", content: [] }] };
  }
  try {
    const parsed = JSON.parse(contentStr);
    if (parsed.type === "doc") return parsed;
  } catch {}
  return {
    type: "doc",
    content: contentStr.split("\n\n").map((para) => ({
      type: "paragraph" as const,
      content: para ? [{ type: "text" as const, text: para }] : [],
    })),
  };
}

/**
 * Generate fake AI synthesis content
 */
function generateFakeSynthesis(sourceTitles: string[]): FieldbookDocument {
  const sourceCount = sourceTitles.length;
  
  const text = (t: string) => ({ type: "text" as const, text: t });
  const bold = (t: string) => ({ type: "text" as const, text: t, marks: [{ type: "bold" }] });
  
  const para = (...content: { type: "text"; text: string; marks?: { type: string }[] }[]) => ({
    type: "paragraph" as const,
    content,
  });
  
  const h2 = (t: string) => ({
    type: "heading" as const,
    attrs: { level: 2 },
    content: [text(t)],
  });

  return {
    type: "doc",
    content: [
      h2("Key Themes"),
      para(text(`Synthesized from ${sourceCount} source${sourceCount !== 1 ? "s" : ""}:`)),
      para(text("• [Theme 1 - pattern observed across sources]")),
      para(text("• [Theme 2 - recurring insight or behavior]")),
      para(text("• [Theme 3 - notable finding]")),
      
      h2("Patterns"),
      para(text("[Description of patterns that emerged from the source material]")),
      para(text("[How these patterns relate to each other]")),
      
      h2("Tensions"),
      para(text("• [Contradiction or tension between findings]")),
      para(text("• [Unresolved question that needs further investigation]")),
      
      h2("Implications"),
      para(text("[What these findings suggest for the project]")),
      para(text("[Potential directions or decisions this synthesis points toward]")),
      
      h2("Open Questions"),
      para(text("• [Question that emerged from synthesis]")),
      para(text("• [Area that needs more research]")),
    ],
  };
}
