"use client";

/**
 * ForkFieldbookModal - Create a new fieldbook from an existing one
 * 
 * Strategic Forking: Start a new phase of work with condensed inheritance.
 * - New fieldbook gets a parent reference (not a copy)
 * - Select specific "anchor" artifacts to bring forward
 * - Everything else stays in the parent - no duplication
 */

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "./ThemeProvider";

// Item type for display (unified from sources/syntheses/artifacts)
interface DisplayItem {
  id: string;
  title: string;
  type: "source" | "synthesis" | "artifact";
  subtype?: string;
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
        const displayItems: DisplayItem[] = [];
        
        if (fieldbook.sources) {
          for (const source of fieldbook.sources) {
            displayItems.push({
              id: source.id,
              title: source.title,
              type: "source",
              subtype: source.type,
            });
          }
        }
        
        if (fieldbook.syntheses) {
          for (const synthesis of fieldbook.syntheses) {
            displayItems.push({
              id: synthesis.id,
              title: synthesis.title,
              type: "synthesis",
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
        // If anchors were selected, copy them to the new fieldbook
        if (selectedItemIds.size > 0) {
          // Get the parent fieldbook data
          const parentRes = await fetch(`/api/db/fieldbooks/${parentFieldbook.id}`);
          const parentData = await parentRes.json();
          
          // Copy selected items - collect all promises
          const copyPromises: Promise<Response>[] = [];
          
          for (const itemId of selectedItemIds) {
            // Find which type the item is
            const source = parentData.sources?.find((s: { id: string }) => s.id === itemId);
            const synthesis = parentData.syntheses?.find((s: { id: string }) => s.id === itemId);
            const artifact = parentData.artifacts?.find((a: { id: string }) => a.id === itemId);
            
            if (source) {
              console.log("[Fork] Copying source:", source.title);
              copyPromises.push(
                fetch(`/api/db/fieldbooks/${newFieldbook.id}/sources`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    title: source.title,
                    type: source.type,
                    content: source.content,
                  }),
                })
              );
            } else if (synthesis) {
              console.log("[Fork] Copying synthesis:", synthesis.title);
              copyPromises.push(
                fetch(`/api/db/fieldbooks/${newFieldbook.id}/syntheses`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    title: synthesis.title,
                    content: synthesis.content,
                    derivedFrom: synthesis.derivedFrom || [],
                  }),
                })
              );
            } else if (artifact) {
              console.log("[Fork] Copying artifact:", artifact.title);
              copyPromises.push(
                fetch(`/api/db/fieldbooks/${newFieldbook.id}/artifacts`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    title: artifact.title,
                    type: artifact.type,
                    content: artifact.content,
                    informedBy: artifact.informedBy || [],
                    status: artifact.status || "draft",
                  }),
                })
              );
            }
          }
          
          // Wait for all copies to complete
          const results = await Promise.all(copyPromises);
          
          // Check for any failures
          for (const result of results) {
            if (!result.ok) {
              const errorData = await result.json();
              console.error("[Fork] Copy failed:", errorData);
            }
          }
          
          console.log("[Fork] Copied", results.length, "items to new fieldbook");
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
      {/* Backdrop */}
      <div
        className="absolute inset-0"
        style={{ backgroundColor: isDark ? "rgba(0,0,0,0.7)" : "rgba(0,0,0,0.3)" }}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-lg mx-4 max-h-[85vh] flex flex-col"
        style={{
          backgroundColor: isDark ? "#171717" : "#ffffff",
          border: `1px solid ${isDark ? "#404040" : "#e5e5e5"}`,
        }}
      >
        {/* Header */}
        <div
          className="px-5 py-4 flex items-center justify-between shrink-0"
          style={{ borderBottom: `1px solid ${isDark ? "#404040" : "#e5e5e5"}` }}
        >
          <div>
            <h2
              className="text-sm font-semibold"
              style={{ color: isDark ? "#fafafa" : "#171717" }}
            >
              Start New Phase
            </h2>
            <p
              className="text-xs mt-0.5"
              style={{ color: isDark ? "#737373" : "#a3a3a3" }}
            >
              from "{parentFieldbook.name}"
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1"
            style={{ color: isDark ? "#737373" : "#a3a3a3" }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleFork} className="flex flex-col overflow-hidden">
          <div className="p-5 overflow-y-auto">
            {/* Explanation */}
            <div
              className="mb-5 p-3 text-xs leading-relaxed"
              style={{
                backgroundColor: isDark ? "#262626" : "#f5f5f5",
                color: isDark ? "#a3a3a3" : "#525252",
              }}
            >
              <strong>Condensed inheritance:</strong> The new fieldbook starts fresh with a 
              reference to this one. Select key artifacts to carry forward as anchors — 
              everything else stays here, accessible but not duplicated.
            </div>

            {/* Name field */}
            <div className="mb-4">
              <label
                className="block text-[10px] font-semibold tracking-wider uppercase mb-2"
                style={{ color: isDark ? "#737373" : "#737373" }}
              >
                New Fieldbook Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Q2 Discovery, Phase 2 Implementation"
                className="w-full px-3 py-2 text-sm outline-none"
                style={{
                  backgroundColor: isDark ? "#262626" : "#f5f5f5",
                  color: isDark ? "#fafafa" : "#171717",
                  border: `1px solid ${isDark ? "#404040" : "#e5e5e5"}`,
                }}
                autoFocus
              />
            </div>

            {/* Context field */}
            <div className="mb-5">
              <label
                className="block text-[10px] font-semibold tracking-wider uppercase mb-2"
                style={{ color: isDark ? "#737373" : "#737373" }}
              >
                Context Summary <span className="font-normal">(optional)</span>
              </label>
              <textarea
                value={forkContext}
                onChange={(e) => setForkContext(e.target.value)}
                placeholder="Key decisions made, budget approved, constraints carried forward..."
                rows={2}
                className="w-full px-3 py-2 text-sm outline-none resize-none"
                style={{
                  backgroundColor: isDark ? "#262626" : "#f5f5f5",
                  color: isDark ? "#fafafa" : "#171717",
                  border: `1px solid ${isDark ? "#404040" : "#e5e5e5"}`,
                }}
              />
              <p
                className="mt-1 text-[10px]"
                style={{ color: isDark ? "#525252" : "#a3a3a3" }}
              >
                A brief summary of what's carrying forward. This is the condensed inheritance.
              </p>
            </div>

            {/* Anchor Selection */}
            <div>
              <label
                className="block text-[10px] font-semibold tracking-wider uppercase mb-2"
                style={{ color: isDark ? "#737373" : "#737373" }}
              >
                Select Anchor Artifacts <span className="font-normal">(optional)</span>
              </label>
              <p
                className="mb-3 text-xs"
                style={{ color: isDark ? "#525252" : "#a3a3a3" }}
              >
                Choose specific items to copy into the new fieldbook. Leave empty to start fresh.
              </p>

              {isLoadingItems ? (
                <div
                  className="py-8 text-center text-xs"
                  style={{ color: isDark ? "#525252" : "#a3a3a3" }}
                >
                  Loading...
                </div>
              ) : items.length === 0 ? (
                <div
                  className="py-8 text-center text-xs"
                  style={{ color: isDark ? "#525252" : "#a3a3a3" }}
                >
                  No items in this fieldbook yet
                </div>
              ) : (
                <div
                  className="border max-h-48 overflow-y-auto"
                  style={{ borderColor: isDark ? "#404040" : "#e5e5e5" }}
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
                  className="mt-2 text-xs"
                  style={{ color: isDark ? "#a3a3a3" : "#525252" }}
                >
                  {selectedItemIds.size} item{selectedItemIds.size !== 1 ? "s" : ""} selected as anchors
                </p>
              )}
            </div>

            {/* Error */}
            {error && (
              <p className="mt-4 text-xs text-red-500">{error}</p>
            )}
          </div>

          {/* Footer */}
          <div
            className="px-5 py-4 flex items-center justify-end gap-3 shrink-0"
            style={{ borderTop: `1px solid ${isDark ? "#404040" : "#e5e5e5"}` }}
          >
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm transition-colors"
              style={{ color: isDark ? "#a3a3a3" : "#525252" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
              style={{
                backgroundColor: isDark ? "#fafafa" : "#171717",
                color: isDark ? "#171717" : "#fafafa",
              }}
            >
              {isSubmitting ? "Creating..." : "Start New Phase"}
            </button>
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
        className="px-3 py-1.5 text-[10px] font-semibold tracking-wider uppercase sticky top-0"
        style={{
          backgroundColor: isDark ? "#262626" : "#f5f5f5",
          color: isDark ? "#737373" : "#737373",
        }}
      >
        {label}
      </div>
      {items.map((item) => (
        <label
          key={item.id}
          className="flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors"
          style={{
            backgroundColor: selectedIds.has(item.id)
              ? (isDark ? "#262626" : "#f0f9ff")
              : "transparent",
          }}
        >
          <input
            type="checkbox"
            checked={selectedIds.has(item.id)}
            onChange={() => onToggle(item.id)}
            className="w-4 h-4 accent-blue-500"
          />
          <div className="flex-1 min-w-0">
            <div
              className="text-sm truncate"
              style={{ color: isDark ? "#fafafa" : "#171717" }}
            >
              {item.title}
            </div>
            {item.subtype && (
              <div
                className="text-[10px]"
                style={{ color: isDark ? "#525252" : "#a3a3a3" }}
              >
                {item.subtype}
              </div>
            )}
          </div>
        </label>
      ))}
    </div>
  );
}
