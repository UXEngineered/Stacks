"use client";

/**
 * ForkFieldbookModal - Create a new fieldbook from an existing one
 * 
 * Strategic Forking: Start a new phase of work with condensed inheritance.
 * - New fieldbook gets a parent reference (not a copy)
 * - Select specific "anchor" artifacts to bring forward
 * - Everything else stays in the parent - no duplication
 * 
 * External Upstream Lineage:
 * - When copying items, detect missing upstream nodes (derivedFrom/informedBy)
 * - Create lineage-only references for those upstream nodes
 * - These appear in lineage views but NOT in the left rail
 */

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "./ThemeProvider";
import { Button } from "./Button";
import type { LineageReference, LineageAvailability } from "../lib/db/types";

// Item type for display (unified from sources/syntheses/artifacts)
interface DisplayItem {
  id: string;
  title: string;
  type: "source" | "synthesis" | "artifact";
  subtype?: string;
  // Upstream references for lineage tracking
  derivedFrom?: string[];
  informedBy?: string[];
}

interface ForkFieldbookModalProps {
  parentFieldbook: {
    id: string;
    name: string;
  };
  isOpen: boolean;
  onClose: () => void;
}

export function ForkFieldbookModal({
  parentFieldbook,
  isOpen,
  onClose,
}: ForkFieldbookModalProps) {
  const router = useRouter();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  // Form state
  const [name, setName] = useState("");
  const [forkContext, setForkContext] = useState("");
  
  // Item selection state (unified from sources/syntheses/artifacts)
  const [items, setItems] = useState<DisplayItem[]>([]);
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  
  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setName("");
      setForkContext("");
      setSelectedItemIds(new Set());
      setError(null);
      fetchItems();
    }
  }, [isOpen, parentFieldbook.id]);

  // Fetch items from parent fieldbook (using existing API)
  const fetchItems = useCallback(async () => {
    setIsLoadingItems(true);
    try {
      const res = await fetch(`/api/db/fieldbooks/${parentFieldbook.id}`);
      if (res.ok) {
        const fieldbook = await res.json();
        
        // Transform sources, syntheses, artifacts into unified display items
        // Include derivedFrom/informedBy for lineage reference tracking
        const displayItems: DisplayItem[] = [];
        
        if (fieldbook.sources) {
          for (const source of fieldbook.sources) {
            displayItems.push({
              id: source.id,
              title: source.title,
              type: "source",
              subtype: source.type,
              // Sources don't have derivedFrom
            });
          }
        }
        
        if (fieldbook.syntheses) {
          for (const synthesis of fieldbook.syntheses) {
            displayItems.push({
              id: synthesis.id,
              title: synthesis.title,
              type: "synthesis",
              derivedFrom: synthesis.derivedFrom || [],
            });
          }
        }
        
        if (fieldbook.artifacts) {
          for (const artifact of fieldbook.artifacts) {
            displayItems.push({
              id: artifact.id,
              title: artifact.title,
              type: "artifact",
              subtype: artifact.type,
              informedBy: artifact.informedBy || [],
            });
          }
        }
        
        setItems(displayItems);
      }
    } catch (err) {
      console.error("Failed to fetch fieldbook:", err);
    } finally {
      setIsLoadingItems(false);
    }
  }, [parentFieldbook.id]);

  // Toggle item selection
  const toggleItem = (itemId: string) => {
    setSelectedItemIds(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  // Handle fork submission
  const handleFork = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      setError("Please provide a name for the new fieldbook");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Create the forked fieldbook using the old API
      const res = await fetch(`/api/db/fieldbooks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: forkContext.trim() || undefined,
          // Store parent reference in a way the old system understands
          parentId: parentFieldbook.id,
          forkContext: forkContext.trim() || undefined,
        }),
      });

      const newFieldbook = await res.json();

      if (res.ok) {
        // Track lineage references for missing upstream nodes
        const lineageReferences: LineageReference[] = [];
        
        // If anchors were selected, copy them to the new fieldbook
        if (selectedItemIds.size > 0) {
          // Get the parent fieldbook data
          const parentRes = await fetch(`/api/db/fieldbooks/${parentFieldbook.id}`);
          const parentData = await parentRes.json();
          
          // Build a map of all items in parent for quick lookup
          const parentItemsMap = new Map<string, { title: string; type: "source" | "synthesis" | "artifact"; subtype?: string }>();
          
          for (const source of parentData.sources || []) {
            parentItemsMap.set(source.id, { title: source.title, type: "source", subtype: source.type });
          }
          for (const synthesis of parentData.syntheses || []) {
            parentItemsMap.set(synthesis.id, { title: synthesis.title, type: "synthesis" });
          }
          for (const artifact of parentData.artifacts || []) {
            parentItemsMap.set(artifact.id, { title: artifact.title, type: "artifact", subtype: artifact.type });
          }
          
          // Track which items are being copied (these become local)
          const copiedItemIds = new Set<string>();
          
          // Collect all upstream references from selected items (including transitive)
          const allUpstreamRefs = new Set<string>();
          
          // Helper to collect refs recursively
          const collectUpstreamRefs = (itemId: string) => {
            const synthesis = parentData.syntheses?.find((s: { id: string }) => s.id === itemId);
            const artifact = parentData.artifacts?.find((a: { id: string }) => a.id === itemId);
            
            if (synthesis?.derivedFrom) {
              for (const refId of synthesis.derivedFrom) {
                if (!allUpstreamRefs.has(refId)) {
                  allUpstreamRefs.add(refId);
                  collectUpstreamRefs(refId); // Recursively collect
                }
              }
            }
            if (artifact?.informedBy) {
              for (const refId of artifact.informedBy) {
                if (!allUpstreamRefs.has(refId)) {
                  allUpstreamRefs.add(refId);
                  collectUpstreamRefs(refId); // Recursively collect
                }
              }
            }
          };
          
          // Collect from all selected items
          for (const itemId of selectedItemIds) {
            collectUpstreamRefs(itemId);
          }
          
          console.log("[Fork] All upstream refs:", Array.from(allUpstreamRefs));
          
          // Copy selected items SEQUENTIALLY to avoid race condition in JSON file writes
          let copiedCount = 0;
          
          for (const itemId of selectedItemIds) {
            // Find which type the item is
            const source = parentData.sources?.find((s: { id: string }) => s.id === itemId);
            const synthesis = parentData.syntheses?.find((s: { id: string }) => s.id === itemId);
            const artifact = parentData.artifacts?.find((a: { id: string }) => a.id === itemId);
            
            let result: Response | null = null;
            
            if (source) {
              // Sources use: content (may also have contentTemplate/contentRendered)
              const sourceContent = source.contentRendered || source.content || source.contentTemplate || "";
              console.log("[Fork] Copying source:", source.title, "content length:", sourceContent.length);
              result = await fetch(`/api/db/fieldbooks/${newFieldbook.id}/sources`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  title: source.title,
                  type: source.type,
                  content: sourceContent,
                }),
              });
              if (result?.ok) copiedItemIds.add(itemId);
            } else if (synthesis) {
              // Syntheses may use contentTemplate/contentRendered instead of content
              const synthesisContent = synthesis.contentRendered || synthesis.content || synthesis.contentTemplate || "";
              // PRESERVE derivedFrom references - they link to lineage references for external items
              const derivedFrom = synthesis.derivedFrom || [];
              console.log("[Fork] Copying synthesis:", synthesis.title, "content length:", synthesisContent.length, "derivedFrom:", derivedFrom);
              result = await fetch(`/api/db/fieldbooks/${newFieldbook.id}/syntheses`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  title: synthesis.title,
                  content: synthesisContent,
                  derivedFrom: derivedFrom, // Keep original refs for lineage tracking
                }),
              });
              if (result?.ok) copiedItemIds.add(itemId);
            } else if (artifact) {
              // Artifacts may use contentTemplate/contentRendered instead of content
              const artifactContent = artifact.contentRendered || artifact.content || artifact.contentTemplate || "";
              // PRESERVE informedBy references - they link to lineage references for external items
              const informedBy = artifact.informedBy || [];
              console.log("[Fork] Copying artifact:", artifact.title, "content length:", artifactContent.length, "informedBy:", informedBy);
              result = await fetch(`/api/db/fieldbooks/${newFieldbook.id}/artifacts`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  title: artifact.title,
                  type: artifact.type,
                  content: artifactContent,
                  informedBy: informedBy, // Keep original refs for lineage tracking
                  status: artifact.status || "draft",
                }),
              });
              if (result?.ok) copiedItemIds.add(itemId);
            }
            
            // Check result
            if (result && !result.ok) {
              const errorData = await result.json();
              console.error("[Fork] Copy failed:", errorData);
            } else if (result) {
              copiedCount++;
            }
          }
          
          console.log("[Fork] Copied", copiedCount, "items to new fieldbook");
          
          // Create lineage references for upstream items that were NOT copied
          for (const upstreamId of allUpstreamRefs) {
            if (!copiedItemIds.has(upstreamId)) {
              const upstreamItem = parentItemsMap.get(upstreamId);
              if (upstreamItem) {
                lineageReferences.push({
                  id: `lineage-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                  originNodeId: upstreamId,
                  originFieldbookId: parentFieldbook.id,
                  originFieldbookLabel: parentFieldbook.name,
                  title: upstreamItem.title,
                  type: upstreamItem.type,
                  subtype: upstreamItem.subtype,
                  availability: "AVAILABLE" as LineageAvailability, // Assume available since we just forked
                  createdAt: new Date().toISOString(),
                });
                console.log("[Fork] Created lineage reference for:", upstreamItem.title);
              }
            }
          }
        }
        
        // If we have lineage references, update the fieldbook to include them
        if (lineageReferences.length > 0) {
          console.log("[Fork] Saving", lineageReferences.length, "lineage references");
          await fetch(`/api/db/fieldbooks/${newFieldbook.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              lineageReferences,
            }),
          });
        }

        onClose();
        // Navigate to the new fieldbook
        router.push(`/projects/${newFieldbook.id}`);
      } else {
        setError(newFieldbook.error || "Failed to create fieldbook");
      }
    } catch (err) {
      setError("Failed to create fieldbook");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  // Group items by type for display
  const sourceItems = items.filter(i => i.type === "source");
  const synthesisItems = items.filter(i => i.type === "synthesis");
  const artifactItems = items.filter(i => i.type === "artifact");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop - subtle blur */}
      <div
        className="absolute inset-0 cursor-pointer"
        style={{ 
          backgroundColor: isDark ? "rgba(0,0,0,0.4)" : "rgba(0,0,0,0.2)",
          backdropFilter: "blur(4px)",
          WebkitBackdropFilter: "blur(4px)",
        }}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-lg mx-4 max-h-[85vh] flex flex-col rounded-lg"
        style={{
          backgroundColor: isDark ? "#1c1c1c" : "#ffffff",
          border: `1px solid ${isDark ? "#333333" : "#e5e5e5"}`,
          boxShadow: isDark 
            ? "0 25px 50px -12px rgba(0, 0, 0, 0.7)" 
            : "0 25px 50px -12px rgba(0, 0, 0, 0.2)",
          transformOrigin: 'center',
          animation: 'modalIn 150ms cubic-bezier(0.16, 1, 0.3, 1) forwards',
        }}
      >
        <style>{`
          @keyframes modalIn {
            from {
              opacity: 0;
              transform: scale(0.95);
            }
            to {
              opacity: 1;
              transform: scale(1);
            }
          }
        `}</style>
        
        {/* Header */}
        <div
          className="px-5 py-4 flex items-center justify-between shrink-0"
          style={{ borderBottom: `1px solid ${isDark ? "#333333" : "#e5e5e5"}` }}
        >
          <h2
            className="text-sm font-medium"
            style={{ color: isDark ? "#fafafa" : "#171717" }}
          >
            Start new volume from "{parentFieldbook.name}"
          </h2>
          <Button
            variant="tertiary"
            onClick={onClose}
            style={{ padding: '4px' }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </Button>
        </div>

        {/* Content */}
        <form onSubmit={handleFork} className="flex flex-col overflow-hidden">
          <div className="p-5 overflow-y-auto">
            {/* Explanation */}
            <p
              className="mb-5 text-[12.5px]"
              style={{
                color: isDark ? "#737373" : "#525252",
                lineHeight: '1.5',
              }}
            >
              The new volume starts fresh with a reference to this one. Select artifacts to carry forward — everything else stays here.
            </p>

            {/* Name field */}
            <div className="mb-6">
              <label
                className="block text-[10px] font-medium tracking-wider uppercase mb-2"
                style={{ color: isDark ? "#d4d4d4" : "#525252" }}
              >
                Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Q2 Discovery, Volume 2"
                className="w-full px-3 py-2 text-[12px] outline-none rounded-md transition-colors"
                style={{
                  backgroundColor: isDark ? "#262626" : "#f5f5f5",
                  color: isDark ? "#fafafa" : "#171717",
                  border: `1px solid ${isDark ? "#333333" : "#e5e5e5"}`,
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = isDark ? "#525252" : "#a3a3a3";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = isDark ? "#333333" : "#e5e5e5";
                }}
                autoFocus
              />
            </div>

            {/* Context field */}
            <div className="mb-5">
              <label
                className="block text-[10px] font-medium tracking-wider uppercase mb-2"
                style={{ color: isDark ? "#d4d4d4" : "#525252" }}
              >
                Context <span className="font-normal">(optional)</span>
              </label>
              <textarea
                value={forkContext}
                onChange={(e) => setForkContext(e.target.value)}
                placeholder="Key decisions, constraints, what's carrying forward..."
                rows={2}
                className="w-full px-3 py-2 text-[12px] outline-none resize-none rounded-md transition-colors"
                style={{
                  backgroundColor: isDark ? "#262626" : "#f5f5f5",
                  color: isDark ? "#fafafa" : "#171717",
                  border: `1px solid ${isDark ? "#333333" : "#e5e5e5"}`,
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = isDark ? "#525252" : "#a3a3a3";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = isDark ? "#333333" : "#e5e5e5";
                }}
              />
            </div>

            {/* Anchor Selection */}
            <div>
              <label
                className="block text-[10px] font-medium tracking-wider uppercase mb-2"
                style={{ color: isDark ? "#d4d4d4" : "#525252" }}
              >
                Carry Forward <span className="font-normal">(optional)</span>
              </label>

              {isLoadingItems ? (
                <div
                  className="py-8 text-center text-[11px]"
                  style={{ color: isDark ? "#525252" : "#a3a3a3" }}
                >
                  Loading...
                </div>
              ) : items.length === 0 ? (
                <div
                  className="py-8 text-center text-[11px]"
                  style={{ color: isDark ? "#525252" : "#a3a3a3" }}
                >
                  No items in this fieldbook yet
                </div>
              ) : (
                <div
                  className="border rounded-md max-h-48 overflow-y-auto"
                  style={{ borderColor: isDark ? "#333333" : "#e5e5e5" }}
                >
                  {/* Artifacts */}
                  {artifactItems.length > 0 && (
                    <ItemGroup
                      label="Artifacts"
                      items={artifactItems}
                      selectedIds={selectedItemIds}
                      onToggle={toggleItem}
                      isDark={isDark}
                    />
                  )}
                  
                  {/* Syntheses */}
                  {synthesisItems.length > 0 && (
                    <ItemGroup
                      label="Syntheses"
                      items={synthesisItems}
                      selectedIds={selectedItemIds}
                      onToggle={toggleItem}
                      isDark={isDark}
                    />
                  )}
                  
                  {/* Sources */}
                  {sourceItems.length > 0 && (
                    <ItemGroup
                      label="Sources"
                      items={sourceItems}
                      selectedIds={selectedItemIds}
                      onToggle={toggleItem}
                      isDark={isDark}
                    />
                  )}
                </div>
              )}

              {selectedItemIds.size > 0 && (
                <p
                  className="mt-2 text-[11px]"
                  style={{ color: isDark ? "#a3a3a3" : "#525252" }}
                >
                  {selectedItemIds.size} item{selectedItemIds.size !== 1 ? "s" : ""} selected
                </p>
              )}
            </div>

            {/* Error */}
            {error && (
              <p className="mt-4 text-[11px] text-red-500">{error}</p>
            )}
          </div>

          {/* Footer */}
          <div
            className="px-5 py-4 flex items-center justify-end gap-2 shrink-0"
            style={{ borderTop: `1px solid ${isDark ? "#333333" : "#e5e5e5"}` }}
          >
            <Button
              type="button"
              variant="tertiary"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting || !name.trim()}
            >
              {isSubmitting ? "Creating..." : "Start New Volume"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// =============================================================================
// Item Group Component
// =============================================================================

interface ItemGroupProps {
  label: string;
  items: DisplayItem[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  isDark: boolean;
}

function ItemGroup({ label, items, selectedIds, onToggle, isDark }: ItemGroupProps) {
  return (
    <div>
      <div
        className="px-3 py-1.5 text-[10px] font-medium tracking-wider uppercase sticky top-0"
        style={{
          backgroundColor: isDark ? "#262626" : "#f5f5f5",
          color: isDark ? "#737373" : "#737373",
        }}
      >
        {label}
      </div>
      {items.map((item) => {
        const isSelected = selectedIds.has(item.id);
        return (
          <label
            key={item.id}
            className="flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors"
            style={{
              backgroundColor: isSelected
                ? (isDark ? "#262626" : "#f5f5f5")
                : "transparent",
            }}
          >
            <div 
              className="w-4 h-4 rounded-[4px] flex items-center justify-center shrink-0 transition-colors"
              style={{ 
                backgroundColor: isSelected 
                  ? (isDark ? "#fafafa" : "#171717") 
                  : "transparent",
                border: `1.5px solid ${isSelected 
                  ? (isDark ? "#fafafa" : "#171717") 
                  : (isDark ? "#525252" : "#d4d4d4")}`,
              }}
            >
              {isSelected && (
                <svg 
                  className="w-2.5 h-2.5" 
                  fill="none" 
                  stroke={isDark ? "#171717" : "#ffffff"} 
                  viewBox="0 0 24 24" 
                  strokeWidth={3}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              )}
            </div>
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => onToggle(item.id)}
              className="sr-only"
            />
            <div className="flex-1 min-w-0">
              <div
                className="text-[12px] truncate"
                style={{ color: isDark ? "#fafafa" : "#171717" }}
              >
                {item.title}
              </div>
              {item.subtype && (
                <div
                  className="text-[11px]"
                  style={{ color: isDark ? "#525252" : "#a3a3a3" }}
                >
                  {item.subtype}
                </div>
              )}
            </div>
          </label>
        );
      })}
    </div>
  );
}
