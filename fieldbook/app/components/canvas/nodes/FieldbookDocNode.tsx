"use client";

/**
 * Native Fieldbook document node for the canvas
 * 
 * Displays a native Fieldbook document as a mini document preview.
 * Links to the document store for persistence and versioning.
 * Distinguished by a blue accent to differentiate from Google Docs.
 */

import { memo, useState, useCallback, useRef, useEffect } from "react";
import { Handle, Position, type NodeProps } from "reactflow";

export interface FieldbookDocNodeData {
  label: string;
  type: "fieldbook-doc";
  /** Document ID in the Fieldbook document store */
  documentId: string;
  /** Preview of first few lines of content */
  previewText?: string;
  /** Last updated timestamp */
  updatedAt?: string;
  /** Callback to update the document title */
  onTitleChange?: (documentId: string, newTitle: string) => void;
}

// Render preview lines for document
function DocumentPreview({ text }: { text?: string }) {
  if (!text) {
    // Skeleton preview
    return (
      <div className="w-full h-full p-3">
        {/* Title line */}
        <div className="h-2.5 bg-blue-100 rounded-sm w-2/3 mb-3" />
        {/* Paragraph lines */}
        <div className="space-y-1.5">
          <div className="h-1.5 bg-blue-50 rounded-sm w-full" />
          <div className="h-1.5 bg-blue-50 rounded-sm w-full" />
          <div className="h-1.5 bg-blue-50 rounded-sm w-4/5" />
        </div>
        {/* Second paragraph */}
        <div className="space-y-1.5 mt-3">
          <div className="h-1.5 bg-blue-50 rounded-sm w-full" />
          <div className="h-1.5 bg-blue-50 rounded-sm w-full" />
          <div className="h-1.5 bg-blue-50 rounded-sm w-3/4" />
        </div>
      </div>
    );
  }

  const lines = text.slice(0, 200).split("\n").slice(0, 8);
  
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

function FieldbookDocNodeComponent({ data, selected }: NodeProps<FieldbookDocNodeData>) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(data.label);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // Sync editValue when data.label changes externally
  useEffect(() => {
    if (!isEditing) {
      setEditValue(data.label);
    }
  }, [data.label, isEditing]);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
  }, []);

  const handleBlur = useCallback(() => {
    setIsEditing(false);
    if (editValue.trim() && editValue !== data.label) {
      data.onTitleChange?.(data.documentId, editValue.trim());
    } else {
      setEditValue(data.label); // Reset if empty
    }
  }, [editValue, data]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      inputRef.current?.blur();
    } else if (e.key === "Escape") {
      setEditValue(data.label);
      setIsEditing(false);
    }
  }, [data.label]);

  return (
    <div className="relative">
      {/* Title label - Figma frame style, positioned above */}
      <div 
        className={`
          absolute -top-5 left-0 flex items-center gap-1 text-[10px] font-medium max-w-[200px]
          ${selected ? "text-blue-600" : "text-neutral-500"}
        `}
        title={isEditing ? undefined : data.label}
        onDoubleClick={handleDoubleClick}
      >
        {/* Fieldbook logo indicator */}
        <svg 
          className={`w-3 h-3 flex-shrink-0 ${selected ? "text-blue-500" : "text-blue-400"}`} 
          viewBox="0 0 24 24" 
          fill="currentColor"
        >
          <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
        </svg>
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className="bg-white border border-blue-400 rounded px-1 py-0 text-[10px] font-medium text-neutral-900 focus:outline-none focus:ring-1 focus:ring-blue-500 min-w-[60px] max-w-[180px]"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="truncate cursor-text hover:text-blue-500">{data.label}</span>
        )}
      </div>

      {/* Document frame with blue accent */}
      <div
        className={`
          w-[160px] h-[120px] bg-blue-50/50 rounded-lg overflow-hidden transition-all
          ${selected 
            ? "ring-2 ring-blue-500 shadow-lg shadow-blue-500/20" 
            : "shadow-sm shadow-neutral-900/5 hover:shadow-md hover:shadow-blue-500/10"
          }
        `}
      >
        {/* Page inside frame */}
        <div className="w-full h-full bg-white m-0 rounded-sm overflow-hidden border-t-2 border-blue-400">
          <DocumentPreview text={data.previewText} />
        </div>
      </div>

      {/* Handles for connections */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-2 !h-2 !bg-blue-400 !border-2 !border-white"
      />
      <Handle
        type="target"
        position={Position.Top}
        className="!w-2 !h-2 !bg-blue-400 !border-2 !border-white"
      />
    </div>
  );
}

export const FieldbookDocNode = memo(FieldbookDocNodeComponent);
