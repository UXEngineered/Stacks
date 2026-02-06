"use client";

/**
 * WorkingArea - Center column for viewing and editing items
 * 
 * All item types use editor-first experience with:
 * - Inline editable title
 * - Rich text editor
 * - Explicit save with dirty state tracking
 * - Derivation linking for non-source types
 */

import { useCallback } from "react";
import type { SpineItem, ItemType, SourceItem, SynthesisItem, DecisionItem, ArtifactItem } from "./types";
import { isSource, isSynthesis, isDecision, isArtifact } from "./types";
import { SourceEditor } from "./SourceEditor";
import { SynthesisEditor } from "./SynthesisEditor";
import { DecisionEditor } from "./DecisionEditor";
import { ArtifactEditor } from "./ArtifactEditor";
import { LinkSourceCard } from "./LinkSourceCard";

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

interface WorkingAreaProps {
  selectedItem: SpineItem | null;
  allItems: SpineItem[];
  isCreating: ItemType | null;
  /** Pre-selected source IDs when creating a synthesis */
  preSelectedSources?: string[];
  onCancelCreate: () => void;
  onCreateItem: (item: SpineItem) => void;
  onUpdateItem: (id: string, updates: Partial<SpineItem>) => void;
  onDeleteItem: (id: string) => void;
  onSelectItem: (id: string) => void;
  /** Called when user wants to synthesize a source */
  onSynthesizeSource?: (sourceId: string) => void;
  /** Called when user accepts a diff (clears lastDiff) */
  onClearDiff?: (id: string) => void;
  /** Called when user makes a calibration decision (ignore/change) */
  onRecordCalibrationDecision?: (params: RecordDecisionParams) => void;
}

export function WorkingArea({
  selectedItem,
  allItems,
  isCreating,
  preSelectedSources = [],
  onCancelCreate,
  onCreateItem,
  onUpdateItem,
  onDeleteItem,
  onSelectItem,
  onSynthesizeSource,
  onClearDiff,
  onRecordCalibrationDecision,
}: WorkingAreaProps) {
  // Editor-first creation for all types
  if (isCreating === "source") {
    return (
      <main className="flex-1 min-h-0 overflow-hidden">
        <SourceEditor
          source={null}
          isNew={true}
          onSave={(source) => onCreateItem(source)}
          onDiscard={onCancelCreate}
        />
      </main>
    );
  }

  if (isCreating === "synthesis") {
    return (
      <main className="flex-1 min-h-0 overflow-hidden">
        <SynthesisEditor
          synthesis={null}
          isNew={true}
          allItems={allItems}
          preSelectedSources={preSelectedSources}
          onSave={(synthesis) => onCreateItem(synthesis)}
          onDiscard={onCancelCreate}
        />
      </main>
    );
  }

  if (isCreating === "decision") {
    return (
      <main className="flex-1 min-h-0 overflow-hidden">
        <DecisionEditor
          decision={null}
          isNew={true}
          allItems={allItems}
          onSave={(decision) => onCreateItem(decision)}
          onDiscard={onCancelCreate}
        />
      </main>
    );
  }

  if (isCreating === "artifact") {
    return (
      <main className="flex-1 min-h-0 overflow-hidden">
        <ArtifactEditor
          artifact={null}
          isNew={true}
          allItems={allItems}
          onSave={(artifact) => onCreateItem(artifact)}
          onDiscard={onCancelCreate}
        />
      </main>
    );
  }

  // Show empty state if nothing selected
  if (!selectedItem) {
    return (
      <main className="flex-1 min-h-0 overflow-hidden flex items-center justify-center">
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Select an item or add a source to begin
        </p>
      </main>
    );
  }

  // Render appropriate view based on item type
  // All types use their editors which manage their own scrolling
  if (isSource(selectedItem)) {
    return (
      <main className="flex-1 min-h-0 overflow-hidden">
        <SourceView 
          item={selectedItem} 
          onUpdate={onUpdateItem} 
          onDelete={onDeleteItem}
          onSynthesize={onSynthesizeSource}
        />
      </main>
    );
  }

  if (isSynthesis(selectedItem)) {
    return (
      <main className="flex-1 min-h-0 overflow-hidden">
        <SynthesisView item={selectedItem} allItems={allItems} onUpdate={onUpdateItem} onDelete={onDeleteItem} onSelectItem={onSelectItem} onClearDiff={onClearDiff} onRecordCalibrationDecision={onRecordCalibrationDecision} />
      </main>
    );
  }

  if (isDecision(selectedItem)) {
    return (
      <main className="flex-1 min-h-0 overflow-hidden">
        <DecisionView item={selectedItem} allItems={allItems} onUpdate={onUpdateItem} onDelete={onDeleteItem} />
      </main>
    );
  }

  if (isArtifact(selectedItem)) {
    return (
      <main className="flex-1 min-h-0 overflow-hidden">
        <ArtifactView item={selectedItem} allItems={allItems} onUpdate={onUpdateItem} onDelete={onDeleteItem} onSelectItem={onSelectItem} onClearDiff={onClearDiff} onRecordCalibrationDecision={onRecordCalibrationDecision} />
      </main>
    );
  }

  return null;
}

// =============================================================================
// Item Views - Wrap editors for existing items
// =============================================================================

interface ItemViewProps<T extends SpineItem> {
  item: T;
  onUpdate: (id: string, updates: Partial<SpineItem>) => void;
  onDelete: (id: string) => void;
}

interface SourceViewProps extends ItemViewProps<SourceItem> {
  onSynthesize?: (sourceId: string) => void;
}

function SourceView({ item, onUpdate, onDelete, onSynthesize }: SourceViewProps) {
  // Handle save from SourceEditor - update the existing item
  const handleSave = useCallback((updatedSource: SourceItem) => {
    onUpdate(item.id, updatedSource);
  }, [item.id, onUpdate]);

  // External link sources use the reference card view (not an editor)
  if (item.kind === "external_link") {
    return (
      <LinkSourceCard
        key={item.id}
        source={item}
        onSave={handleSave}
        onDelete={onDelete ? (id) => onDelete(id) : undefined}
      />
    );
  }

  return (
    <SourceEditor
      key={item.id}
      source={item}
      isNew={false}
      onSave={handleSave}
      onDelete={onDelete}
      onSynthesize={onSynthesize}
    />
  );
}

interface SynthesisViewProps extends ItemViewProps<SynthesisItem> {
  allItems: SpineItem[];
  onSelectItem?: (itemId: string) => void;
  onClearDiff?: (id: string) => void;
  onRecordCalibrationDecision?: (params: RecordDecisionParams) => void;
}

function SynthesisView({ item, allItems, onUpdate, onDelete, onSelectItem, onClearDiff, onRecordCalibrationDecision }: SynthesisViewProps) {
  const handleSave = useCallback((updatedSynthesis: SynthesisItem) => {
    onUpdate(item.id, updatedSynthesis);
  }, [item.id, onUpdate]);

  return (
    <SynthesisEditor
      key={item.id}
      synthesis={item}
      isNew={false}
      allItems={allItems}
      onSave={handleSave}
      onDelete={onDelete}
      onSelectItem={onSelectItem}
      onClearDiff={onClearDiff}
      onRecordCalibrationDecision={onRecordCalibrationDecision}
    />
  );
}

interface DecisionViewProps extends ItemViewProps<DecisionItem> {
  allItems: SpineItem[];
}

function DecisionView({ item, allItems, onUpdate, onDelete }: DecisionViewProps) {
  const handleSave = useCallback((updatedDecision: DecisionItem) => {
    onUpdate(item.id, updatedDecision);
  }, [item.id, onUpdate]);

  return (
    <DecisionEditor
      key={item.id}
      decision={item}
      isNew={false}
      allItems={allItems}
      onSave={handleSave}
      onDelete={onDelete}
    />
  );
}

interface ArtifactViewProps extends ItemViewProps<ArtifactItem> {
  allItems: SpineItem[];
  onSelectItem?: (itemId: string) => void;
  onClearDiff?: (id: string) => void;
  onRecordCalibrationDecision?: (params: RecordDecisionParams) => void;
}

function ArtifactView({ item, allItems, onUpdate, onDelete, onSelectItem, onClearDiff, onRecordCalibrationDecision }: ArtifactViewProps) {
  const handleSave = useCallback((updatedArtifact: ArtifactItem) => {
    onUpdate(item.id, updatedArtifact);
  }, [item.id, onUpdate]);

  return (
    <ArtifactEditor
      key={item.id}
      artifact={item}
      isNew={false}
      allItems={allItems}
      onSave={handleSave}
      onDelete={onDelete}
      onSelectItem={onSelectItem}
      onClearDiff={onClearDiff}
      onRecordCalibrationDecision={onRecordCalibrationDecision}
    />
  );
}

