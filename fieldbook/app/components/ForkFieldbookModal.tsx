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
import type { Node, Fieldbook } from "../lib/phase0/types";

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
  
  // Node selection state
  const [nodes, setNodes] = useState<Node[]>([]);
  const [selectedNodeIds, setSelectedNodeIds] = useState<Set<string>>(new Set());
  const [isLoadingNodes, setIsLoadingNodes] = useState(false);
  
  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setName("");
      setForkContext("");
      setSelectedNodeIds(new Set());
      setError(null);
      fetchNodes();
    }
  }, [isOpen, parentFieldbook.id]);

  // Fetch nodes from parent fieldbook
  const fetchNodes = useCallback(async () => {
    setIsLoadingNodes(true);
    try {
      const res = await fetch(`/api/v1/fieldbooks/${parentFieldbook.id}/nodes`);
      if (res.ok) {
        const data = await res.json();
        setNodes(data);
      }
    } catch (err) {
      console.error("Failed to fetch nodes:", err);
    } finally {
      setIsLoadingNodes(false);
    }
  }, [parentFieldbook.id]);

  // Toggle node selection
  const toggleNode = (nodeId: string) => {
    setSelectedNodeIds(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
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
      const res = await fetch(`/api/v1/fieldbooks/${parentFieldbook.id}/fork`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          forkContext: forkContext.trim() || undefined,
          anchorNodeIds: Array.from(selectedNodeIds),
        }),
      });

      const data = await res.json();

      if (res.ok) {
        onClose();
        // Navigate to the new fieldbook
        router.push(`/projects/${data.fieldbook.id}`);
      } else {
        setError(data.error || "Failed to create fieldbook");
      }
    } catch (err) {
      setError("Failed to create fieldbook");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  // Group nodes by type for display
  const sourceNodes = nodes.filter(n => n.nodeType === "source");
  const synthesisNodes = nodes.filter(n => n.nodeType === "synthesis");
  const artifactNodes = nodes.filter(n => n.nodeType === "artifact");

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

              {isLoadingNodes ? (
                <div
                  className="py-8 text-center text-xs"
                  style={{ color: isDark ? "#525252" : "#a3a3a3" }}
                >
                  Loading...
                </div>
              ) : nodes.length === 0 ? (
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
                  {artifactNodes.length > 0 && (
                    <NodeGroup
                      label="Artifacts"
                      nodes={artifactNodes}
                      selectedIds={selectedNodeIds}
                      onToggle={toggleNode}
                      isDark={isDark}
                    />
                  )}
                  
                  {/* Syntheses */}
                  {synthesisNodes.length > 0 && (
                    <NodeGroup
                      label="Syntheses"
                      nodes={synthesisNodes}
                      selectedIds={selectedNodeIds}
                      onToggle={toggleNode}
                      isDark={isDark}
                    />
                  )}
                  
                  {/* Sources */}
                  {sourceNodes.length > 0 && (
                    <NodeGroup
                      label="Sources"
                      nodes={sourceNodes}
                      selectedIds={selectedNodeIds}
                      onToggle={toggleNode}
                      isDark={isDark}
                    />
                  )}
                </div>
              )}

              {selectedNodeIds.size > 0 && (
                <p
                  className="mt-2 text-xs"
                  style={{ color: isDark ? "#a3a3a3" : "#525252" }}
                >
                  {selectedNodeIds.size} item{selectedNodeIds.size !== 1 ? "s" : ""} selected as anchors
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
// Node Group Component
// =============================================================================

interface NodeGroupProps {
  label: string;
  nodes: Node[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  isDark: boolean;
}

function NodeGroup({ label, nodes, selectedIds, onToggle, isDark }: NodeGroupProps) {
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
      {nodes.map((node) => (
        <label
          key={node.id}
          className="flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors"
          style={{
            backgroundColor: selectedIds.has(node.id)
              ? (isDark ? "#262626" : "#f0f9ff")
              : "transparent",
          }}
        >
          <input
            type="checkbox"
            checked={selectedIds.has(node.id)}
            onChange={() => onToggle(node.id)}
            className="w-4 h-4 accent-blue-500"
          />
          <div className="flex-1 min-w-0">
            <div
              className="text-sm truncate"
              style={{ color: isDark ? "#fafafa" : "#171717" }}
            >
              {node.title}
            </div>
            {node.subtype && (
              <div
                className="text-[10px]"
                style={{ color: isDark ? "#525252" : "#a3a3a3" }}
              >
                {node.subtype}
              </div>
            )}
          </div>
        </label>
      ))}
    </div>
  );
}
