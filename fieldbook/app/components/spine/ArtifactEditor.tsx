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

import { useState, useCallback, useRef, useEffect, useLayoutEffect, useMemo } from "react";
import type { ArtifactItem, SynthesisItem, SourceItem, SpineItem } from "./types";
import { DocumentEditor } from "../editor/DocumentEditor";
import type { FieldbookDocument } from "../../lib/blocks";
import { useTheme } from "../ThemeProvider";
import { ExportDropdown } from "../ExportDropdown";
import { LastRecalibratedInfo } from "../RecalibrationIndicator";
import { PrepareForAgentDrawer } from "../PrepareForAgentDrawer";
import { DiffHighlightBanner, useDiffHighlight } from "../DiffHighlightBanner";
import { Button } from "../Button";
import { NodeTypeIcon } from "./SourcesPanel";
import { SemanticPills } from "../SemanticPills";
import { artifactTypes } from "../../lib/catalog";
import { TipTapPreview } from "../TipTapPreview";
import type { NodeStatus, Visibility } from "./types";

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
  /** Fieldbook ID — passed to PrepareForAgentDrawer for compile API calls */
  fieldbookId?: string;
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

function getArtifactTypeHelper(artifactType: string): string | null {
  switch (artifactType) {
    case "decision-brief":
      return "Clarify trade-offs and arrive at a defensible recommendation.";
    case "opportunity-map":
      return "Surface where unmet needs and strategic openings converge.";
    case "design-rationale":
      return "Document why specific design choices were made and what constraints shaped them.";
    case "research-warrant":
      return "Build the evidence-backed case for why this research direction matters.";
    case "alignment-map":
      return "Make visible where stakeholders agree, diverge, and need resolution.";
    case "evidence-inventory":
      return "Catalog the raw evidence so nothing is lost or overlooked.";
    case "transition-playbook":
      return "Translate insights into sequenced, actionable next steps.";
    default:
      return null;
  }
}

function getSelectionRationale(artifactType: string): string {
  switch (artifactType) {
    case "decision-brief":
      return "Prioritizing syntheses with clear trade-offs and recommendations.";
    case "opportunity-map":
      return "Including all syntheses for broad thematic coverage.";
    case "design-rationale":
      return "Combining syntheses for framing with sources for grounding detail.";
    case "research-warrant":
      return "Leading with source evidence, supported by a synthesis for framing.";
    case "alignment-map":
      return "Including all syntheses to represent different perspectives.";
    case "evidence-inventory":
      return "Pulling in all sources as raw evidence for cataloging.";
    case "transition-playbook":
      return "Balancing syntheses for strategy with sources for implementation context.";
    default:
      return "Selected the most recent and relevant items.";
  }
}

// ---------------------------------------------------------------------------
// Chip animation keyframes (injected once)
// ---------------------------------------------------------------------------
const CHIP_ANIMATION_STYLES = `
@keyframes chipIn {
  0% { opacity: 0; transform: scale(0.85) translateY(2px); }
  100% { opacity: 1; transform: scale(1) translateY(0); }
}
@keyframes chipOut {
  0% { opacity: 1; transform: scale(1); max-width: 300px; padding: 6px 10px; margin: 0 3px 0 0; border-width: 0.5px; }
  60% { opacity: 0; transform: scale(0.85); }
  100% { opacity: 0; transform: scale(0.8); max-width: 0; padding: 0; margin: 0; border-width: 0; overflow: hidden; }
}
`;

// ---------------------------------------------------------------------------
// SourceChip: a single selectable node chip used in the categorized list
// ---------------------------------------------------------------------------
function SourceChip({
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
  const iconType = item.type === "source" ? "source" : item.type === "synthesis" ? "synthesis" : "artifact";
  const isLinkSource = item.type === "source" && (item as SourceItem).kind === "external_link";
  const purpleIcon = isDark ? "#8b5cf6" : "#7c3aed";
  const textColor = isDark ? "#d4d4d4" : "#404040";
  const mutedIcon = isDark ? "#737373" : "#737373";
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
          type={iconType}
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

// ---------------------------------------------------------------------------
// SelectedChip: an animated chip in the curated "selected" row
// ---------------------------------------------------------------------------
function SelectedChip({
  item,
  onRemove,
  isDark,
  isEntering,
}: {
  item: SpineItem;
  onRemove: () => void;
  isDark: boolean;
  isEntering: boolean;
}) {
  const iconType = item.type === "source" ? "source" : item.type === "synthesis" ? "synthesis" : "artifact";
  const isLinkSource = item.type === "source" && (item as SourceItem).kind === "external_link";
  const purpleIcon = isDark ? "#8b5cf6" : "#7c3aed";
  const textColor = isDark ? "#d4d4d4" : "#404040";
  const borderColor = isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)";
  const hoverBg = isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)";

  return (
    <button
      onClick={onRemove}
      className="text-left px-2.5 py-1.5 rounded-md cursor-pointer inline-flex items-center gap-2"
      style={{
        backgroundColor: "transparent",
        color: textColor,
        border: `0.5px solid ${borderColor}`,
        transition: "background-color 150ms ease",
        animation: isEntering ? "chipIn 220ms cubic-bezier(0.16, 1, 0.3, 1) both" : undefined,
      }}
      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = hoverBg; }}
      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
    >
      <span className="shrink-0">
        <NodeTypeIcon type={iconType} isLink={isLinkSource} className="w-3 h-3" color={purpleIcon} />
      </span>
      <span className="text-xs truncate">{item.title}</span>
      <svg className="w-3 h-3 ml-auto shrink-0 opacity-60" fill="none" stroke={textColor} viewBox="0 0 24 24" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  );
}

// ---------------------------------------------------------------------------
// ExitingChip: plays exit animation then removes itself
// ---------------------------------------------------------------------------
function ExitingChip({
  item,
  isDark,
  onDone,
}: {
  item: SpineItem;
  isDark: boolean;
  onDone: () => void;
}) {
  const iconType = item.type === "source" ? "source" : item.type === "synthesis" ? "synthesis" : "artifact";
  const isLinkSource = item.type === "source" && (item as SourceItem).kind === "external_link";
  const purpleIcon = isDark ? "#8b5cf6" : "#7c3aed";
  const textColor = isDark ? "#d4d4d4" : "#404040";
  const borderColor = isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)";

  useEffect(() => {
    const timer = setTimeout(onDone, 250);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <span
      className="text-left px-2.5 py-1.5 rounded-md inline-flex items-center gap-2 pointer-events-none"
      style={{
        backgroundColor: "transparent",
        color: textColor,
        border: `0.5px solid ${borderColor}`,
        animation: "chipOut 250ms cubic-bezier(0.16, 1, 0.3, 1) forwards",
      }}
    >
      <span className="shrink-0">
        <NodeTypeIcon type={iconType} isLink={isLinkSource} className="w-3 h-3" color={purpleIcon} />
      </span>
      <span className="text-xs truncate">{item.title}</span>
      <svg className="w-3 h-3 ml-auto shrink-0 opacity-60" fill="none" stroke={textColor} viewBox="0 0 24 24" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </span>
  );
}

// ---------------------------------------------------------------------------
// SourceCategory: a labeled group of source chips in the "Add More" panel
// ---------------------------------------------------------------------------
function SourceCategory({
  label,
  items,
  derivedFrom,
  toggleDerivedFrom,
  isDark,
  isLoading = false,
  recentlyAdded,
}: {
  label: string;
  items: SpineItem[];
  derivedFrom: string[];
  toggleDerivedFrom: (id: string) => void;
  isDark: boolean;
  isLoading?: boolean;
}) {
  // Don't render empty categories (unless loading for this one)
  if (items.length === 0 && !isLoading) return null;

  return (
    <div className="mb-5">
      <div
        className="text-[10px] font-medium tracking-wider uppercase mb-2"
        style={{ color: isDark ? "#d4d4d4" : "#525252" }}
      >
        {label}
        {isLoading && items.length === 0 && (
          <span className="ml-1.5 inline-flex items-center">
            <svg className="animate-spin w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" strokeOpacity="0.2" />
              <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
            </svg>
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item) => (
          <SourceChip
            key={item.id}
            item={item}
            isSelected={derivedFrom.includes(item.id)}
            onToggle={() => toggleDerivedFrom(item.id)}
            isDark={isDark}
          />
        ))}
      </div>
    </div>
  );
}

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
  fieldbookId,
}: ArtifactEditorProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  // Diff highlight state (for showing change banners)
  const { shouldShow: showDiffBanner, dismiss: dismissDiffBanner } = useDiffHighlight(
    artifact?.id,
    artifact?.lastDiff,
    artifact?.recalcStatus,
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
  
  // Prepare for Agent drawer
  const [isAgentDrawerOpen, setIsAgentDrawerOpen] = useState(false);

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(!isNew || !!artifact?.content);
  const [justGenerated, setJustGenerated] = useState(false);
  const [prompt, setPrompt] = useState("");
  
  // Artifact state
  const [title, setTitle] = useState(artifact?.title || "");
  const [artifactType, setArtifactType] = useState(artifact?.artifactType || "");
  const [status, setStatus] = useState<ArtifactItem["status"]>(artifact?.status || "draft");
  const [content, setContent] = useState<FieldbookDocument>(() => getInitialContent(artifact));
  const [derivedFrom, setDerivedFrom] = useState<string[]>(artifact?.derivedFrom || []);
  
  const originalTitle = useRef(artifact?.title || "");
  const originalArtifactType = useRef(artifact?.artifactType || "");
  const originalStatus = useRef(artifact?.status || "draft");
  const originalContent = useRef(artifact?.contentRendered || artifact?.content || "");
  const originalDerivedFrom = useRef(artifact?.derivedFrom || []);
  
  const [isDirty, setIsDirty] = useState(false);
  const contentRef = useRef<string>(artifact?.contentRendered || artifact?.content || "");
  const [showPreview, setShowPreview] = useState(false);

  // Scroll to top when switching between artifacts (before browser paints)
  useLayoutEffect(() => {
    if (scrollContainerRef.current) scrollContainerRef.current.scrollTop = 0;
  }, [artifact?.id]);

  // Can derive from any item type (memoized to stabilize effect dependencies)
  const availableItems = useMemo(() => 
    allItems.filter(
      (item) => item.type === "source" || item.type === "synthesis" || item.type === "decision"
    ),
    [allItems]
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

  // Animation tracking for smooth chip transitions
  const [recentlyAddedIds, setRecentlyAddedIds] = useState<Set<string>>(new Set());
  const [exitingItems, setExitingItems] = useState<Map<string, SpineItem>>(new Map());

  const toggleDerivedFrom = useCallback((itemId: string) => {
    setDerivedFrom((prev) => {
      const isRemoving = prev.includes(itemId);
      if (isRemoving) {
        // Find the item to animate its exit
        const exitingItem = allItems.find(i => i.id === itemId);
        if (exitingItem) {
          setExitingItems(old => new Map(old).set(itemId, exitingItem));
        }
        return prev.filter((id) => id !== itemId);
      } else {
        // Track as recently added for enter animation
        setRecentlyAddedIds(old => new Set(old).add(itemId));
        setTimeout(() => {
          setRecentlyAddedIds(old => {
            const next = new Set(old);
            next.delete(itemId);
            return next;
          });
        }, 250);
        return [...prev, itemId];
      }
    });
  }, [allItems]);

  const handleExitDone = useCallback((itemId: string) => {
    setExitingItems(old => {
      const next = new Map(old);
      next.delete(itemId);
      return next;
    });
  }, []);

  // Smart pre-selection: infer a reasonable starting set based on artifact type
  // "I have a point of view, but you're in charge."
  const hasAutoSelected = useRef(false);
  
  useEffect(() => {
    if (!isNew || hasGenerated || hasAutoSelected.current) return;
    if (availableItems.length === 0) return;
    
    const sources = availableItems.filter(i => i.type === "source");
    const syntheses = availableItems.filter(
      i => i.type === "synthesis" && (i as SynthesisItem).status !== "draft"
    );
    
    // Sort by recency (most recent first)
    const byRecency = <T extends { updatedAt: string; createdAt: string }>(items: T[]): T[] =>
      [...items].sort((a, b) => 
        new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()
      );
    
    const recentSyntheses = byRecency(syntheses);
    const recentSources = byRecency(sources);
    
    let preSelected: string[] = [];
    
    switch (artifactType) {
      case "decision-brief":
        // Decision briefs lean on syntheses — pick the 2-3 most recent committed
        preSelected = recentSyntheses.slice(0, 3).map(i => i.id);
        break;
        
      case "opportunity-map":
        // Broad coverage — all committed syntheses (they represent themes)
        preSelected = recentSyntheses.map(i => i.id);
        break;
        
      case "design-rationale":
        // Syntheses first, then a couple sources for grounding
        preSelected = [
          ...recentSyntheses.slice(0, 2).map(i => i.id),
          ...recentSources.slice(0, 1).map(i => i.id),
        ];
        break;
        
      case "research-warrant":
        // Evidence-heavy — sources first, then syntheses for framing
        preSelected = [
          ...recentSources.slice(0, 3).map(i => i.id),
          ...recentSyntheses.slice(0, 1).map(i => i.id),
        ];
        break;
        
      case "alignment-map":
        // All syntheses — alignment needs all perspectives
        preSelected = recentSyntheses.map(i => i.id);
        break;
        
      case "evidence-inventory":
        // All sources — this is a raw evidence catalog
        preSelected = recentSources.map(i => i.id);
        break;
        
      case "transition-playbook":
        // Action-oriented — syntheses for strategy, recent sources for context
        preSelected = [
          ...recentSyntheses.slice(0, 2).map(i => i.id),
          ...recentSources.slice(0, 2).map(i => i.id),
        ];
        break;
        
      default:
        // Sensible fallback: most recent 2-3 items
        preSelected = byRecency(availableItems).slice(0, 3).map(i => i.id);
    }
    
    if (preSelected.length > 0) {
      setDerivedFrom(preSelected);
      hasAutoSelected.current = true;
    }
  }, [isNew, hasGenerated, artifactType, availableItems]);
  
  // Re-run pre-selection when artifact type changes (only during creation)
  const prevArtifactType = useRef(artifactType);
  useEffect(() => {
    if (!isNew || hasGenerated) return;
    if (artifactType !== prevArtifactType.current) {
      prevArtifactType.current = artifactType;
      hasAutoSelected.current = false; // allow re-selection
      setShowAddMore(false); // collapse when type changes
    }
  }, [artifactType, isNew, hasGenerated]);

  // "Add More" expansion state
  const [showAddMore, setShowAddMore] = useState(false);
  const [aiRankedIds, setAiRankedIds] = useState<Map<string, number>>(new Map());
  const [isLoadingRanking, setIsLoadingRanking] = useState(false);
  const rankedForType = useRef<string>("");

  // Fetch AI ranking when "Add More" is opened
  useEffect(() => {
    if (!showAddMore || !artifactType || rankedForType.current === artifactType) return;
    if (availableItems.length === 0) return;

    const unselectedItems = availableItems.filter(i => !derivedFrom.includes(i.id));
    if (unselectedItems.length === 0) return;

    let cancelled = false;
    setIsLoadingRanking(true);

    fetch("/api/ai/rank-sources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        artifactType,
        artifactTypeLabel: ARTIFACT_TYPES.find(t => t.value === artifactType)?.label || "Artifact",
        items: unselectedItems.map(i => ({
          id: i.id,
          title: i.title,
          content: i.contentRendered || i.content || "",
          type: i.type,
        })),
      }),
    })
      .then(r => r.json())
      .then(data => {
        if (cancelled) return;
        const map = new Map<string, number>();
        if (data.ranked && Array.isArray(data.ranked)) {
          for (const r of data.ranked) {
            map.set(r.id, r.score);
          }
        }
        setAiRankedIds(map);
        rankedForType.current = artifactType;
      })
      .catch(() => { /* silent */ })
      .finally(() => { if (!cancelled) setIsLoadingRanking(false); });

    return () => { cancelled = true; };
  }, [showAddMore, artifactType, availableItems, derivedFrom]);

  // Categorize unselected items for "Add More"
  const categorizedItems = useMemo(() => {
    if (!showAddMore) return null;

    const unselected = availableItems.filter(i => !derivedFrom.includes(i.id));
    if (unselected.length === 0) return null;

    const now = Date.now();
    const ONE_DAY = 24 * 60 * 60 * 1000;

    // Find which items are used in syntheses that are related to selected items
    const selectedIds = new Set(derivedFrom);
    const relatedToSelected = new Set<string>();
    
    // For each synthesis, if it's selected, its derivedFrom sources are "related"
    // For each source, if it's selected, syntheses that reference it are "related"
    for (const item of allItems) {
      if (item.type === "synthesis" && item.derivedFrom) {
        const isThisSynthesisSelected = selectedIds.has(item.id);
        const hasSelectedSource = item.derivedFrom.some(id => selectedIds.has(id));
        
        if (isThisSynthesisSelected) {
          // Sources that feed into a selected synthesis are related
          for (const sourceId of item.derivedFrom) {
            if (!selectedIds.has(sourceId)) relatedToSelected.add(sourceId);
          }
        }
        if (hasSelectedSource && !selectedIds.has(item.id)) {
          // Syntheses that share a source with our selection are related
          relatedToSelected.add(item.id);
        }
      }
    }

    // Find items not referenced by any synthesis or artifact
    const referencedIds = new Set<string>();
    for (const item of allItems) {
      if (item.derivedFrom) {
        for (const refId of item.derivedFrom) {
          referencedIds.add(refId);
        }
      }
    }

    const highOverlap: SpineItem[] = [];
    const recentlyAdded: SpineItem[] = [];
    const usedInRelated: SpineItem[] = [];
    const notYetReferenced: SpineItem[] = [];
    const placed = new Set<string>();

    // 1. AI-ranked high overlap (score >= 0.6)
    for (const item of unselected) {
      const score = aiRankedIds.get(item.id);
      if (score !== undefined && score >= 0.6) {
        highOverlap.push(item);
        placed.add(item.id);
      }
    }

    // 2. Used in related synthesis
    for (const item of unselected) {
      if (placed.has(item.id)) continue;
      if (relatedToSelected.has(item.id)) {
        usedInRelated.push(item);
        placed.add(item.id);
      }
    }

    // 3. Recently added (within last 3 days)
    for (const item of unselected) {
      if (placed.has(item.id)) continue;
      const age = now - new Date(item.createdAt).getTime();
      if (age < 3 * ONE_DAY) {
        recentlyAdded.push(item);
        placed.add(item.id);
      }
    }

    // 4. Not yet referenced (orphans)
    for (const item of unselected) {
      if (placed.has(item.id)) continue;
      if (!referencedIds.has(item.id)) {
        notYetReferenced.push(item);
        placed.add(item.id);
      }
    }

    // Anything remaining goes into not yet referenced as a catch-all
    for (const item of unselected) {
      if (!placed.has(item.id)) {
        notYetReferenced.push(item);
      }
    }

    return { highOverlap, recentlyAdded, usedInRelated, notYetReferenced };
  }, [showAddMore, availableItems, derivedFrom, allItems, aiRankedIds]);

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
      // Carry semantic fields through on creation / save
      nodeStatus: artifact?.nodeStatus || "draft",
      visibility: artifact?.visibility || "internal",
      tags: artifact?.tags || [],
      owner: artifact?.owner,
    };

    originalTitle.current = title.trim();
    originalArtifactType.current = artifactType;
    originalStatus.current = status;
    originalContent.current = serializedContent;
    originalDerivedFrom.current = derivedFrom;
    
    setIsDirty(false);
    onSave(savedArtifact);
  }, [artifact, title, artifactType, status, content, derivedFrom, onSave]);

  const getStatus = () => {
    if (isGenerating) return { label: "Generating...", type: "saving" as const };
    if (!hasGenerated) return { label: "Not generated", type: "draft" as const };
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
            className="text-[10px] font-medium tracking-wider uppercase"
            style={{ color: isDark ? "#d4d4d4" : "#525252" }}
          >
            Generate Artifact
          </span>
          {onDiscard && (
            <Button variant="secondary" onClick={onDiscard}>
              Discard
            </Button>
          )}
        </div>

        {/* Generation UI - focused, minimal */}
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto min-h-0">
          <div className="px-8 py-6 max-w-xl">
            {/* Artifact Type - first */}
            <div className="mb-8">
              <div 
                className="text-[10px] font-medium tracking-wider uppercase mb-2"
                style={{ color: isDark ? "#d4d4d4" : "#525252" }}
              >
                Sparq Artifact Type
              </div>
              <div className="relative inline-block">
                <select
                  value={artifactType}
                  onChange={(e) => setArtifactType(e.target.value)}
                  className="appearance-none text-xs px-3 py-1.5 pr-7 rounded-md cursor-pointer"
                  style={{
                    backgroundColor: "transparent",
                    color: isDark ? "#d4d4d4" : "#404040",
                    border: `0.5px solid ${isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)"}`,
                    outline: "none",
                    transition: "all 150ms cubic-bezier(0.16, 1, 0.3, 1)",
                  }}
                >
                  <option value="" disabled>
                    Select an artifact type
                  </option>
                  {ARTIFACT_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
                <svg 
                  className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none"
                  fill="none" 
                  stroke={isDark ? "#737373" : "#737373"}
                  viewBox="0 0 24 24" 
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </div>
              {artifactType && getArtifactTypeHelper(artifactType) && (
                <div 
                  className="text-xs mt-2"
                  style={{ color: isDark ? "#737373" : "#a3a3a3" }}
                >
                  {getArtifactTypeHelper(artifactType)}
                </div>
              )}
            </div>

            {/* Derive from - second */}
            {availableItems.length > 0 && artifactType && (
              <div className="mb-10">
                <div 
                  className="text-[10px] font-medium tracking-wider uppercase mb-1"
                  style={{ color: isDark ? "#d4d4d4" : "#525252" }}
                >
                  Derive from {derivedFrom.length > 0 && `(${derivedFrom.length})`}
                </div>
                <div 
                  className="text-xs mb-3"
                  style={{ color: isDark ? "#737373" : "#a3a3a3" }}
                >
                  {getSelectionRationale(artifactType)}
                </div>

                {/* Pre-selected items (the curated starting set) */}
                {(derivedFrom.length > 0 || exitingItems.size > 0) && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    <style>{CHIP_ANIMATION_STYLES}</style>
                    {derivedFrom.map((id) => {
                      const item = availableItems.find(i => i.id === id);
                      if (!item) return null;
                      return (
                        <SelectedChip
                          key={item.id}
                          item={item}
                          onRemove={() => toggleDerivedFrom(item.id)}
                          isDark={isDark}
                          isEntering={recentlyAddedIds.has(item.id)}
                        />
                      );
                    })}
                    {Array.from(exitingItems.entries()).map(([id, item]) => (
                      <ExitingChip
                        key={`exit-${id}`}
                        item={item}
                        isDark={isDark}
                        onDone={() => handleExitDone(id)}
                      />
                    ))}
                  </div>
                )}

                {/* Add More button */}
                {availableItems.length > derivedFrom.length && !showAddMore && (
                  <Button
                    variant="tertiary"
                    onClick={() => setShowAddMore(true)}
                    className="text-xs"
                  >
                    + Add more
                  </Button>
                )}

                {/* Categorized remaining items */}
                {showAddMore && categorizedItems && (
                  <div 
                    className="mt-2 pt-3"
                    style={{ borderTop: `0.5px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}` }}
                  >
                    <SourceCategory
                      label="High overlap"
                      items={categorizedItems.highOverlap}
                      derivedFrom={derivedFrom}
                      toggleDerivedFrom={toggleDerivedFrom}
                      isDark={isDark}
                      isLoading={isLoadingRanking}
                    />
                    <SourceCategory
                      label="Used in related syntheses"
                      items={categorizedItems.usedInRelated}
                      derivedFrom={derivedFrom}
                      toggleDerivedFrom={toggleDerivedFrom}
                      isDark={isDark}
                    />
                    <SourceCategory
                      label="Recently added"
                      items={categorizedItems.recentlyAdded}
                      derivedFrom={derivedFrom}
                      toggleDerivedFrom={toggleDerivedFrom}
                      isDark={isDark}
                    />
                    <SourceCategory
                      label="Not yet referenced"
                      items={categorizedItems.notYetReferenced}
                      derivedFrom={derivedFrom}
                      toggleDerivedFrom={toggleDerivedFrom}
                      isDark={isDark}
                    />
                    {availableItems.length <= derivedFrom.length && (
                      <div 
                        className="text-[10px] italic py-2"
                        style={{ color: isDark ? "#525252" : "#a3a3a3" }}
                      >
                        All items selected
                      </div>
                    )}
                    <button
                      onClick={() => setShowAddMore(false)}
                      className="text-[10px] mt-2 cursor-pointer"
                      style={{ color: isDark ? "#525252" : "#a3a3a3" }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = isDark ? "#a3a3a3" : "#525252"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = isDark ? "#525252" : "#a3a3a3"; }}
                    >
                      Collapse
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Instructions */}
            <div className="mb-6">
              <div 
                className="text-[10px] font-medium tracking-wider uppercase mb-2"
                style={{ color: isDark ? "#d4d4d4" : "#525252" }}
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
            <Button
              variant="primary"
              onClick={handleGenerate}
              disabled={isGenerating || !artifactType}
              className="gap-2"
            >
              {isGenerating ? (
                <>
                  <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Generating...
                </>
              ) : (
                artifactType
                  ? `Generate ${ARTIFACT_TYPES.find((t) => t.value === artifactType)?.label || "Artifact"}`
                  : "Generate Artifact"
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Show editor UI after generation
  const statusBadge = getStatus();

  return (
    <>
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
            Artifact
          </span>
          {statusBadge && (
            <>
              <span style={{ color: isDark ? "#333" : "#d4d4d4" }}>·</span>
              <span 
                className="text-[9px] px-1.5 py-0.5 rounded-sm font-medium"
                style={{ 
                  backgroundColor: statusBadge.type === "draft"
                    ? (isDark ? "rgba(252, 211, 77, 0.15)" : "rgba(180, 83, 9, 0.1)")
                    : "transparent",
                  color: statusBadge.type === "saving"
                    ? (isDark ? "#22c55e" : "#16a34a")
                    : (isDark ? "#fcd34d" : "#b45309"),
                }}
              >
                {statusBadge.label}
              </span>
            </>
          )}
          {/* Recalibration state is now shown via blur on the title */}
        </div>
        
        {!readOnly && (
          <div className="flex items-center gap-1">
            {!isNew && artifact && (
              <Button
                variant="secondary"
                onClick={() => setIsAgentDrawerOpen(true)}
              >
                Prepare for Agent
              </Button>
            )}
            {!isNew && artifact && (
              <>
                <button
                  type="button"
                  onClick={() => setShowPreview(!showPreview)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
                  style={{
                    backgroundColor: showPreview 
                      ? (isDark ? "#7c3aed" : "#8b5cf6") 
                      : (isDark ? "#262626" : "#f5f5f5"),
                    color: showPreview 
                      ? "#ffffff" 
                      : (isDark ? "#e5e5e5" : "#171717"),
                    border: `1px solid ${showPreview ? "transparent" : (isDark ? "#404040" : "#e5e5e5")}`,
                  }}
                  title={showPreview ? "Hide preview" : "Show preview"}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                    <line x1="12" y1="3" x2="12" y2="21"/>
                  </svg>
                  Preview
                </button>
                <ExportDropdown 
                  title={title || "Untitled Artifact"} 
                  content={content}
                  disabled={isNew}
                />
              </>
            )}
            {!isNew && onDelete && artifact && (
              <Button 
                variant="secondary" 
                onClick={() => onDelete(artifact.id)}
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

      {/* Content area - toggles between editor and preview */}
        {showPreview ? (
          <div className="flex-1 min-h-0 overflow-hidden">
            <TipTapPreview 
              content={artifact?.contentRendered || artifact?.content || JSON.stringify(content)} 
              className="h-full"
            />
          </div>
        ) : (
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
            {/* Title — blurs during recalibration, clears when done */}
              <textarea
                value={title}
                onChange={(e) => { setTitle(e.target.value); e.target.style.height = "auto"; e.target.style.height = e.target.scrollHeight + "px"; }}
                placeholder="Untitled"
                rows={1}
                className="w-full text-lg font-medium placeholder-neutral-500 border-none outline-none bg-transparent resize-none overflow-hidden mb-0"
                style={{
                  color: isDark ? "#e5e5e5" : "#171717",
                  letterSpacing: "-0.01em",
                  filter: artifact?.recalcStatus === "recalibrating" ? "blur(3.5px)" : "blur(0px)",
                  opacity: artifact?.recalcStatus === "recalibrating" ? 0.6 : 1,
                  transition: artifact?.recalcStatus === "recalibrating"
                    ? "filter 300ms ease-in, opacity 300ms ease-in"
                    : "filter 400ms ease-out, opacity 400ms ease-out",
                }}
                disabled={readOnly}
                ref={(el) => { if (el) { el.style.height = "auto"; el.style.height = el.scrollHeight + "px"; } }}
                onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }}
              />
            
            {/* Version indicator */}
            {artifact && artifact.version > 0 && (
              <div
                className="text-[10px] font-medium tracking-wider mb-4"
                style={{ color: isDark ? "#d4d4d4" : "#525252" }}
              >
                v{artifact.version}
              </div>
            )}

            {/* Semantic pills */}
            {artifact && (
              <SemanticPills
                typeValue={artifact.artifactType || "decision-brief"}
                typeOptions={artifactTypes}
                status={artifact.nodeStatus || "draft"}
                visibility={artifact.visibility || "internal"}
                onTypeChange={(v) => { setArtifactType(v); }}
                onStatusChange={(v: NodeStatus) => onSave?.({ ...artifact, nodeStatus: v, title, content: contentRef.current, status: v as ArtifactItem["status"], artifactType: artifactType || artifact.artifactType })}
                onVisibilityChange={(v: Visibility) => onSave?.({ ...artifact, visibility: v, title, content: contentRef.current, artifactType: artifactType || artifact.artifactType })}
                readOnly={readOnly}
              />
            )}

            {/* Diff Highlight Banner - shows when content changed due to upstream (hidden in read-only) */}
            {!readOnly && showDiffBanner && artifact?.lastDiff && (
              <DiffHighlightBanner 
                diff={artifact.lastDiff}
                onAccept={handleIgnoreDiff}
                onRequestAIUpdate={handleMakeChange}
                sourceChangeSnippet={artifact.lastDiff.sourceChangeSnippet}
                onNavigateToSource={onSelectItem}
              />
            )}
            
            {/* Last Recalibrated Info - only shows during/after active recalibration */}
            {!showDiffBanner && artifact?.lastRenderedAt && (artifact?.recalcStatus === "recalibrating" || artifact?.recalcStatus === "calibrated") && (
              <LastRecalibratedInfo 
                lastRenderedAt={artifact.lastRenderedAt}
                lastDiff={artifact.lastDiff}
              />
            )}

          {/* Derived from — shown in lineage panel (right sidebar) */}

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
        )}
    </div>

    {/* Prepare for Agent drawer */}
    <PrepareForAgentDrawer
      isOpen={isAgentDrawerOpen}
      onClose={() => setIsAgentDrawerOpen(false)}
      artifactTitle={title || "Untitled Artifact"}
      fieldbookId={fieldbookId}
      nodeId={artifact?.id}
    />
    </>
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
