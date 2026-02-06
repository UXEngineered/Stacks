"use client";

/**
 * Custom React Flow node for uploaded files
 * Displays visual previews: image thumbnails, PDF badges, text snippets
 */

import { memo } from "react";
import { Handle, Position, type NodeProps } from "reactflow";

export interface FileNodeData {
  label: string;
  type: "file";
  fileName: string;
  fileType: string;
  fileSize: number;
  previewUrl?: string;
  textContent?: string; // For text/csv files
}

// Get a friendly file type label
function getFileTypeLabel(mimeType: string): string {
  if (mimeType.startsWith("image/")) return "Image";
  if (mimeType.startsWith("video/")) return "Video";
  if (mimeType.startsWith("audio/")) return "Audio";
  if (mimeType === "application/pdf") return "PDF";
  if (mimeType.includes("word") || mimeType.includes("document")) return "Document";
  if (mimeType.includes("sheet") || mimeType.includes("excel")) return "Spreadsheet";
  if (mimeType.includes("presentation") || mimeType.includes("powerpoint")) return "Presentation";
  if (mimeType.startsWith("text/") || mimeType === "application/json") return "Text";
  return "File";
}

// Format file size for display
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Check if file is an image
function isImage(mimeType: string): boolean {
  return mimeType.startsWith("image/");
}

// Check if file is a PDF
function isPdf(mimeType: string): boolean {
  return mimeType === "application/pdf";
}

// Check if file is text-based
function isText(mimeType: string): boolean {
  return mimeType.startsWith("text/") || 
         mimeType === "application/json" ||
         mimeType === "application/xml";
}

function FileNodeComponent({ data, selected }: NodeProps<FileNodeData>) {
  const fileTypeLabel = getFileTypeLabel(data.fileType);

  // Render preview based on file type
  const renderPreview = () => {
    // Image preview
    if (isImage(data.fileType) && data.previewUrl) {
      return (
        <div className="w-full h-20 bg-neutral-100 rounded-lg overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={data.previewUrl}
            alt={data.fileName}
            className="w-full h-full object-cover"
          />
        </div>
      );
    }

    // PDF preview
    if (isPdf(data.fileType)) {
      return (
        <div className="w-full h-20 bg-red-50/50 rounded-lg flex items-center justify-center">
          <div className="flex flex-col items-center gap-1">
            <div className="w-10 h-12 bg-white rounded-md shadow-sm shadow-red-500/10 flex items-center justify-center">
              <svg className="w-6 h-6 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zM6 20V4h7v5h5v11H6z"/>
                <path d="M8.5 13.5a1 1 0 011-1h1a1 1 0 011 1v3a1 1 0 01-1 1h-1a1 1 0 01-1-1v-3zm4 0a1 1 0 011-1h1a1 1 0 011 1v1.5a1 1 0 01-1 1h-.5v1a.5.5 0 01-1 0v-3.5zm-4.5 0v3h1v-3h-1zm5 0v1h.5v-1h-.5z"/>
              </svg>
            </div>
            <span className="text-[10px] font-medium text-red-500">PDF</span>
          </div>
        </div>
      );
    }

    // Text/CSV preview
    if (isText(data.fileType) && data.textContent) {
      const lines = data.textContent.split("\n").slice(0, 6);
      const preview = lines.join("\n");
      return (
        <div className="w-full h-20 bg-neutral-50/50 rounded-lg p-2 overflow-hidden">
          <pre className="text-[9px] text-neutral-500 font-mono leading-tight whitespace-pre-wrap break-all">
            {preview}
            {data.textContent.split("\n").length > 6 && "..."}
          </pre>
        </div>
      );
    }

    // Default file icon
    return (
      <div className="w-full h-16 bg-neutral-50/50 rounded-lg flex items-center justify-center">
        <svg className="w-8 h-8 text-neutral-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
      </div>
    );
  };

  return (
    <div
      className={`
        w-[180px] bg-white rounded-xl transition-all
        ${selected 
          ? "ring-2 ring-blue-500 shadow-lg shadow-blue-500/10" 
          : "shadow-sm shadow-neutral-900/5 hover:shadow-md hover:shadow-neutral-900/10"
        }
      `}
    >
      {/* Type header */}
      <div
        className={`
          px-3 py-1.5 text-xs font-medium rounded-t-xl flex items-center gap-1.5
          ${selected 
            ? "bg-blue-50 text-blue-700" 
            : "bg-neutral-50/80 text-neutral-500"
          }
        `}
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
        {fileTypeLabel}
      </div>

      {/* Preview area */}
      <div className="px-2 pt-2">
        {renderPreview()}
      </div>

      {/* File info */}
      <div className="px-3 py-2">
        <div className="text-xs font-medium text-neutral-900 truncate" title={data.fileName}>
          {data.fileName}
        </div>
        <div className="text-[10px] text-neutral-400 mt-0.5">
          {formatFileSize(data.fileSize)}
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

export const FileNode = memo(FileNodeComponent);
