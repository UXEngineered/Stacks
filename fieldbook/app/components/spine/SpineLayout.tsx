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
import { CalibrationHistoryPanel } from "../CalibrationHistoryPanel";
import { useTheme } from "../ThemeProvider";
import { useNavContext } from "../NavContext";
import { useFieldbook } from "../../hooks/useFieldbook";
import type { SpineItem, ItemType, SourceItem, SynthesisItem, ArtifactItem } from "./types";

interface SpineLayoutProps {
  projectId: string;
}

export function SpineLayout({ projectId }: SpineLayoutProps) {
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

  // Update global nav with project context
  useEffect(() => {
    if (fieldbook) {
      setNavState({
        projectId,
        projectName: fieldbook.name,
        onProjectNameChange: handleProjectNameChange,
        onDeleteProject: handleDeleteFieldbook,
        isDeleteConfirm,
      });
    }
  }, [fieldbook, projectId, handleProjectNameChange, handleDeleteFieldbook, isDeleteConfirm, setNavState]);

  // Convert database items to SpineItems
  const items: SpineItem[] = useMemo(() => {
    if (!fieldbook) return [];
    
    const sourceItems: SourceItem[] = fieldbook.sources.map((s) => ({
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
    }));
    
    const synthesisItems: SynthesisItem[] = fieldbook.syntheses.map((s) => ({
      id: s.id,
      type: "synthesis" as const,
      title: s.title,
      content: s.content,
      sourceCount: s.derivedFrom?.length || 0,
      derivedFrom: s.derivedFrom || [],
      createdAt: s.createdAt,
      updatedAt: s.updatedAt || s.createdAt,
      // Reverberation fields
      contentTemplate: s.contentTemplate,
      contentRendered: s.contentRendered,
      lastRenderedAt: s.lastRenderedAt,
      recalcStatus: s.recalcStatus,
      lastDiff: s.lastDiff,
    }));
    
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
    }));
    
    return [...sourceItems, ...synthesisItems, ...artifactItems];
  }, [fieldbook]);

  const selectedItem = items.find((item) => item.id === selectedId) || null;

  // Get items by type
  const sources = items.filter((item) => item.type === "source") as SourceItem[];
  const syntheses = items.filter((item) => item.type === "synthesis") as SynthesisItem[];
  const decisions: SpineItem[] = []; // Not using decisions in this version
  const artifacts = items.filter((item) => item.type === "artifact") as ArtifactItem[];

  // Add a new item - persist to database
  const handleAddItem = useCallback(async (item: SpineItem) => {
    if (item.type === "source") {
      const sourceItem = item as SourceItem;
      const created = await createSource({
        title: sourceItem.title,
        type: sourceItem.kind === "document" ? "doc" : "note",
        content: sourceItem.content,
      });
      if (created) {
        setSelectedId(created.id);
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
        status: artifactItem.status,
      });
      if (created) {
        setSelectedId(created.id);
      }
    }
    setIsCreating(null);
    setPreSelectedSources([]);
  }, [createSource, createSynthesis, createArtifact]);

  // Update an item - persist to database
  const handleUpdateItem = useCallback(async (id: string, updates: Partial<SpineItem>) => {
    const item = items.find((i) => i.id === id);
    if (!item) return;
    
    if (item.type === "source") {
      const sourceUpdates = updates as Partial<SourceItem>;
      await updateSource(id, {
        title: sourceUpdates.title,
        content: sourceUpdates.content,
        type: sourceUpdates.kind === "document" ? "doc" : "note",
      });
    } else if (item.type === "synthesis") {
      const synthesisUpdates = updates as Partial<SynthesisItem>;
      await updateSynthesis(id, {
        title: synthesisUpdates.title,
        content: synthesisUpdates.content,
        derivedFrom: synthesisUpdates.derivedFrom,
      });
    } else if (item.type === "artifact") {
      const artifactUpdates = updates as Partial<ArtifactItem>;
      await updateArtifact(id, {
        title: artifactUpdates.title,
        content: artifactUpdates.content,
        type: artifactUpdates.artifactType as "decision-brief" | "opportunity-map" | "design-rationale" | "research-warrant" | "alignment-map" | "evidence-inventory" | "transition-playbook",
        status: artifactUpdates.status,
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
  const getLineage = useCallback(() => {
    if (!selectedItem) return { derivedFrom: [], informs: [] };
    
    const derivedFrom = items.filter((item) =>
      selectedItem.derivedFrom?.includes(item.id)
    );
    
    const informs = items.filter((item) =>
      item.derivedFrom?.includes(selectedItem.id)
    );
    
    return { derivedFrom, informs };
  }, [selectedItem, items]);

  const lineage = getLineage();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  
  // Show loading state
  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <span style={{ color: isDark ? '#737373' : '#a3a3a3' }}>Loading...</span>
      </div>
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
            onAddSynthesis={() => setIsCreating("synthesis")}
            onAddDecision={() => setIsCreating("decision")}
            onAddArtifact={() => setIsCreating("artifact")}
          />
        </div>

        {/* Center column: Working Area - fades in */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden animate-fadeIn">
          <WorkingArea
            selectedItem={selectedItem}
            allItems={items}
            isCreating={isCreating}
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
            onSelectItem={setSelectedId}
          />
        </div>
      </div>
      
      {/* Calibration History Panel - toggleable overlay */}
      <CalibrationHistoryPanel
        decisions={calibrationHistory}
        onNavigateToItem={(itemId, itemType) => {
          setSelectedId(itemId);
        }}
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
