"use client";

/**
 * Figma-style frame preview node for Google Docs/Sheets/Slides
 * Displays as a mini document thumbnail with title label
 * No badges, no tags - just a clean document preview
 */

import { memo } from "react";
import { Handle, Position, type NodeProps } from "reactflow";

export interface GoogleDocNodeData {
  label: string;
  type: "google-doc";
  url: string;
  docType: "docs" | "sheets" | "slides";
  previewText?: string;
}

// Render skeleton lines for document preview
function DocumentSkeleton({ docType }: { docType: "docs" | "sheets" | "slides" }) {
  if (docType === "sheets") {
    // Spreadsheet grid preview
    return (
      <div className="w-full h-full p-2">
        {/* Header row */}
        <div className="flex gap-1 mb-1.5">
          <div className="h-3 bg-neutral-200 rounded-sm flex-1" />
          <div className="h-3 bg-neutral-200 rounded-sm flex-1" />
          <div className="h-3 bg-neutral-200 rounded-sm flex-1" />
        </div>
        {/* Data rows */}
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex gap-1 mb-1">
            <div className="h-2.5 bg-neutral-100 rounded-sm flex-1" />
            <div className="h-2.5 bg-neutral-100 rounded-sm flex-1" />
            <div className="h-2.5 bg-neutral-100 rounded-sm flex-1" />
          </div>
        ))}
      </div>
    );
  }

  if (docType === "slides") {
    // Slide preview
    return (
      <div className="w-full h-full p-3 flex flex-col">
        {/* Title placeholder */}
        <div className="h-3 bg-neutral-200 rounded-sm w-3/4 mb-3" />
        {/* Content area */}
        <div className="flex-1 flex items-center justify-center">
          <div className="w-12 h-8 bg-neutral-100 rounded" />
        </div>
        {/* Bullet points */}
        <div className="space-y-1.5 mt-2">
          <div className="flex items-center gap-1.5">
            <div className="w-1 h-1 bg-neutral-300 rounded-full" />
            <div className="h-2 bg-neutral-100 rounded-sm flex-1" />
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-1 h-1 bg-neutral-300 rounded-full" />
            <div className="h-2 bg-neutral-100 rounded-sm w-4/5" />
          </div>
        </div>
      </div>
    );
  }

  // Default: Document preview (docs)
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
      {/* Third paragraph */}
      <div className="space-y-1.5 mt-3">
        <div className="h-1.5 bg-neutral-100 rounded-sm w-full" />
        <div className="h-1.5 bg-neutral-100 rounded-sm w-5/6" />
      </div>
    </div>
  );
}

// Render actual preview text as tiny lines
function TextPreview({ text, docType }: { text: string; docType: "docs" | "sheets" | "slides" }) {
  const lines = text.slice(0, 200).split("\n").slice(0, 8);
  
  if (docType === "sheets") {
    // For sheets, try to show as grid
    return (
      <div className="w-full h-full p-2 overflow-hidden">
        {lines.map((line, i) => (
          <div key={i} className="flex gap-1 mb-0.5">
            {line.split(/[,\t]/).slice(0, 3).map((cell, j) => (
              <div 
                key={j} 
                className="text-[6px] text-neutral-500 truncate flex-1 bg-neutral-50 px-0.5 rounded-sm"
              >
                {cell.trim() || "\u00A0"}
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  }

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

function GoogleDocNodeComponent({ data, selected }: NodeProps<GoogleDocNodeData>) {
  return (
    <div className="relative">
      {/* Title label - Figma frame style, positioned above */}
      <div 
        className={`
          absolute -top-5 left-0 text-[10px] font-medium truncate max-w-[160px]
          ${selected ? "text-blue-600" : "text-neutral-500"}
        `}
        title={data.label}
      >
        {data.label}
      </div>

      {/* Document frame */}
      <div
        className={`
          w-[160px] h-[120px] bg-neutral-50 rounded-lg overflow-hidden transition-all
          ${selected 
            ? "ring-2 ring-blue-500 shadow-lg shadow-blue-500/10" 
            : "shadow-sm shadow-neutral-900/5 hover:shadow-md hover:shadow-neutral-900/10"
          }
        `}
      >
        {/* Page inside frame */}
        <div className="w-full h-full bg-white m-0 rounded-sm overflow-hidden">
          {data.previewText ? (
            <TextPreview text={data.previewText} docType={data.docType} />
          ) : (
            <DocumentSkeleton docType={data.docType} />
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

export const GoogleDocNode = memo(GoogleDocNodeComponent);
