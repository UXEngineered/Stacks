"use client";

/**
 * SpineLayout - The primary layout for Stacks field books
 * 
 * A linear, three-column layout that replaces the infinite canvas.
 * Information flows left→right: Sources → Working Area → Lineage
 * 
 * Design principles:
 * - No rounded corners or playful elements
 * - Dense, typographic hierarchy
 * - Explicit derivation relationships
 * - Every element serves reasoning or traceability
 * 
 * Now with JSON-based persistence for demo-grade data survival.
 */

import { useState, useCallback, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { SourcesPanel } from "./SourcesPanel";
import { WorkingArea } from "./WorkingArea";
import { LineagePanel } from "./LineagePanel";
import { AddLinkModal } from "./AddLinkModal";
import { ThematicOverlapModal, type OverlapDetection } from "../ThematicOverlapModal";
import { useTheme } from "../ThemeProvider";
import { useNavContext } from "../NavContext";
import { useFieldbook } from "../../hooks/useFieldbook";
import { MOCK_MOVEMENT_EVENTS } from "../../lib/movement/mock";
import type { SpineItem, ItemType, SourceItem, SynthesisItem, ArtifactItem, DecisionItem, LineageReference, SynthesisGeneratingState } from "./types";

export type ContentVisibility = {
  sources: boolean;
  syntheses: boolean;
  artifacts: boolean;
};

interface SpineLayoutProps {
  projectId: string;
  /** When true, hides all editing controls for sharing/viewing */
  readOnly?: boolean;
  /** Controls which content types are visible (only used in readOnly mode) */
  visibility?: ContentVisibility;
}

export function SpineLayout({ projectId, readOnly = false, visibility }: SpineLayoutProps) {
  const router = useRouter();
  const { setNavState } = useNavContext();
  
  // Fetch fieldbook data from persistent storage
  const {
    fieldbook,
    isLoading,
    createSource,
    updateSource,
    deleteSource,
    createSynthesis,
    updateSynthesis,
    deleteSynthesis,
    createArtifact,
    updateArtifact,
    deleteArtifact,
    updateFieldbook,
    clearDiff,
    calibrationHistory,
    recordCalibrationDecision,
  } = useFieldbook(projectId);
  
  // Currently selected/focused item
  const [selectedId, setSelectedId] = useState<string | null>(null);
  
  // Panel for creating new items
  const [isCreating, setIsCreating] = useState<ItemType | null>(null);
  
  // Pre-selected sources when creating synthesis from source
  const [preSelectedSources, setPreSelectedSources] = useState<string[]>([]);
  
  // Delete fieldbook state
  const [isDeleteConfirm, setIsDeleteConfirm] = useState(false);
  
  // Add link modal state
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  
  // Generating syntheses (background auto-synthesis)
  // Maps temp ID to generating state - merged into items for display
  const [generatingSyntheses, setGeneratingSyntheses] = useState<Map<string, {
    id: string;
    title: string;
    sourceId: string;
    sourceTitle: string;
    state: SynthesisGeneratingState;
  }>>(new Map());
  
  // Thematic overlap modal state
  const [overlapModalOpen, setOverlapModalOpen] = useState(false);
  const [overlapDetection, setOverlapDetection] = useState<OverlapDetection | null>(null);
  const [pendingSource, setPendingSource] = useState<{
    id: string;
    title: string;
    content: string;
  } | null>(null);
  const [isCondensing, setIsCondensing] = useState(false);
  
  // Overlap check preference (stored per-fieldbook in localStorage)
  const [skipOverlapCheck, setSkipOverlapCheck] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(`skipOverlapCheck-${projectId}`) === "true";
  });
  
  // Animation state - hide scrollbars during page transition
  const [isAnimating, setIsAnimating] = useState(true);
  
  // Remove animating state after animations complete
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsAnimating(false);
    }, 400); // Match longest animation duration
    return () => clearTimeout(timer);
  }, []);

  // Handle project name change (called from GlobalNav)
  const handleProjectNameChange = useCallback(async (name: string) => {
    await updateFieldbook({ name });
  }, [updateFieldbook]);

  // Delete fieldbook handler
  const handleDeleteFieldbook = useCallback(async () => {
    if (isDeleteConfirm) {
      // Second click - actually delete
      try {
        const res = await fetch(`/api/db/fieldbooks/${projectId}`, {
          method: "DELETE",
        });
        if (res.ok) {
          router.push("/projects");
        }
      } catch (error) {
        console.error("Failed to delete fieldbook:", error);
      }
      setIsDeleteConfirm(false);
    } else {
      // First click - show confirm state
      setIsDeleteConfirm(true);
      // Reset after 3 seconds if not confirmed
      setTimeout(() => setIsDeleteConfirm(false), 3000);
    }
  }, [isDeleteConfirm, projectId, router]);

  // Movement data for the right-side Movement drawer (significant shifts only)
  // TODO: Replace with real events from backend when movement tracking is implemented
  const movementData = useMemo(() => ({
    events: MOCK_MOVEMENT_EVENTS,
  }), []);

  // Update global nav with project context
  useEffect(() => {
    if (fieldbook) {
      setNavState({
        projectId,
        projectName: fieldbook.name,
        onProjectNameChange: readOnly ? undefined : handleProjectNameChange,
        onDeleteProject: readOnly ? undefined : handleDeleteFieldbook,
        isDeleteConfirm,
        readOnly,
        movement: movementData,
        onMovementNavigate: (nodeId: string) => setSelectedId(nodeId),
      });
    }
  }, [fieldbook, projectId, handleProjectNameChange, handleDeleteFieldbook, isDeleteConfirm, setNavState, readOnly, movementData]);

  // Convert database items to SpineItems
  const items: SpineItem[] = useMemo(() => {
    if (!fieldbook) return [];
    
    const sourceItems: SourceItem[] = fieldbook.sources.map((s) => {
      // Handle external_link sources specially
      if (s.type === "external_link") {
        return {
          id: s.id,
          type: "source" as const,
          title: s.title,
          content: s.content || "",
          kind: "external_link" as const,
          url: s.url,
          domain: s.domain,
          note: s.note,
          capturedAt: s.capturedAt,
          createdAt: s.createdAt,
          updatedAt: s.updatedAt || s.createdAt,
          version: 1,
          // Semantic fields
          nodeStatus: (s.status as SourceItem["nodeStatus"]) || "canonical",
          visibility: (s.visibility as SourceItem["visibility"]) || "internal",
          tags: s.tags || [],
          owner: s.owner,
        };
      }
      
      // Regular sources
      return {
        id: s.id,
        type: "source" as const,
        title: s.title,
        content: s.content,
        kind: s.type === "interview" ? "note" : s.type === "transcript" ? "document" : s.type === "doc" ? "document" : "note",
        createdAt: s.createdAt,
        updatedAt: s.updatedAt || s.createdAt,
        version: 1,
        // Reverberation fields
        contentTemplate: s.contentTemplate,
        contentRendered: s.contentRendered,
        lastRenderedAt: s.lastRenderedAt,
        recalcStatus: s.recalcStatus,
        lastDiff: s.lastDiff,
        // Semantic fields
        nodeStatus: (s.status as SourceItem["nodeStatus"]) || "canonical",
        visibility: (s.visibility as SourceItem["visibility"]) || "internal",
        tags: s.tags || [],
        owner: s.owner,
      };
    });
    
    const synthesisItems: SynthesisItem[] = fieldbook.syntheses.map((s) => ({
      id: s.id,
      type: "synthesis" as const,
      title: s.title,
      content: s.content,
      synthesisType: (s.type as SynthesisItem["synthesisType"]) || "insight",
      sourceCount: s.derivedFrom?.length || 0,
      confidenceScore: (s as unknown as Record<string, unknown>).confidenceScore as number | undefined,
      derivedFrom: s.derivedFrom || [],
      status: (s.status === "canonical" ? "committed" : s.status === "proposed" ? "draft" : s.status === "draft" ? "draft" : undefined) as SynthesisItem["status"],
      createdAt: s.createdAt,
      updatedAt: s.updatedAt || s.createdAt,
      // Reverberation fields
      contentTemplate: s.contentTemplate,
      contentRendered: s.contentRendered,
      lastRenderedAt: s.lastRenderedAt,
      recalcStatus: s.recalcStatus,
      lastDiff: s.lastDiff,
      // Semantic fields
      nodeStatus: (s.status as SynthesisItem["nodeStatus"]) || "draft",
      visibility: (s.visibility as SynthesisItem["visibility"]) || "internal",
      tags: s.tags || [],
      owner: s.owner,
      // Workflow: backward compat — treat existing DB "draft" as needing review if flag is absent
      needsReview: s.needsReview ?? (s.status === "draft"),
    }));
    
    // Add generating syntheses as placeholder items
    generatingSyntheses.forEach((genSynth) => {
      synthesisItems.unshift({
        id: genSynth.id,
        type: "synthesis" as const,
        title: genSynth.title,
        content: "",
        synthesisType: "insight",
        sourceCount: 1,
        derivedFrom: [genSynth.sourceId],
        generatingState: genSynth.state,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        nodeStatus: "draft",
        visibility: "internal",
        tags: [],
      });
    });
    
    const artifactItems: ArtifactItem[] = fieldbook.artifacts.map((a) => ({
      id: a.id,
      type: "artifact" as const,
      title: a.title,
      content: a.content,
      artifactType: a.type,
      status: a.status,
      version: 1,
      derivedFrom: a.informedBy,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt || a.createdAt,
      // Reverberation fields
      contentTemplate: a.contentTemplate,
      contentRendered: a.contentRendered,
      lastRenderedAt: a.lastRenderedAt,
      recalcStatus: a.recalcStatus,
      lastDiff: a.lastDiff,
      // Semantic fields
      nodeStatus: (a.status as ArtifactItem["nodeStatus"]) || "draft",
      visibility: (a.visibility as ArtifactItem["visibility"]) || "internal",
      tags: a.tags || [],
      owner: a.owner,
    }));
    
    return [...sourceItems, ...synthesisItems, ...artifactItems];
  }, [fieldbook, generatingSyntheses]);

  const selectedItem = items.find((item) => item.id === selectedId) || null;

  // Get items by type
  const sources = items.filter((item) => item.type === "source") as SourceItem[];
  const syntheses = items.filter((item) => item.type === "synthesis") as SynthesisItem[];
  const decisions: DecisionItem[] = [];
  const artifacts = items.filter((item) => item.type === "artifact") as ArtifactItem[];

  // Auto-synthesize a source in the background
  const autoSynthesizeSource = useCallback(async (sourceId: string, sourceTitle: string, sourceContent: string) => {
    const tempId = `generating-${Date.now()}`;
    
    // Add to generating state
    setGeneratingSyntheses((prev) => {
      const next = new Map(prev);
      next.set(tempId, {
        id: tempId,
        title: `Synthesizing "${sourceTitle}"...`,
        sourceId,
        sourceTitle,
        state: "generating",
      });
      return next;
    });
    
    try {
      // Call AI generation API
      const response = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "synthesis",
          sources: [{ title: sourceTitle, content: sourceContent }],
        }),
      });
      
      let synthesisTitle = `Synthesis: ${sourceTitle}`;
      let synthesisContent = "";
      
      if (response.ok) {
        const result = await response.json();
        synthesisTitle = result.title || synthesisTitle;
        synthesisContent = JSON.stringify(result.content);
      } else {
        // Fallback content on error
        synthesisContent = JSON.stringify({
          type: "doc",
          content: [
            { type: "paragraph", content: [{ type: "text", text: `Synthesis of "${sourceTitle}" - please edit to add your analysis.` }] },
          ],
        });
      }
      
      const created = await createSynthesis({
        title: synthesisTitle,
        content: synthesisContent,
        derivedFrom: [sourceId],
        status: "draft",
        needsReview: true,
      });
      
      // Remove from generating state
      setGeneratingSyntheses((prev) => {
        const next = new Map(prev);
        next.delete(tempId);
        return next;
      });
      
      // Auto-select so the user immediately sees the draft banner
      if (created?.id) {
        setSelectedId(created.id);
      }
      
    } catch (error) {
      console.error("Auto-synthesis failed:", error);
      
      // Mark as failed, then remove after a delay
      setGeneratingSyntheses((prev) => {
        const next = new Map(prev);
        const existing = next.get(tempId);
        if (existing) {
          next.set(tempId, { ...existing, state: "failed" });
        }
        return next;
      });
      
      // Remove failed item after 3 seconds
      setTimeout(() => {
        setGeneratingSyntheses((prev) => {
          const next = new Map(prev);
          next.delete(tempId);
          return next;
        });
      }, 3000);
    }
  }, [createSynthesis]);

  // Check for thematic overlap with existing syntheses
  const checkThematicOverlap = useCallback(async (
    sourceTitle: string,
    sourceContent: string
  ): Promise<OverlapDetection> => {
    // Get committed syntheses (not drafts) for comparison
    const committedSyntheses = fieldbook?.syntheses
      .filter(s => s.status !== "draft")
      .map(s => ({
        id: s.id,
        title: s.title,
        content: s.content,
      })) || [];
    
    // If no existing syntheses, no overlap possible
    if (committedSyntheses.length === 0) {
      return { hasOverlap: false, existingSynthesis: null, explanation: null };
    }
    
    try {
      const response = await fetch("/api/ai/check-overlap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceTitle,
          sourceContent,
          existingSyntheses: committedSyntheses,
        }),
      });
      
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.error("Overlap check failed:", error);
    }
    
    // On error, return no overlap (don't block the flow)
    return { hasOverlap: false, existingSynthesis: null, explanation: null };
  }, [fieldbook?.syntheses]);

  // Handle user choosing to condense into existing synthesis
  const handleCondense = useCallback(async () => {
    if (!pendingSource || !overlapDetection?.existingSynthesis || !fieldbook) return;
    
    setIsCondensing(true);
    
    try {
      // Find the existing synthesis
      const existingSynthesis = fieldbook.syntheses.find(
        s => s.id === overlapDetection.existingSynthesis?.id
      );
      
      if (!existingSynthesis) {
        throw new Error("Synthesis not found");
      }
      
      // Call the condense API
      const response = await fetch("/api/ai/condense-synthesis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newSource: {
            title: pendingSource.title,
            content: pendingSource.content,
          },
          existingSynthesis: {
            id: existingSynthesis.id,
            title: existingSynthesis.title,
            content: existingSynthesis.content,
            derivedFrom: existingSynthesis.derivedFrom || [],
          },
        }),
      });
      
      if (response.ok) {
        const result = await response.json();
        
        // Update the existing synthesis with new content and add the source to derivedFrom
        await updateSynthesis(existingSynthesis.id, {
          title: result.title,
          content: JSON.stringify(result.content),
          derivedFrom: [...(existingSynthesis.derivedFrom || []), pendingSource.id],
        });
      } else {
        // On error, fall back to creating a new synthesis
        console.error("Condense failed, creating new synthesis instead");
        autoSynthesizeSource(pendingSource.id, pendingSource.title, pendingSource.content);
      }
    } catch (error) {
      console.error("Condense error:", error);
      // On error, fall back to creating a new synthesis
      autoSynthesizeSource(pendingSource.id, pendingSource.title, pendingSource.content);
    } finally {
      setIsCondensing(false);
      setOverlapModalOpen(false);
      setOverlapDetection(null);
      setPendingSource(null);
    }
  }, [pendingSource, overlapDetection, fieldbook, updateSynthesis, autoSynthesizeSource]);

  // Handle user choosing to keep separate (create new synthesis)
  const handleKeepSeparate = useCallback(() => {
    if (!pendingSource) return;
    
    // Proceed with normal auto-synthesis
    autoSynthesizeSource(pendingSource.id, pendingSource.title, pendingSource.content);
    
    // Close modal and clear state
    setOverlapModalOpen(false);
    setOverlapDetection(null);
    setPendingSource(null);
  }, [pendingSource, autoSynthesizeSource]);

  // Handle cancel (close modal without action - same as keep separate for now)
  const handleOverlapCancel = useCallback(() => {
    if (!pendingSource) {
      setOverlapModalOpen(false);
      setOverlapDetection(null);
      return;
    }
    
    // Create new synthesis (user dismissed without choosing)
    autoSynthesizeSource(pendingSource.id, pendingSource.title, pendingSource.content);
    
    setOverlapModalOpen(false);
    setOverlapDetection(null);
    setPendingSource(null);
  }, [pendingSource, autoSynthesizeSource]);

  // Handle "don't ask again" - skip overlap checks for this fieldbook
  const handleDontAskAgain = useCallback(() => {
    setSkipOverlapCheck(true);
    if (typeof window !== "undefined") {
      localStorage.setItem(`skipOverlapCheck-${projectId}`, "true");
    }
  }, [projectId]);

  // Trigger auto-synthesis with overlap check
  const triggerAutoSynthesis = useCallback(async (
    sourceId: string,
    sourceTitle: string,
    sourceContent: string
  ) => {
    // Skip overlap check if user opted out for this fieldbook
    if (skipOverlapCheck) {
      autoSynthesizeSource(sourceId, sourceTitle, sourceContent);
      return;
    }
    
    // Check for thematic overlap with existing syntheses
    const overlap = await checkThematicOverlap(sourceTitle, sourceContent);
    
    if (overlap.hasOverlap && overlap.existingSynthesis && overlap.explanation) {
      // Show modal for user decision
      setPendingSource({ id: sourceId, title: sourceTitle, content: sourceContent });
      setOverlapDetection(overlap);
      setOverlapModalOpen(true);
    } else {
      // No overlap or can't explain it - proceed with normal auto-synthesis
      autoSynthesizeSource(sourceId, sourceTitle, sourceContent);
    }
  }, [checkThematicOverlap, autoSynthesizeSource, skipOverlapCheck]);

  // Add external link source from modal
  const handleAddLink = useCallback(async (data: { url: string; title?: string; note?: string }) => {
    // Derive domain from URL
    let domain = "";
    try {
      const urlObj = new URL(data.url);
      domain = urlObj.hostname;
    } catch {
      domain = data.url;
    }
    
    // Use title or derive from URL
    const title = data.title || domain;
    const now = new Date().toISOString();
    
    const created = await createSource({
      title,
      type: "external_link",
      content: "", // External links don't have rich text content
      url: data.url,
      domain,
      note: data.note,
      capturedAt: now,
    });
    
    if (created) {
      setSelectedId(created.id);
    }
    setIsLinkModalOpen(false);
  }, [createSource]);

  // Add a new item - persist to database
  // autoSynthesize: if true, trigger background synthesis after creating source
  const handleAddItem = useCallback(async (item: SpineItem, autoSynthesize?: boolean) => {
    if (item.type === "source") {
      const sourceItem = item as SourceItem;
      
      // Handle external_link sources
      if (sourceItem.kind === "external_link") {
        const created = await createSource({
          title: sourceItem.title,
          type: "external_link",
          content: "",
          url: sourceItem.url,
          domain: sourceItem.domain,
          note: sourceItem.note,
          capturedAt: sourceItem.capturedAt || new Date().toISOString(),
        });
        if (created) {
          setSelectedId(created.id);
        }
      } else {
        const created = await createSource({
          title: sourceItem.title,
          type: sourceItem.kind === "document" ? "doc" : "note",
          content: sourceItem.content,
        });
        if (created) {
          setSelectedId(created.id);
          
          // Trigger auto-synthesis in background if requested
          // Only synthesize if we have meaningful content (not just empty doc)
          if (autoSynthesize && created.content) {
            // Check if content has actual text (not just empty paragraphs)
            let hasContent = false;
            try {
              const parsed = JSON.parse(created.content);
              if (parsed.content) {
                hasContent = parsed.content.some((node: { content?: Array<{ text?: string }> }) => 
                  node.content?.some((c) => c.text && c.text.trim().length > 0)
                );
              }
            } catch {
              // If not JSON, check if plain text has content
              hasContent = created.content.trim().length > 0;
            }
            
            if (hasContent) {
              // Check for thematic overlap before auto-synthesizing
              triggerAutoSynthesis(created.id, created.title, created.content);
            }
          }
        }
      }
    } else if (item.type === "synthesis") {
      const synthesisItem = item as SynthesisItem;
      const created = await createSynthesis({
        title: synthesisItem.title,
        content: synthesisItem.content,
        derivedFrom: synthesisItem.derivedFrom || [],
      });
      if (created) {
        setSelectedId(created.id);
      }
    } else if (item.type === "artifact") {
      const artifactItem = item as ArtifactItem;
      const created = await createArtifact({
        type: artifactItem.artifactType as "decision-brief" | "opportunity-map" | "design-rationale" | "research-warrant" | "alignment-map" | "evidence-inventory" | "transition-playbook",
        title: artifactItem.title,
        content: artifactItem.content,
        informedBy: artifactItem.derivedFrom || [],
        status: artifactItem.nodeStatus || "draft",
      });
      if (created) {
        setSelectedId(created.id);
      }
    }
    setIsCreating(null);
    setPreSelectedSources([]);
  }, [createSource, createSynthesis, createArtifact, triggerAutoSynthesis]);

  // Update an item - persist to database
  const handleUpdateItem = useCallback(async (id: string, updates: Partial<SpineItem>) => {
    const item = items.find((i) => i.id === id);
    if (!item) return;
    
    if (item.type === "source") {
      const sourceUpdates = updates as Partial<SourceItem>;
      const sourceItem = item as SourceItem;
      
      // Handle external_link sources
      if (sourceItem.kind === "external_link") {
        await updateSource(id, {
          title: sourceUpdates.title,
          // Semantic fields
          ...(sourceUpdates.nodeStatus && { status: sourceUpdates.nodeStatus }),
          ...(sourceUpdates.visibility && { visibility: sourceUpdates.visibility }),
          ...(sourceUpdates.tags && { tags: sourceUpdates.tags }),
          ...(sourceUpdates.owner !== undefined && { owner: sourceUpdates.owner }),
        });
      } else {
        await updateSource(id, {
          title: sourceUpdates.title,
          content: sourceUpdates.content,
          type: sourceUpdates.kind === "document" ? "doc" : "note",
          // Semantic fields
          ...(sourceUpdates.nodeStatus && { status: sourceUpdates.nodeStatus }),
          ...(sourceUpdates.visibility && { visibility: sourceUpdates.visibility }),
          ...(sourceUpdates.tags && { tags: sourceUpdates.tags }),
          ...(sourceUpdates.owner !== undefined && { owner: sourceUpdates.owner }),
        });
      }
    } else if (item.type === "synthesis") {
      const synthesisUpdates = updates as Partial<SynthesisItem>;
      const resolvedStatus = synthesisUpdates.nodeStatus
        || (synthesisUpdates.status === "committed" ? "canonical" : synthesisUpdates.status);
      await updateSynthesis(id, {
        title: synthesisUpdates.title,
        content: synthesisUpdates.content,
        derivedFrom: synthesisUpdates.derivedFrom,
        status: resolvedStatus,
        // Semantic fields
        ...(synthesisUpdates.synthesisType && { type: synthesisUpdates.synthesisType }),
        ...(synthesisUpdates.visibility && { visibility: synthesisUpdates.visibility }),
        ...(synthesisUpdates.tags && { tags: synthesisUpdates.tags }),
        ...(synthesisUpdates.owner !== undefined && { owner: synthesisUpdates.owner }),
        ...(synthesisUpdates.needsReview !== undefined && { needsReview: synthesisUpdates.needsReview }),
      });
    } else if (item.type === "artifact") {
      const artifactUpdates = updates as Partial<ArtifactItem>;
      await updateArtifact(id, {
        title: artifactUpdates.title,
        content: artifactUpdates.content,
        type: artifactUpdates.artifactType as "decision-brief" | "opportunity-map" | "design-rationale" | "research-warrant" | "alignment-map" | "evidence-inventory" | "transition-playbook",
        status: artifactUpdates.nodeStatus || (artifactUpdates.status as ArtifactItem["nodeStatus"]) || "draft",
        // Semantic fields
        ...(artifactUpdates.visibility && { visibility: artifactUpdates.visibility }),
        ...(artifactUpdates.tags && { tags: artifactUpdates.tags }),
        ...(artifactUpdates.owner !== undefined && { owner: artifactUpdates.owner }),
        informedBy: artifactUpdates.derivedFrom,
      });
    }
  }, [items, updateSource, updateSynthesis, updateArtifact]);

  // Delete an item - persist to database
  const handleDeleteItem = useCallback(async (id: string) => {
    const item = items.find((i) => i.id === id);
    if (!item) return;
    
    if (item.type === "source") {
      await deleteSource(id);
    } else if (item.type === "synthesis") {
      await deleteSynthesis(id);
    } else if (item.type === "artifact") {
      await deleteArtifact(id);
    }
    
    if (selectedId === id) {
      setSelectedId(null);
    }
  }, [items, deleteSource, deleteSynthesis, deleteArtifact, selectedId]);

  // Trigger synthesis creation from a source
  const handleSynthesizeSource = useCallback((sourceId: string) => {
    setPreSelectedSources([sourceId]);
    setIsCreating("synthesis");
  }, []);

  // Get lineage for selected item (what it derives from, what it informs)
  // Includes both local items, external lineage references, and removed items
  const getLineage = useCallback(() => {
    if (!selectedItem) return { derivedFrom: [], informs: [], externalDerivedFrom: [], removedDerivedFrom: [] };
    
    // Local items this derives from
    const derivedFrom = items.filter((item) =>
      selectedItem.derivedFrom?.includes(item.id)
    );
    
    // Local items that derive from this
    const informs = items.filter((item) =>
      item.derivedFrom?.includes(selectedItem.id)
    );
    
    // External lineage references for missing upstream nodes
    // These are nodes that exist in parent fieldbook(s) but not locally
    const externalDerivedFrom: LineageReference[] = [];
    
    // Removed items - IDs in derivedFrom that no longer exist locally or externally
    const removedDerivedFrom: { id: string; type: "source" | "synthesis" }[] = [];
    
    if (selectedItem.derivedFrom && selectedItem.derivedFrom.length > 0) {
      for (const refId of selectedItem.derivedFrom) {
        // Check if this reference is NOT in our local items
        const isLocal = items.some(item => item.id === refId);
        if (!isLocal) {
          // Look for it in lineage references
          const lineageRef = fieldbook?.lineageReferences?.find(
            lr => lr.originNodeId === refId
          );
          if (lineageRef) {
            externalDerivedFrom.push(lineageRef);
          } else {
            // This is a removed item - it doesn't exist locally or as an external reference
            // Assume it was a source (most common case for removed derivedFrom items)
            removedDerivedFrom.push({ id: refId, type: "source" });
          }
        }
      }
    }
    
    return { derivedFrom, informs, externalDerivedFrom, removedDerivedFrom };
  }, [selectedItem, items, fieldbook?.lineageReferences]);

  const lineage = getLineage();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  
  // Show empty state while loading (no text to avoid flash)
  if (isLoading) {
    return (
      <div className="flex-1" />
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* Main content - three columns */}
      <div className={`flex-1 flex min-h-0 overflow-hidden ${isAnimating ? 'animating-page' : ''}`}>
        {/* Left column: Sources & Navigation - slides in from left */}
        <div 
          className="animate-slideInLeft shrink-0 h-full overflow-hidden"
          style={{ borderRight: `1px solid ${isDark ? '#404040' : '#e5e5e5'}` }}
        >
          <SourcesPanel
            sources={sources}
            syntheses={syntheses}
            decisions={decisions}
            artifacts={artifacts}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onAddSource={() => setIsCreating("source")}
            onAddLink={() => setIsLinkModalOpen(true)}
            onAddSynthesis={() => setIsCreating("synthesis")}
            onAddDecision={() => setIsCreating("decision")}
            onAddArtifact={() => setIsCreating("artifact")}
            readOnly={readOnly}
            visibility={visibility}
          />
        </div>

        {/* Center column: Working Area - fades in */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden animate-fadeIn">
          <WorkingArea
            selectedItem={selectedItem}
            allItems={items}
            isCreating={readOnly ? null : isCreating}
            preSelectedSources={preSelectedSources}
            onCancelCreate={() => {
              setIsCreating(null);
              setPreSelectedSources([]);
            }}
            onCreateItem={handleAddItem}
            onUpdateItem={handleUpdateItem}
            onDeleteItem={handleDeleteItem}
            onSelectItem={setSelectedId}
            onSynthesizeSource={handleSynthesizeSource}
            onClearDiff={clearDiff}
            onRecordCalibrationDecision={recordCalibrationDecision}
            readOnly={readOnly}
            fieldbookId={projectId}
          />
        </div>

        {/* Right column: Lineage - slides in from right */}
        <div 
          className="animate-slideInRight shrink-0 h-full overflow-hidden"
          style={{ borderLeft: `1px solid ${isDark ? '#404040' : '#e5e5e5'}` }}
        >
          <LineagePanel
            selectedItem={selectedItem}
            derivedFrom={lineage.derivedFrom}
            informs={lineage.informs}
            externalDerivedFrom={lineage.externalDerivedFrom}
            removedDerivedFrom={lineage.removedDerivedFrom}
            onSelectItem={setSelectedId}
            parentFieldbookId={fieldbook?.parentId}
            visibility={visibility}
            onUpdateItem={handleUpdateItem}
            calibrationHistory={calibrationHistory}
            onNavigateToItem={(itemId) => setSelectedId(itemId)}
          />
        </div>
      </div>
      
      
      {/* Add Link Modal */}
      <AddLinkModal
        isOpen={isLinkModalOpen}
        onClose={() => setIsLinkModalOpen(false)}
        onSubmit={handleAddLink}
      />
      
      {/* Thematic Overlap Modal - shown when auto-synthesis detects overlap */}
      <ThematicOverlapModal
        isOpen={overlapModalOpen}
        sourceTitle={pendingSource?.title || ""}
        overlap={overlapDetection || { hasOverlap: false, existingSynthesis: null, explanation: null }}
        onCondense={handleCondense}
        onKeepSeparate={handleKeepSeparate}
        onCancel={handleOverlapCancel}
        onDontAskAgain={handleDontAskAgain}
        isLoading={isCondensing}
      />
      
      {/* Page transition animations */}
      <style jsx global>{`
        @keyframes slideInLeft {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        
        .animate-fadeInHeader {
          animation: fadeIn 0.2s ease-out forwards;
        }
        
        .animate-slideInLeft {
          animation: slideInLeft 0.3s ease-out forwards;
          display: flex;
          flex-direction: column;
        }
        
        .animate-slideInRight {
          animation: slideInRight 0.3s ease-out forwards;
          animation-delay: 0.05s;
          opacity: 0;
          display: flex;
          flex-direction: column;
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out forwards;
          animation-delay: 0.1s;
          opacity: 0;
        }
        
        /* Hide all scrollbars during page animation */
        .animating-page,
        .animating-page * {
          overflow: hidden !important;
          scrollbar-width: none !important;
        }
        .animating-page::-webkit-scrollbar,
        .animating-page *::-webkit-scrollbar {
          display: none !important;
        }
      `}</style>
    </div>
  );
}
