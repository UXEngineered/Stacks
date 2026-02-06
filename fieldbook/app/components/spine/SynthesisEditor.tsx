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

import { useState, useCallback, useRef, useEffect } from "react";
import type { SynthesisItem, SpineItem } from "./types";
import { DocumentEditor } from "../editor/DocumentEditor";
import type { FieldbookDocument } from "../../lib/blocks";
import { useTheme } from "../ThemeProvider";
import { ExportDropdown } from "../ExportDropdown";
import { RecalibrationIndicator, RecalibrationShimmer, LastRecalibratedInfo } from "../RecalibrationIndicator";
import { DiffHighlightBanner, useDiffHighlight } from "../DiffHighlightBanner";

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
  onSave: (synthesis: SynthesisItem) => void;
  onDiscard?: () => void;
  onDelete?: (id: string) => void;
  /** Called when user wants to navigate to a different item */
  onSelectItem?: (itemId: string) => void;
  /** Called when user accepts a diff (clears lastDiff) */
  onClearDiff?: (id: string) => void;
  /** Called when user makes a calibration decision */
  onRecordCalibrationDecision?: (params: RecordDecisionParams) => void;
}

export function SynthesisEditor({
  synthesis,
  isNew = false,
  allItems,
  preSelectedSources = [],
  onSave,
  onDiscard,
  onDelete,
  onSelectItem,
  onClearDiff,
  onRecordCalibrationDecision,
}: SynthesisEditorProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  
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

  // Scroll to top when switching between syntheses
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
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
      createdAt: synthesis?.createdAt || now,
      updatedAt: now,
    };

    originalTitle.current = title.trim();
    originalContent.current = serializedContent;
    originalDerivedFrom.current = derivedFrom;
    
    setIsDirty(false);
    onSave(savedSynthesis);
  }, [synthesis, title, content, derivedFrom, onSave]);

  const getStatusText = () => {
    if (isGenerating) return "Generating...";
    if (!hasGenerated) return "Not generated";
    if (isDirty) return "Unsaved changes";
    return "Saved";
  };

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
            className="text-[9px] font-medium tracking-widest uppercase"
            style={{ color: isDark ? "#525252" : "#a3a3a3" }}
          >
            Generate Synthesis
          </span>
          {onDiscard && (
            <button 
              onClick={onDiscard} 
              className="px-2.5 py-1 text-[11px] font-medium transition-colors"
              style={{ color: isDark ? "#737373" : "#737373" }}
            >
              Cancel
            </button>
          )}
        </div>

        {/* Generation UI */}
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto min-h-0">
          <div className="px-8 py-6 max-w-xl">
            {/* Sources */}
            <div className="mb-6">
              <div 
                className="text-[9px] font-medium tracking-widest uppercase mb-2"
                style={{ color: isDark ? "#525252" : "#a3a3a3" }}
              >
                Sources {derivedFrom.length > 0 && `(${derivedFrom.length} selected)`}
              </div>
              {availableSources.length === 0 ? (
                <p className="text-[11px] italic" style={{ color: isDark ? "#525252" : "#a3a3a3" }}>
                  Add sources first to synthesize
                </p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {availableSources.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => toggleDerivedFrom(item.id)}
                      className="px-2 py-1 text-[11px] transition-colors"
                      style={{
                        backgroundColor: derivedFrom.includes(item.id) 
                          ? (isDark ? "#404040" : "#262626")
                          : "transparent",
                        color: derivedFrom.includes(item.id)
                          ? "#ffffff"
                          : (isDark ? "#737373" : "#737373"),
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
              )}
            </div>

            {/* Generate */}
            <button
              onClick={handleGenerate}
              disabled={derivedFrom.length === 0 || isGenerating}
              className="px-4 py-2 text-[11px] font-medium transition-colors flex items-center gap-2"
              style={{
                backgroundColor: derivedFrom.length > 0 && !isGenerating 
                  ? (isDark ? "#404040" : "#171717")
                  : "transparent",
                color: derivedFrom.length > 0 && !isGenerating
                  ? "#ffffff"
                  : (isDark ? "#525252" : "#a3a3a3"),
                border: `1px solid ${derivedFrom.length > 0 && !isGenerating 
                  ? (isDark ? "#404040" : "#171717")
                  : (isDark ? "#333" : "#d4d4d4")}`,
                borderRadius: "0.125rem",
                cursor: derivedFrom.length > 0 && !isGenerating ? "pointer" : "not-allowed",
              }}
            >
              {isGenerating ? (
                <>
                  <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Synthesizing...
                </>
              ) : (
                <>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
                  </svg>
                  Synthesize
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show editor UI after generation
  const statusText = getStatusText();

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Minimal header bar */}
      <div 
        className="px-8 py-2.5 flex items-center justify-between shrink-0"
        style={{ borderBottom: `1px solid ${isDark ? "#262626" : "#e5e5e5"}` }}
      >
        <div className="flex items-center gap-2">
          <span 
            className="text-[9px] font-medium tracking-widest uppercase"
            style={{ color: isDark ? "#525252" : "#a3a3a3" }}
          >
            Synthesis
          </span>
          <span style={{ color: isDark ? "#333" : "#d4d4d4" }}>·</span>
          <span 
            className="text-[9px]"
            style={{ color: isDirty ? (isDark ? "#fbbf24" : "#d97706") : (isDark ? "#525252" : "#a3a3a3") }}
          >
            {statusText}
          </span>
          {synthesis?.recalcStatus && synthesis.recalcStatus !== "idle" && (
            <>
              <span style={{ color: isDark ? "#333" : "#d4d4d4" }}>·</span>
              <RecalibrationIndicator status={synthesis.recalcStatus} />
            </>
          )}
        </div>
        
        <div className="flex items-center gap-1">
          {!isNew && synthesis && (
            <ExportDropdown 
              title={title || "Untitled Synthesis"} 
              content={content}
              disabled={isNew}
            />
          )}
          {!isNew && onDelete && synthesis && (
            <button
              onClick={() => onDelete(synthesis.id)}
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
            {/* Title */}
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Untitled"
              className="w-full text-lg font-medium placeholder-neutral-500 border-none outline-none bg-transparent mb-4"
              style={{ color: isDark ? "#e5e5e5" : "#171717", letterSpacing: "-0.01em" }}
            />
            
            {/* Diff Highlight Banner - shows when content changed due to upstream */}
            {showDiffBanner && synthesis?.lastDiff && (
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
                className="mb-4"
              />
            )}

          {/* Sources - display only (not editable after generation) */}
          {derivedFrom.length > 0 && (
            <div className="mb-5">
              <div 
                className="text-[9px] font-medium tracking-widest uppercase mb-2"
                style={{ color: isDark ? "#525252" : "#a3a3a3" }}
              >
                Sources ({derivedFrom.length})
              </div>
              <div className="flex flex-wrap gap-1">
                {selectedSources.map((item) => (
                  <span
                    key={item.id}
                    className="px-2 py-0.5 text-[11px]"
                    style={{
                      backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)",
                      color: isDark ? "#737373" : "#737373",
                      borderRadius: "0.125rem",
                    }}
                  >
                    {item.title}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Editor */}
          <DocumentEditor
            key={synthesis?.id || "new"}
            initialContent={content}
            onChange={handleContentChange}
            placeholder="Edit synthesis..."
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
