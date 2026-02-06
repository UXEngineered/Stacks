"use client";

/**
 * Derived document node - created from multiple source nodes
 * Features:
 * - Collapsible prompt tab showing generation context
 * - Document frame preview similar to GoogleDocNode
 * - Shows content preview or skeleton
 * - Source sync status tracking
 */

import { memo, useState } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import type { SourceSet, SourceSyncStatus } from "@/app/lib/document/version";

/**
 * Snapshot of a source node at derivation time
 */
export interface SourceNodeSnapshot {
  /** The node ID on the canvas */
  nodeId: string;

  /** The document ID (if applicable) */
  documentId?: string;

  /** The version ID that was used when deriving */
  versionId?: string;

  /** The version number for display purposes */
  versionNumber?: number;

  /** Title/label of the source at the time of derivation */
  title: string;

  /** When this snapshot was captured */
  capturedAt: string;
}

export interface DerivedDocNodeData {
  label: string;
  type: "derived_doc";
  title: string;
  prompt: string;
  content: string;
  /** Legacy: node IDs on the canvas */
  sourceNodeIds: string[];
  /** New: source set with version tracking for sync status */
  sourceSet?: SourceSet;
  /** Cached sync status (computed on demand) */
  syncStatus?: SourceSyncStatus;
  /** Flag to trigger AI generation when editor opens */
  shouldAutoGenerate?: boolean;
  /** Whether the doc is currently recalibrating after new sources added */
  isRecalibrating?: boolean;
}

// Render skeleton lines for document preview
function DocumentSkeleton() {
  return (
    <div className="w-full h-full p-3">
      {/* Title line */}
      <div className="h-2.5 bg-neutral-200 rounded-sm w-2/3 mb-3" />
      {/* Paragraph lines */}
      <div className="space-y-1.5">
        <div className="h-1.5 bg-neutral-100 rounded-sm w-full" />
        <div className="h-1.5 bg-neutral-100 rounded-sm w-full" />
        <div className="h-1.5 bg-neutral-100 rounded-sm w-4/5" />
      </div>
      {/* Second paragraph */}
      <div className="space-y-1.5 mt-3">
        <div className="h-1.5 bg-neutral-100 rounded-sm w-full" />
        <div className="h-1.5 bg-neutral-100 rounded-sm w-full" />
        <div className="h-1.5 bg-neutral-100 rounded-sm w-3/4" />
      </div>
    </div>
  );
}

// Render actual content preview
function ContentPreview({ content }: { content: string }) {
  const lines = content.slice(0, 300).split("\n").slice(0, 10);
  
  return (
    <div className="w-full h-full p-3 overflow-hidden">
      {lines.map((line, i) => (
        <div 
          key={i} 
          className="text-[6px] leading-tight text-neutral-400 truncate mb-0.5"
        >
          {line || "\u00A0"}
        </div>
      ))}
    </div>
  );
}

function DerivedDocNodeComponent({ data, selected }: NodeProps<DerivedDocNodeData>) {
  const [promptExpanded, setPromptExpanded] = useState(false);
  
  // Truncate prompt for tab display
  const truncatedPrompt = data.prompt.length > 30 
    ? data.prompt.slice(0, 30) + "..." 
    : data.prompt;

  return (
    <div className="relative">
      {/* Recalibrating overlay */}
      {data.isRecalibrating && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-amber-50/90 rounded-lg border-2 border-amber-300 border-dashed">
          <div className="flex flex-col items-center gap-2 px-3">
            <div className="relative">
              <svg 
                className="w-8 h-8 text-amber-500 animate-pulse" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24" 
                strokeWidth={1.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
              <svg 
                className="w-8 h-8 text-amber-400 absolute inset-0 animate-spin" 
                style={{ animationDuration: '3s' }}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24" 
                strokeWidth={1}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
            </div>
            <div className="text-[10px] font-medium text-amber-700 text-center">
              Recalibrating...
            </div>
            <div className="text-[8px] text-amber-600 text-center">
              Incorporating new source
            </div>
          </div>
        </div>
      )}

      {/* Title label - Figma frame style, positioned above */}
      <div 
        className={`
          absolute -top-5 left-0 text-[10px] font-medium truncate max-w-[160px]
          ${data.isRecalibrating ? "text-amber-600" : selected ? "text-blue-600" : "text-neutral-500"}
        `}
        title={data.title}
      >
        {data.isRecalibrating ? "⟳ " : ""}{data.title}
      </div>

      {/* Prompt tab - positioned above the document frame */}
      <div 
        className={`
          absolute -top-5 right-0 flex items-center gap-1 px-1.5 py-0.5 
          rounded-t text-[8px] cursor-pointer transition-all
          ${promptExpanded 
            ? "bg-amber-100 text-amber-700" 
            : "bg-amber-50 text-amber-600 hover:bg-amber-100"
          }
        `}
        onClick={(e) => {
          e.stopPropagation();
          setPromptExpanded(!promptExpanded);
        }}
        title={promptExpanded ? "Collapse prompt" : "Show full prompt"}
      >
        <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
        </svg>
        <span className="max-w-[60px] truncate">{promptExpanded ? "Prompt" : truncatedPrompt}</span>
        <svg 
          className={`w-2 h-2 transition-transform ${promptExpanded ? "rotate-180" : ""}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24" 
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {/* Document frame */}
      <div
        className={`
          w-[160px] bg-neutral-50 rounded-lg overflow-hidden transition-all
          ${selected 
            ? "ring-2 ring-blue-500 shadow-lg shadow-blue-500/10" 
            : "shadow-sm shadow-neutral-900/5 hover:shadow-md hover:shadow-neutral-900/10"
          }
        `}
      >
        {/* Expanded prompt panel */}
        {promptExpanded && (
          <div 
            className="bg-amber-50 p-2 text-[9px] text-amber-800 border-b border-amber-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="font-medium mb-1 flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
              Generation Prompt
            </div>
            <div className="text-amber-700 leading-relaxed break-words max-h-20 overflow-y-auto">
              {data.prompt}
            </div>
            <div className="text-amber-500 mt-1.5 text-[8px]">
              From {data.sourceNodeIds.length} source{data.sourceNodeIds.length !== 1 ? "s" : ""}
            </div>
          </div>
        )}
        
        {/* Page inside frame */}
        <div 
          className={`
            w-full bg-white overflow-hidden
            ${promptExpanded ? "h-[80px]" : "h-[120px]"}
          `}
        >
          {data.content ? (
            <ContentPreview content={data.content} />
          ) : (
            <DocumentSkeleton />
          )}
        </div>
      </div>

      {/* Handles for connections */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-2 !h-2 !bg-neutral-400 !border-2 !border-white"
      />
      <Handle
        type="target"
        position={Position.Top}
        className="!w-2 !h-2 !bg-neutral-400 !border-2 !border-white"
      />
    </div>
  );
}

export const DerivedDocNode = memo(DerivedDocNodeComponent);
