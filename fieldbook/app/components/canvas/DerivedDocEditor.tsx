"use client";

/**
 * Editor/Viewer for derived documents
 * 
 * Features:
 * - Shows title (editable)
 * - Editable content area with autosave
 * - Shows "Derived from" list with source node links
 * - Shows the original prompt (read-only)
 * - Conflict detection and resolution
 * - AI regeneration with streaming
 */

import { useState, useEffect, useCallback, useRef } from "react";
import type { Node } from "reactflow";
import type { CanvasNodeData } from "./ProjectCanvas";
import type { DerivedDocNodeData } from "./nodes/DerivedDocNode";
import type { FieldbookDocNodeData } from "./nodes/FieldbookDocNode";
import type { SaveStatus } from "../../lib/storage/types";
import type { SourceStatus, ChangedSource } from "@/app/lib/document/version";
import { SaveStatusIndicator } from "../editor/SaveStatusIndicator";
import { ConflictResolutionModal } from "../editor/ConflictResolutionModal";
import { useAIGeneration, type SourceDocument } from "../../hooks/useAIGeneration";
import { getDocument } from "../../lib/document";

// =============================================================================
// AUTOSAVE CONFIGURATION
// =============================================================================

const AUTOSAVE_DELAY_MS = 1000; // 1 second idle before save

// =============================================================================
// SOURCE STATUS PANEL COMPONENT
// =============================================================================

interface SourceStatusPanelProps {
  sourceStatus: SourceStatus;
  onClose: () => void;
}

function SourceStatusPanel({ sourceStatus, onClose }: SourceStatusPanelProps) {
  const { changedSources, missingSources } = sourceStatus;
  
  return (
    <div className="bg-amber-50 border-b border-amber-100 px-5 py-3">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          <span className="text-sm font-medium text-amber-800">
            Source documents have changed
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-amber-500 hover:text-amber-700 hover:bg-amber-100 rounded transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      <p className="text-xs text-amber-700 mb-3">
        This document was derived from sources that have since been updated. 
        You may want to regenerate to incorporate the latest changes.
      </p>
      
      {/* Changed sources list */}
      {changedSources.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-xs font-medium text-amber-600 uppercase tracking-wide">
            Updated Sources
          </div>
          {changedSources.map((source) => (
            <div
              key={source.documentId}
              className="flex items-center justify-between bg-white/60 rounded-md px-3 py-2 text-xs"
            >
              <div className="flex items-center gap-2">
                <svg className="w-3.5 h-3.5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
                <span className="font-medium text-neutral-700">{source.title}</span>
              </div>
              <div className="flex items-center gap-1.5 text-amber-600">
                <span className="text-neutral-400">v{source.derivedVersionNumber}</span>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
                <span className="font-medium">v{source.currentVersionNumber}</span>
                <span className="text-amber-500 bg-amber-100 px-1.5 py-0.5 rounded text-[10px]">
                  +{source.versionsBehind}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Missing sources list */}
      {missingSources.length > 0 && (
        <div className="space-y-1.5 mt-3">
          <div className="text-xs font-medium text-red-600 uppercase tracking-wide">
            Missing Sources
          </div>
          {missingSources.map((docId) => (
            <div
              key={docId}
              className="flex items-center gap-2 bg-red-50/60 rounded-md px-3 py-2 text-xs text-red-700"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              <span>Document no longer exists</span>
              <span className="text-red-400 text-[10px] font-mono">{docId}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

interface DerivedDocEditorProps {
  node: Node<DerivedDocNodeData>;
  allNodes: Node<CanvasNodeData>[];
  onClose: () => void;
  onUpdate: (nodeId: string, updates: Partial<DerivedDocNodeData>) => void;
  onFocusNode: (nodeId: string) => void;
}

export function DerivedDocEditor({
  node,
  allNodes,
  onClose,
  onUpdate,
  onFocusNode,
}: DerivedDocEditorProps) {
  const [title, setTitle] = useState(node.data.title);
  const [content, setContent] = useState(node.data.content);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>({ state: "idle" });
  const [version, setVersion] = useState(1);
  const [showConflictModal, setShowConflictModal] = useState(false);
  
  // Source sync status state
  const [sourceStatus, setSourceStatus] = useState<SourceStatus | null>(null);
  const [sourceStatusExpanded, setSourceStatusExpanded] = useState(false);
  const [loadingSourceStatus, setLoadingSourceStatus] = useState(false);
  
  // Refs for autosave
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedRef = useRef({ title: node.data.title, content: node.data.content });
  const isMountedRef = useRef(true);

  // AI Generation hook
  const { generate, isGenerating, error: aiError, abort } = useAIGeneration({
    onChunk: (chunk) => {
      // Update content as chunks arrive
      setContent((prev) => prev + chunk);
    },
    onComplete: (fullText) => {
      // Final content is already set via onChunk, just trigger save
      setContent(fullText);
      lastSavedRef.current.content = fullText;
      onUpdate(node.id, { content: fullText });
    },
  });

  // Get source documents for AI generation
  const getSourceDocuments = useCallback((): SourceDocument[] => {
    const sourceNodes = allNodes.filter((n) => 
      node.data.sourceNodeIds.includes(n.id)
    );

    return sourceNodes.map((sourceNode) => {
      const data = sourceNode.data;
      let content = "";

      // Extract content based on node type
      if (data.type === "fieldbook-doc") {
        const fbData = data as FieldbookDocNodeData;
        const doc = getDocument(fbData.documentId);
        if (doc) {
          content = doc.blocks
            .map((block) => ("content" in block && block.content) ? block.content.map((span: { text: string }) => span.text).join("") : "")
            .join("\n\n");
        }
      } else if (data.type === "derived_doc") {
        content = (data as DerivedDocNodeData).content || "";
      } else if (data.type === "url" || data.type === "file" || data.type === "google-doc") {
        // For URLs/files/Google Docs, we'd need actual content extraction
        // For now, use a placeholder
        content = `[Content from ${data.label}]`;
      }

      return {
        title: data.label,
        content,
        type: data.type,
      };
    });
  }, [allNodes, node.data.sourceNodeIds]);

  // Handle regeneration
  const handleRegenerate = useCallback(async () => {
    const sources = getSourceDocuments();
    if (sources.length === 0) {
      return;
    }

    // Clear current content before regenerating
    setContent("");
    
    await generate(sources, node.data.prompt, "summary");
  }, [generate, getSourceDocuments, node.data.prompt]);
  
  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Auto-generate on mount if flagged
  useEffect(() => {
    if (node.data.shouldAutoGenerate && !isGenerating && content === "") {
      // Clear the flag after triggering
      onUpdate(node.id, { shouldAutoGenerate: false });
      handleRegenerate();
    }
  }, [node.data.shouldAutoGenerate, isGenerating, content, node.id, onUpdate, handleRegenerate]);
  
  // Fetch source status on mount (if sourceSet exists)
  useEffect(() => {
    async function fetchSourceStatus() {
      if (!node.data.sourceSet) return;
      
      setLoadingSourceStatus(true);
      try {
        const response = await fetch("/api/derived-docs/source-status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sourceSet: node.data.sourceSet }),
        });
        
        if (response.ok) {
          const status: SourceStatus = await response.json();
          if (isMountedRef.current) {
            setSourceStatus(status);
          }
        }
      } catch (error) {
        console.error("Failed to fetch source status:", error);
      } finally {
        if (isMountedRef.current) {
          setLoadingSourceStatus(false);
        }
      }
    }
    
    fetchSourceStatus();
  }, [node.data.sourceSet]);
  
  // Check if there are unsaved changes
  const hasChanges = title !== lastSavedRef.current.title || 
                     content !== lastSavedRef.current.content;
  
  /**
   * Perform the actual save operation
   */
  const performSave = useCallback(async (titleToSave: string, contentToSave: string) => {
    if (!isMountedRef.current) return;
    
    setSaveStatus({ state: "saving" });
    
    // Simulate async save (in real impl, this would go through DocumentStorage)
    try {
      // Small delay to show saving state
      await new Promise(resolve => setTimeout(resolve, 300));
      
      if (!isMountedRef.current) return;
      
      // Update the parent component
      onUpdate(node.id, { title: titleToSave, content: contentToSave });
      
      // Update our tracking
      lastSavedRef.current = { title: titleToSave, content: contentToSave };
      const newVersion = version + 1;
      setVersion(newVersion);
      
      setSaveStatus({ 
        state: "saved", 
        savedAt: Date.now(),
        version: newVersion,
      });
    } catch (error) {
      if (!isMountedRef.current) return;
      
      setSaveStatus({ 
        state: "error", 
        error: error instanceof Error ? error.message : "Save failed",
      });
    }
  }, [node.id, onUpdate, version]);
  
  /**
   * Schedule a debounced save
   */
  const scheduleSave = useCallback(() => {
    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    // Set pending status
    setSaveStatus({ state: "pending", changedAt: Date.now() });
    
    // Schedule new save
    debounceTimerRef.current = setTimeout(() => {
      performSave(title, content);
    }, AUTOSAVE_DELAY_MS);
  }, [performSave, title, content]);
  
  /**
   * Handle title change
   */
  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    scheduleSave();
  };
  
  /**
   * Handle content change
   */
  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    scheduleSave();
  };
  
  /**
   * Save on blur
   */
  const handleBlur = useCallback(() => {
    if (hasChanges && saveStatus.state === "pending") {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      performSave(title, content);
    }
  }, [hasChanges, saveStatus.state, performSave, title, content]);
  
  /**
   * Retry failed save
   */
  const handleRetry = useCallback(() => {
    performSave(title, content);
  }, [performSave, title, content]);
  
  /**
   * Handle conflict resolution - refresh to server version
   */
  const handleRefreshToLatest = useCallback(async () => {
    // In this simplified version, we just reset to the node's current data
    // In a real impl, this would fetch from DocumentStorage
    setTitle(node.data.title);
    setContent(node.data.content);
    lastSavedRef.current = { title: node.data.title, content: node.data.content };
    setSaveStatus({ state: "idle" });
  }, [node.data.title, node.data.content]);
  
  /**
   * Handle conflict resolution - fork current state
   */
  const handleFork = useCallback(async (newTitle: string) => {
    // In a real impl, this would create a new document via DocumentStorage
    // For now, we just save the current state with the new title
    await performSave(newTitle, content);
    return { documentId: `${node.id}-fork-${Date.now()}` };
  }, [performSave, content, node.id]);
  
  /**
   * Warn before closing with unsaved changes
   */
  const handleClose = useCallback(() => {
    if (hasChanges && saveStatus.state === "pending") {
      // Save immediately before closing
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      performSave(title, content);
    }
    onClose();
  }, [hasChanges, saveStatus.state, performSave, title, content, onClose]);

  // Get source nodes
  const sourceNodes = node.data.sourceNodeIds
    .map((id) => allNodes.find((n) => n.id === id))
    .filter((n): n is Node<CanvasNodeData> => n !== undefined);

  // Get display label for a node
  const getNodeLabel = (sourceNode: Node<CanvasNodeData>) => {
    return sourceNode.data.label || "Untitled";
  };

  // Get node type icon
  const getNodeTypeIcon = (sourceNode: Node<CanvasNodeData>) => {
    switch (sourceNode.data.type) {
      case "url":
        return (
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
          </svg>
        );
      case "file":
        return (
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
        );
      case "google-doc":
        return (
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 2l5 5h-5V4zM6 20V4h6v6h6v10H6z"/>
            <path d="M8 12h8v2H8zm0 4h8v2H8z"/>
          </svg>
        );
      case "derived_doc":
        return (
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
          </svg>
        );
      default:
        return (
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
        );
    }
  };

  const handleSourceClick = (sourceId: string) => {
    onFocusNode(sourceId);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={handleClose}
      />

      {/* Editor panel */}
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] mx-4 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-neutral-100 shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={handleClose}
              className="p-1.5 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded-md transition-colors"
              title="Close"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
            </button>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-md bg-amber-100 flex items-center justify-center">
                <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
              </div>
              <span className="text-xs text-neutral-400">Derived Document</span>
            </div>
            
            {/* Source sync status badge */}
            {sourceStatus?.status === "out_of_sync" && (
              <button
                onClick={() => setSourceStatusExpanded(!sourceStatusExpanded)}
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 rounded-full hover:bg-amber-100 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
                Sources changed
                <svg 
                  className={`w-3 h-3 transition-transform ${sourceStatusExpanded ? "rotate-180" : ""}`} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24" 
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            )}
          </div>
          
          {/* Save status indicator */}
          <SaveStatusIndicator
            status={saveStatus}
            version={version}
            onRetry={handleRetry}
            onResolveConflict={() => setShowConflictModal(true)}
          />
        </div>
        
        {/* Source sync status detail panel */}
        {sourceStatusExpanded && sourceStatus?.status === "out_of_sync" && (
          <SourceStatusPanel
            sourceStatus={sourceStatus}
            onClose={() => setSourceStatusExpanded(false)}
          />
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-5">
            {/* Title */}
            <input
              type="text"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              onBlur={handleBlur}
              placeholder="Untitled Document"
              className="w-full text-2xl font-semibold text-neutral-900 placeholder:text-neutral-300 border-0 focus:outline-none focus:ring-0 mb-4"
              disabled={isGenerating}
            />

            {/* AI Generation Status */}
            {isGenerating && (
              <div className="mb-4 flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="animate-spin">
                  <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                </div>
                <span className="text-sm text-amber-700">Generating content with AI...</span>
                <button
                  onClick={abort}
                  className="ml-auto text-xs text-amber-600 hover:text-amber-800 underline"
                >
                  Cancel
                </button>
              </div>
            )}

            {/* AI Error */}
            {aiError && (
              <div className="mb-4 flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
                <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
                <span className="text-sm text-red-700">{aiError}</span>
                <button
                  onClick={handleRegenerate}
                  className="ml-auto text-xs text-red-600 hover:text-red-800 underline"
                >
                  Retry
                </button>
              </div>
            )}

            {/* Content editor */}
            <textarea
              value={content}
              onChange={(e) => handleContentChange(e.target.value)}
              onBlur={handleBlur}
              placeholder={isGenerating ? "Generating..." : "Start writing..."}
              className={`w-full min-h-[300px] text-sm text-neutral-700 leading-relaxed placeholder:text-neutral-400 border-0 focus:outline-none focus:ring-0 resize-none ${isGenerating ? "bg-neutral-50" : ""}`}
              readOnly={isGenerating}
            />
          </div>
        </div>

        {/* Footer - Provenance info */}
        <div className="border-t border-neutral-100 bg-neutral-50 px-5 py-4 shrink-0">
          {/* Source nodes */}
          <div className="mb-3">
            <div className="text-xs font-medium text-neutral-500 mb-2">Derived from</div>
            <div className="flex flex-wrap gap-1.5">
              {sourceNodes.length > 0 ? (
                sourceNodes.map((sourceNode) => (
                  <button
                    key={sourceNode.id}
                    onClick={() => handleSourceClick(sourceNode.id)}
                    className="inline-flex items-center gap-1.5 px-2 py-1 text-xs bg-white border border-neutral-200 text-neutral-700 rounded-md hover:bg-neutral-100 hover:border-neutral-300 transition-colors"
                    title={`Go to ${getNodeLabel(sourceNode)}`}
                  >
                    <span className="text-neutral-400">{getNodeTypeIcon(sourceNode)}</span>
                    {getNodeLabel(sourceNode)}
                    <svg className="w-3 h-3 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                    </svg>
                  </button>
                ))
              ) : (
                <span className="text-xs text-neutral-400 italic">Source documents no longer available</span>
              )}
            </div>
          </div>

          {/* Original prompt & Regenerate */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-medium text-neutral-500 flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
                Generation Prompt
              </div>
              <button
                onClick={handleRegenerate}
                disabled={isGenerating || sourceNodes.length === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-100 hover:bg-amber-200 disabled:bg-neutral-100 disabled:text-neutral-400 disabled:cursor-not-allowed rounded-md transition-colors"
              >
                {isGenerating ? (
                  <>
                    <div className="animate-spin">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    </div>
                    Generating...
                  </>
                ) : (
                  <>
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                    </svg>
                    Regenerate with AI
                  </>
                )}
              </button>
            </div>
            <div className="text-xs text-neutral-600 bg-white border border-neutral-200 rounded-md px-3 py-2 max-h-20 overflow-y-auto">
              {node.data.prompt}
            </div>
          </div>
        </div>
      </div>
      
      {/* Conflict Resolution Modal */}
      {showConflictModal && saveStatus.state === "conflict" && (
        <ConflictResolutionModal
          conflict={saveStatus.conflict}
          currentTitle={title}
          onRefreshToLatest={async () => {
            await handleRefreshToLatest();
            setShowConflictModal(false);
          }}
          onFork={async (newTitle) => {
            const result = await handleFork(newTitle);
            setShowConflictModal(false);
            return result;
          }}
          onClose={() => setShowConflictModal(false)}
        />
      )}
    </div>
  );
}
