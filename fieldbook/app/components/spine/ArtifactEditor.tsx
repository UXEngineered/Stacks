"use client";

/**
 * ArtifactEditor - AI-assisted Artifact generation and editing
 * 
 * Features:
 * - Select sources to derive from
 * - Enter a prompt to guide generation
 * - AI generates the artifact (faked for now)
 * - Full editing capability after generation
 * - Version tracking
 */

import { useState, useCallback, useRef, useEffect } from "react";
import type { ArtifactItem, SpineItem } from "./types";
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

interface ArtifactEditorProps {
  artifact: ArtifactItem | null;
  isNew?: boolean;
  allItems: SpineItem[];
  onSave?: (artifact: ArtifactItem) => void;
  onDiscard?: () => void;
  onDelete?: (id: string) => void;
  /** Called when user wants to navigate to a different item */
  onSelectItem?: (itemId: string) => void;
  /** Called when user accepts a diff (clears lastDiff) */
  onClearDiff?: (id: string) => void;
  /** Called when user makes a calibration decision */
  onRecordCalibrationDecision?: (params: RecordDecisionParams) => void;
  /** When true, disables all editing controls */
  readOnly?: boolean;
}

const ARTIFACT_TYPES = [
  { value: "decision-brief", label: "Decision Brief" },
  { value: "opportunity-map", label: "Opportunity Map" },
  { value: "design-rationale", label: "Design Rationale" },
  { value: "research-warrant", label: "Research Warrant" },
  { value: "alignment-map", label: "Alignment Map" },
  { value: "evidence-inventory", label: "Evidence Inventory" },
  { value: "transition-playbook", label: "Playbook" },
];

export function ArtifactEditor({
  artifact,
  isNew = false,
  allItems,
  onSave,
  onDiscard,
  onDelete,
  onSelectItem,
  onClearDiff,
  onRecordCalibrationDecision,
  readOnly = false,
}: ArtifactEditorProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  // Diff highlight state (for showing change banners)
  const { shouldShow: showDiffBanner, dismiss: dismissDiffBanner } = useDiffHighlight(
    artifact?.id,
    artifact?.lastDiff
  );
  
  // Handle ignoring the diff (dismiss and record decision)
  const handleIgnoreDiff = useCallback(() => {
    // Record the decision before clearing
    if (artifact?.id && artifact?.lastDiff && onRecordCalibrationDecision) {
      onRecordCalibrationDecision({
        itemId: artifact.id,
        itemTitle: artifact.title || "Untitled Artifact",
        itemType: "artifact",
        sourceId: artifact.lastDiff.triggeredBySourceId || "",
        sourceTitle: artifact.lastDiff.triggeredBySourceTitle || "Unknown Source",
        suggestion: artifact.lastDiff.aiSuggestion?.suggestedAction || artifact.lastDiff.message || "",
        decision: "ignored",
        targetSection: artifact.lastDiff.aiSuggestion?.targetSection,
      });
    }
    dismissDiffBanner();
    if (artifact?.id && onClearDiff) {
      onClearDiff(artifact.id);
    }
  }, [artifact, onClearDiff, dismissDiffBanner, onRecordCalibrationDecision]);
  
  // Handle making a change (record decision and trigger regeneration)
  const handleMakeChange = useCallback(() => {
    // Record the decision
    if (artifact?.id && artifact?.lastDiff && onRecordCalibrationDecision) {
      onRecordCalibrationDecision({
        itemId: artifact.id,
        itemTitle: artifact.title || "Untitled Artifact",
        itemType: "artifact",
        sourceId: artifact.lastDiff.triggeredBySourceId || "",
        sourceTitle: artifact.lastDiff.triggeredBySourceTitle || "Unknown Source",
        suggestion: artifact.lastDiff.aiSuggestion?.suggestedAction || artifact.lastDiff.message || "",
        decision: "changed",
        targetSection: artifact.lastDiff.aiSuggestion?.targetSection,
      });
    }
    dismissDiffBanner();
    if (artifact?.id && onClearDiff) {
      onClearDiff(artifact.id);
    }
    // TODO: Trigger AI regeneration here
    // For now, just dismiss and let the user edit manually
  }, [artifact, onClearDiff, dismissDiffBanner, onRecordCalibrationDecision]);
  
  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(!isNew || !!artifact?.content);
  const [justGenerated, setJustGenerated] = useState(false);
  const [prompt, setPrompt] = useState("");
  
  // Artifact state
  const [title, setTitle] = useState(artifact?.title || "");
  const [artifactType, setArtifactType] = useState(artifact?.artifactType || "decision-brief");
  const [status, setStatus] = useState<ArtifactItem["status"]>(artifact?.status || "draft");
  const [content, setContent] = useState<FieldbookDocument>(() => getInitialContent(artifact));
  const [derivedFrom, setDerivedFrom] = useState<string[]>(artifact?.derivedFrom || []);
  
  const originalTitle = useRef(artifact?.title || "");
  const originalArtifactType = useRef(artifact?.artifactType || "decision-brief");
  const originalStatus = useRef(artifact?.status || "draft");
  const originalContent = useRef(artifact?.contentRendered || artifact?.content || "");
  const originalDerivedFrom = useRef(artifact?.derivedFrom || []);
  
  const [isDirty, setIsDirty] = useState(false);
  const contentRef = useRef<string>(artifact?.contentRendered || artifact?.content || "");

  // Scroll to top when switching between artifacts
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [artifact?.id]);

  // Can derive from any item type
  const availableItems = allItems.filter(
    (item) => item.type === "source" || item.type === "synthesis" || item.type === "decision"
  );
  
  // Get selected source items
  const selectedSources = availableItems.filter((item) => derivedFrom.includes(item.id));

  useEffect(() => {
    if (!hasGenerated) return;
    const titleChanged = title !== originalTitle.current;
    const typeChanged = artifactType !== originalArtifactType.current;
    const statusChanged = status !== originalStatus.current;
    const contentChanged = contentRef.current !== originalContent.current;
    const derivedChanged = JSON.stringify(derivedFrom) !== JSON.stringify(originalDerivedFrom.current);
    setIsDirty(titleChanged || typeChanged || statusChanged || contentChanged || derivedChanged);
  }, [title, artifactType, status, derivedFrom, hasGenerated]);

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

  // AI generation using OpenAI
  const handleGenerate = useCallback(async () => {
    setIsGenerating(true);
    
    const typeLabel = ARTIFACT_TYPES.find((t) => t.value === artifactType)?.label || "Document";
    
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
          type: "artifact",
          artifactType,
          sources: sourcesForApi,
          prompt: prompt || undefined,
        }),
      });
      
      if (!response.ok) {
        let error: Record<string, unknown> = {};
        try {
          error = await response.json();
        } catch {
          // Response body might not be JSON
        }
        console.log("[Artifact] AI API unavailable, using fallback generation");
        // Show user-friendly error if quota exceeded
        if (error.quota_exceeded) {
          alert("OpenAI API quota exceeded. Using fallback generation.");
        }
        // Fall back to fake generation
        const sourceTitles = selectedSources.map((s) => s.title);
        const fakeContent = generateFakeContent(prompt, sourceTitles, typeLabel);
        const generatedTitle = prompt 
          ? prompt.split(" ").slice(0, 5).join(" ") + (prompt.split(" ").length > 5 ? "..." : "")
          : typeLabel;
        setTitle(generatedTitle);
        setContent(fakeContent);
        contentRef.current = JSON.stringify(fakeContent);
      } else {
        const result = await response.json();
        setTitle(result.title || typeLabel);
        setContent(result.content);
        contentRef.current = JSON.stringify(result.content);
      }
      
      setJustGenerated(true);
      setHasGenerated(true);
      setIsDirty(true);
      // Clear the animation flag after animation completes
      setTimeout(() => setJustGenerated(false), 600);
    } catch {
      console.log("[Artifact] AI generation unavailable, using fallback");
      // Fall back to fake generation
      const sourceTitles = selectedSources.map((s) => s.title);
      const fakeContent = generateFakeContent(prompt, sourceTitles, typeLabel);
      const generatedTitle = prompt 
        ? prompt.split(" ").slice(0, 5).join(" ") + (prompt.split(" ").length > 5 ? "..." : "")
        : typeLabel;
      setTitle(generatedTitle);
      setContent(fakeContent);
      contentRef.current = JSON.stringify(fakeContent);
      setJustGenerated(true);
      setHasGenerated(true);
      setIsDirty(true);
      setTimeout(() => setJustGenerated(false), 600);
    } finally {
      setIsGenerating(false);
    }
  }, [selectedSources, artifactType, prompt]);

  const handleSave = useCallback(() => {
    if (!title.trim()) return;

    const now = new Date().toISOString();
    const serializedContent = JSON.stringify(content);
    
    const savedArtifact: ArtifactItem = {
      id: artifact?.id || `artifact-${Date.now()}`,
      type: "artifact",
      title: title.trim(),
      content: serializedContent,
      artifactType,
      status,
      version: (artifact?.version || 0) + 1,
      derivedFrom,
      createdAt: artifact?.createdAt || now,
      updatedAt: now,
    };

    originalTitle.current = title.trim();
    originalArtifactType.current = artifactType;
    originalStatus.current = status;
    originalContent.current = serializedContent;
    originalDerivedFrom.current = derivedFrom;
    
    setIsDirty(false);
    onSave(savedArtifact);
  }, [artifact, title, artifactType, status, content, derivedFrom, onSave]);

  const getStatusText = () => {
    if (isGenerating) return "Generating...";
    if (!hasGenerated) return "Not generated";
    if (isDirty) return "Unsaved changes";
    return "Saved";
  };

  // Show generation UI for new artifacts
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
            Generate Artifact
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

        {/* Generation UI - focused, minimal */}
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto min-h-0">
          <div className="px-8 py-6 max-w-xl">
            {/* Sources - only show if there are sources */}
            {availableItems.length > 0 && (
              <div className="mb-6">
                <div 
                  className="text-[9px] font-medium tracking-widest uppercase mb-2"
                  style={{ color: isDark ? "#525252" : "#a3a3a3" }}
                >
                  Sources
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {availableItems.map((item) => (
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
                      <span className="opacity-60 mr-1 text-[9px]">
                        {item.type === "source" ? "SRC" : item.type === "synthesis" ? "SYN" : "DEC"}
                      </span>
                      {item.title}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Artifact Type */}
            <div className="mb-6">
              <div 
                className="text-[9px] font-medium tracking-widest uppercase mb-2"
                style={{ color: isDark ? "#525252" : "#a3a3a3" }}
              >
                Sparq Artifact Type
              </div>
              <div className="flex flex-wrap gap-1.5">
                {ARTIFACT_TYPES.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setArtifactType(t.value)}
                    className="px-2.5 py-1 text-[11px] font-medium transition-colors"
                    style={{
                      backgroundColor: artifactType === t.value 
                        ? (isDark ? "#404040" : "#262626")
                        : "transparent",
                      color: artifactType === t.value
                        ? "#ffffff"
                        : (isDark ? "#737373" : "#737373"),
                      border: `1px solid ${artifactType === t.value 
                        ? (isDark ? "#404040" : "#262626")
                        : (isDark ? "#333" : "#d4d4d4")}`,
                      borderRadius: "0.125rem",
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Instructions */}
            <div className="mb-6">
              <div 
                className="text-[9px] font-medium tracking-widest uppercase mb-2"
                style={{ color: isDark ? "#525252" : "#a3a3a3" }}
              >
                Instructions
              </div>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe what to generate..."
                className="w-full h-24 p-3 text-sm border focus:outline-none resize-none"
                style={{ 
                  color: isDark ? "#d4d4d4" : "#404040", 
                  backgroundColor: "transparent",
                  borderColor: isDark ? "#333" : "#d4d4d4",
                  borderRadius: "0.125rem",
                }}
              />
            </div>

            {/* Generate */}
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="px-4 py-2 text-[11px] font-medium transition-colors"
              style={{
                backgroundColor: !isGenerating 
                  ? (isDark ? "#404040" : "#171717")
                  : "transparent",
                color: !isGenerating
                  ? "#ffffff"
                  : (isDark ? "#525252" : "#a3a3a3"),
                border: `1px solid ${!isGenerating 
                  ? (isDark ? "#404040" : "#171717")
                  : (isDark ? "#333" : "#d4d4d4")}`,
                borderRadius: "0.125rem",
                cursor: !isGenerating ? "pointer" : "not-allowed",
              }}
            >
              {isGenerating ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Generating...
                </span>
              ) : (
                `Generate ${ARTIFACT_TYPES.find((t) => t.value === artifactType)?.label || "Artifact"}`
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
            Artifact
          </span>
          <span style={{ color: isDark ? "#333" : "#d4d4d4" }}>·</span>
          <span 
            className="text-[9px]"
            style={{ color: isDirty ? (isDark ? "#fbbf24" : "#d97706") : (isDark ? "#525252" : "#a3a3a3") }}
          >
            {statusText}
          </span>
          {artifact?.version && artifact.version > 0 && (
            <>
              <span style={{ color: isDark ? "#333" : "#d4d4d4" }}>·</span>
              <span className="text-[9px]" style={{ color: isDark ? "#525252" : "#a3a3a3" }}>
                v{artifact.version}
              </span>
            </>
          )}
          {artifact?.recalcStatus && artifact.recalcStatus !== "idle" && (
            <>
              <span style={{ color: isDark ? "#333" : "#d4d4d4" }}>·</span>
              <RecalibrationIndicator status={artifact.recalcStatus} />
            </>
          )}
        </div>
        
        {!readOnly && (
          <div className="flex items-center gap-1">
            {!isNew && artifact && (
              <ExportDropdown 
                title={title || "Untitled Artifact"} 
                content={content}
                disabled={isNew}
              />
            )}
            {!isNew && onDelete && artifact && (
              <button
                onClick={() => onDelete(artifact.id)}
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
      <RecalibrationShimmer status={artifact?.recalcStatus}>
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
              disabled={readOnly}
            />
            
            {/* Diff Highlight Banner - shows when content changed due to upstream */}
            {showDiffBanner && artifact?.lastDiff && (
              <DiffHighlightBanner 
                diff={artifact.lastDiff}
                onAccept={handleIgnoreDiff}
                onRequestAIUpdate={handleMakeChange}
                sourceChangeSnippet={artifact.lastDiff.sourceChangeSnippet}
                onNavigateToSource={onSelectItem}
              />
            )}
            
            {/* Last Recalibrated Info - shows timestamp and change summary */}
            {!showDiffBanner && artifact?.lastRenderedAt && (
              <LastRecalibratedInfo 
                lastRenderedAt={artifact.lastRenderedAt}
                lastDiff={artifact.lastDiff}
                className="mb-4"
              />
            )}

            {/* Status - editable */}
            <div className="mb-4">
              <div 
                className="text-[9px] font-medium tracking-widest uppercase mb-1.5"
                style={{ color: isDark ? "#525252" : "#a3a3a3" }}
              >
                Status
              </div>
              <div className="flex gap-1">
                {(["draft", "review", "final"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatus(s)}
                    className="px-2 py-0.5 text-[11px] font-medium transition-colors"
                    style={{
                      backgroundColor: status === s 
                        ? (s === "final" ? "#10b981" : s === "review" ? "#3b82f6" : (isDark ? "#404040" : "#262626"))
                        : "transparent",
                      color: status === s 
                        ? "#ffffff"
                        : (isDark ? "#737373" : "#737373"),
                      border: `1px solid ${status === s 
                        ? (s === "final" ? "#10b981" : s === "review" ? "#3b82f6" : (isDark ? "#404040" : "#262626"))
                        : (isDark ? "#333" : "#d4d4d4")}`,
                      borderRadius: "0.125rem",
                    }}
                  >
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Type - read-only for saved artifacts */}
            <div className="mb-4">
              <div 
                className="text-[9px] font-medium tracking-widest uppercase mb-1.5"
                style={{ color: isDark ? "#525252" : "#a3a3a3" }}
              >
                Type
              </div>
              <span 
                className="text-[11px]"
                style={{ color: isDark ? "#a3a3a3" : "#525252" }}
              >
                {ARTIFACT_TYPES.find((t) => t.value === artifactType)?.label || artifactType}
              </span>
            </div>

          {/* Sources - read-only */}
          {derivedFrom.length > 0 && (
            <div className="mb-4">
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
            key={artifact?.id || "new"}
            initialContent={content}
            onChange={readOnly ? undefined : handleContentChange}
            placeholder="Edit content..."
            readOnly={readOnly}
          />
          </div>
        </div>
      </RecalibrationShimmer>
    </div>
  );
}

function getInitialContent(artifact: ArtifactItem | null): FieldbookDocument {
  // Use contentRendered (propagated content) or content field
  const contentStr = artifact?.contentRendered || artifact?.content;
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
 * Generate fake AI content based on prompt and sources
 * Each artifact type has its own structured output format
 */
function generateFakeContent(
  prompt: string,
  sourceTitles: string[],
  artifactType: string
): FieldbookDocument {
  const sourceCount = sourceTitles.length;
  
  // Helper to create text node
  const text = (t: string) => ({ type: "text" as const, text: t });
  const bold = (t: string) => ({ type: "text" as const, text: t, marks: [{ type: "bold" }] });
  
  // Helper to create paragraph
  const para = (...content: { type: "text"; text: string; marks?: { type: string }[] }[]) => ({
    type: "paragraph" as const,
    content,
  });
  
  // Helper to create heading
  const h2 = (t: string) => ({
    type: "heading" as const,
    attrs: { level: 2 },
    content: [text(t)],
  });
  
  const h3 = (t: string) => ({
    type: "heading" as const,
    attrs: { level: 3 },
    content: [text(t)],
  });

  switch (artifactType) {
    case "decision-brief":
      return {
        type: "doc",
        content: [
          h2("Recommendation"),
          para(text("[One sentence recommendation that takes a clear stance]")),
          
          h2("Confidence"),
          para(bold("Level: "), text("Medium")),
          para(text("Based on "), bold(`${sourceCount} sources`), text(". Confidence limited by [specific gap].")),
          
          h2("Key Evidence"),
          para(text("• [Evidence point 1 - linked to source]")),
          para(text("• [Evidence point 2 - linked to source]")),
          para(text("• [Evidence point 3 - linked to source]")),
          
          h2("To Increase Confidence"),
          para(text("• [What additional research would strengthen this]")),
          para(text("• [What data we're missing]")),
          
          h2("Dissenting Signals"),
          para(text("• [Evidence that argues against this recommendation]")),
          para(text("• [Alternative interpretation of the data]")),
        ],
      };

    case "opportunity-map":
      return {
        type: "doc",
        content: [
          h2("Problem Space"),
          para(text("[High-level framing of the problem domain]")),
          
          h2("Prioritized Opportunities"),
          
          h3("1. [Opportunity Name]"),
          para(bold("Evidence density: "), text("High ("), bold(`${sourceCount} sources`), text(")")),
          para(bold("Strategic fit: "), text("Strong")),
          para(bold("Effort: "), text("Medium")),
          para(text("[Brief description of the opportunity]")),
          
          h3("2. [Opportunity Name]"),
          para(bold("Evidence density: "), text("Medium")),
          para(bold("Strategic fit: "), text("Strong")),
          para(bold("Effort: "), text("Low")),
          para(text("[Brief description]")),
          
          h3("3. [Opportunity Name]"),
          para(bold("Evidence density: "), text("Low")),
          para(bold("Strategic fit: "), text("Medium")),
          para(bold("Effort: "), text("High")),
          para(text("[Brief description]")),
          
          h2("Not Pursuing"),
          para(text("• [Opportunity explicitly deprioritized] — [rationale]")),
          para(text("• [Another deprioritized opportunity] — [rationale]")),
          
          h2("Recommended Sequence"),
          para(text("Start with #1, validate with [method], then proceed to #2.")),
        ],
      };

    case "design-rationale":
      return {
        type: "doc",
        content: [
          h2("Decision"),
          para(text("[Clear statement of what was decided]")),
          
          h2("Options Considered"),
          
          h3("Option A: [Name]"),
          para(bold("Pros: "), text("[Based on user research]")),
          para(bold("Cons: "), text("[Based on technical constraints]")),
          
          h3("Option B: [Name]"),
          para(bold("Pros: "), text("[Based on stakeholder input]")),
          para(bold("Cons: "), text("[Based on user research]")),
          
          h3("Option C: [Name] — Selected"),
          para(bold("Pros: "), text("[Balances user needs and constraints]")),
          para(bold("Cons: "), text("[Acknowledged tradeoffs]")),
          
          h2("Reasoning"),
          para(text(`Selected Option C because [explicit reasoning based on ${sourceCount} sources].`)),
          
          h2("Conditions for Revisiting"),
          para(text("• If [condition], reconsider Option A")),
          para(text("• If [condition], this decision may no longer hold")),
          
          h2("Open Questions"),
          para(text("• [What we still need to validate]")),
          para(text("• [Assumption to test]")),
        ],
      };

    case "research-warrant":
      return {
        type: "doc",
        content: [
          h2("Business Question"),
          para(text("[The decision this research will inform]")),
          
          h2("Stakes"),
          para(text("If we don't answer this: [specific consequence]")),
          para(text("Current cost of not knowing: [quantified if possible]")),
          
          h2("Why Existing Data Is Insufficient"),
          para(text(`We have ${sourceCount} existing sources, but:`)),
          para(text("• [Gap 1 - what's missing]")),
          para(text("• [Gap 2 - what's outdated]")),
          para(text("• [Gap 3 - what's unvalidated]")),
          
          h2("Proposed Approach"),
          para(text("[High-level method - not a detailed plan]")),
          para(text("Participants: [who]")),
          para(text("Timeline: [duration]")),
          
          h2("Success Criteria"),
          para(text("This research succeeds if we can:")),
          para(text("• [Specific outcome 1]")),
          para(text("• [Specific outcome 2]")),
          
          h2("Resource Ask"),
          para(text("[Time/budget/access needed]")),
        ],
      };

    case "alignment-map":
      return {
        type: "doc",
        content: [
          h2("Decision"),
          para(text("[The initiative or decision requiring alignment]")),
          
          h2("Key Players"),
          
          h3("[Stakeholder 1]"),
          para(bold("Stated position: "), text("[What they say]")),
          para(bold("Unstated concern: "), text("[What they worry about]")),
          para(bold("Influence: "), text("High")),
          
          h3("[Stakeholder 2]"),
          para(bold("Stated position: "), text("[What they say]")),
          para(bold("Unstated concern: "), text("[What they worry about]")),
          para(bold("Influence: "), text("Medium")),
          
          h3("[Stakeholder 3]"),
          para(bold("Stated position: "), text("[What they say]")),
          para(bold("Unstated concern: "), text("[What they worry about]")),
          para(bold("Influence: "), text("Veto power")),
          
          h2("Known Conflicts"),
          para(text("• [Stakeholder 1] vs [Stakeholder 2] on [issue]")),
          para(text("• [Stakeholder 2] vs [Stakeholder 3] on [issue]")),
          
          h2("Alignment Sequence"),
          para(text("1. Secure [Stakeholder 3] first — they have veto")),
          para(text("2. Then [Stakeholder 1] — their support influences others")),
          para(text("3. Finally [Stakeholder 2] — will follow if others aligned")),
          
          h2("Risks"),
          para(text("If alignment fails: [consequence]")),
        ],
      };

    case "evidence-inventory":
      return {
        type: "doc",
        content: [
          h2("Inventory Summary"),
          para(bold(`${sourceCount} sources`), text(" reviewed. Key gaps identified below.")),
          
          h2("Claims & Evidence"),
          
          h3("[Claim 1]"),
          para(bold("Evidence: "), text("[Source names]")),
          para(bold("Confidence: "), text("High")),
          para(bold("Last validated: "), text("[Date]")),
          para(bold("Contradictions: "), text("None")),
          
          h3("[Claim 2]"),
          para(bold("Evidence: "), text("[Source names]")),
          para(bold("Confidence: "), text("Medium")),
          para(bold("Last validated: "), text("[Date]")),
          para(bold("Contradictions: "), text("[Source that disagrees]")),
          
          h3("[Claim 3]"),
          para(bold("Evidence: "), text("Assumed — no direct evidence")),
          para(bold("Confidence: "), text("Low")),
          para(bold("Risk: "), text("[What happens if wrong]")),
          
          h2("Critical Gaps"),
          para(text("• [What we're assuming without evidence]")),
          para(text("• [What's outdated and needs refresh]")),
          para(text("• [What has contradictory signals]")),
          
          h2("Recommended Actions"),
          para(text("1. [Research to close gap 1]")),
          para(text("2. [Research to close gap 2]")),
        ],
      };

    case "transition-playbook":
      return {
        type: "doc",
        content: [
          h2("Decisions Made"),
          para(text("The following have been decided and should not be revisited without new evidence:")),
          para(text("• [Decision 1] — see Design Rationale")),
          para(text("• [Decision 2] — see Decision Brief")),
          para(text("• [Decision 3] — see Decision Brief")),
          
          h2("Decisions Deferred"),
          para(text("The following were explicitly not decided:")),
          para(text("• [Deferred decision 1] — blocked by [reason]")),
          para(text("• [Deferred decision 2] — needs [input]")),
          
          h2("Open Questions"),
          para(text("Research needed to proceed:")),
          para(text("• [Question 1] — see Research Warrant")),
          para(text("• [Question 2] — requires [method]")),
          
          h2("Known Risks"),
          para(text("• [Risk 1] — mitigation: [approach]")),
          para(text("• [Risk 2] — mitigation: [approach]")),
          
          h2("Next Steps"),
          para(text("1. [Immediate action]")),
          para(text("2. [Short-term action]")),
          para(text("3. [Action blocked until [condition]]")),
          
          h2("Key Contacts"),
          para(text("• [Person] — context: [what they know]")),
          para(text("• [Person] — context: [what they know]")),
        ],
      };

    default:
      return {
        type: "doc",
        content: [
          para(text(`Generated from ${sourceCount} sources.`)),
          para(text(prompt || "[Content will be generated based on selected sources]")),
        ],
      };
  }
}
