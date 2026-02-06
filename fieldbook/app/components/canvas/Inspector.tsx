"use client";

/**
 * Inspector panel for viewing selected node details
 * Slides in from the right when a node is selected
 * Supports URL and File node types with in-app viewer
 */

import type { Node } from "reactflow";
import type { CanvasNodeData } from "./ProjectCanvas";
import type { UrlNodeData } from "./nodes/UrlNode";
import type { FileNodeData } from "./nodes/FileNode";
import type { GoogleDocNodeData } from "./nodes/GoogleDocNode";
import type { DerivedDocNodeData } from "./nodes/DerivedDocNode";
import type { FieldbookDocNodeData } from "./nodes/FieldbookDocNode";

interface InspectorProps {
  node: Node<CanvasNodeData> | null;
  onClose: () => void;
  onOpenViewer?: (url: string, title: string) => void;
  onOpenFileViewer?: (data: FileNodeData) => void;
  onDeleteNode?: (nodeId: string) => void;
  onOpenDerivedDocEditor?: (node: Node<DerivedDocNodeData>) => void;
  onOpenFieldbookDocEditor?: (node: Node<FieldbookDocNodeData>) => void;
}

// Type guards
function isUrlNode(data: CanvasNodeData): data is UrlNodeData {
  return data.type === "url";
}

function isFileNode(data: CanvasNodeData): data is FileNodeData {
  return data.type === "file";
}

function isGoogleDocNode(data: CanvasNodeData): data is GoogleDocNodeData {
  return data.type === "google-doc";
}

function isDerivedDocNode(data: CanvasNodeData): data is DerivedDocNodeData {
  return data.type === "derived_doc";
}

function isFieldbookDocNode(data: CanvasNodeData): data is FieldbookDocNodeData {
  return data.type === "fieldbook-doc";
}

// Format file size for display
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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

// Detect Google service from URL
function detectGoogleService(url: string): { name: string; isEditable: boolean } | null {
  const urlLower = url.toLowerCase();
  if (urlLower.includes("docs.google.com/document")) {
    return { name: "Google Docs", isEditable: true };
  }
  if (urlLower.includes("docs.google.com/spreadsheets")) {
    return { name: "Google Sheets", isEditable: true };
  }
  if (urlLower.includes("docs.google.com/presentation")) {
    return { name: "Google Slides", isEditable: true };
  }
  if (urlLower.includes("drive.google.com")) {
    return { name: "Google Drive", isEditable: false };
  }
  if (urlLower.includes("docs.google.com/forms")) {
    return { name: "Google Forms", isEditable: false };
  }
  return null;
}

// Get domain from URL
function getDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace("www.", "");
  } catch {
    return url;
  }
}

export function Inspector({ node, onClose, onOpenViewer, onOpenFileViewer, onDeleteNode, onOpenDerivedDocEditor, onOpenFieldbookDocEditor }: InspectorProps) {
  if (!node) return null;

  const { data } = node;
  const googleService = isUrlNode(data) ? detectGoogleService(data.url) : null;

  return (
    <div className="w-80 h-full bg-white border-l border-neutral-200 flex flex-col shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200">
        <h3 className="text-sm font-semibold text-neutral-900 truncate">
          {data.label}
        </h3>
        <button
          onClick={onClose}
          className="p-1 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded transition-colors"
          title="Close inspector"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* Type badge */}
        <div>
          <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
            Type
          </span>
          <div className="mt-1 flex items-center gap-2">
            <span
              className={`
                inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded-full
                ${isFieldbookDocNode(data)
                  ? "bg-blue-100 text-blue-700"
                  : isDerivedDocNode(data)
                    ? "bg-amber-100 text-amber-700"
                    : isGoogleDocNode(data)
                      ? "bg-blue-100 text-blue-700"
                      : isUrlNode(data)
                        ? "bg-blue-100 text-blue-700"
                        : "bg-amber-100 text-amber-700"
                }
              `}
            >
              {isFieldbookDocNode(data) ? (
                <>
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
                  </svg>
                  Fieldbook Document
                </>
              ) : isDerivedDocNode(data) ? (
                <>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                  </svg>
                  Derived Document
                </>
              ) : isGoogleDocNode(data) ? (
                <>
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 2l5 5h-5V4zM6 20V4h6v6h6v10H6z"/>
                  </svg>
                  {data.docType === "docs" ? "Google Docs" : data.docType === "sheets" ? "Google Sheets" : "Google Slides"}
                </>
              ) : isUrlNode(data) ? (
                <>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
                  </svg>
                  {googleService?.name || "URL Reference"}
                </>
              ) : (
                <>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                  {getFileTypeLabel((data as FileNodeData).fileType)}
                </>
              )}
            </span>
            {(googleService?.isEditable || isGoogleDocNode(data) || isFieldbookDocNode(data)) && (
              <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded bg-green-100 text-green-700">
                Editable
              </span>
            )}
          </div>
        </div>

        {/* Fieldbook Doc-specific details */}
        {isFieldbookDocNode(data) && (
          <>
            <div>
              <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
                Title
              </span>
              <p className="mt-1 text-sm text-neutral-900">
                {data.label}
              </p>
            </div>

            {data.updatedAt && (
              <div>
                <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Last Updated
                </span>
                <p className="mt-1 text-xs text-neutral-500">
                  {new Date(data.updatedAt).toLocaleString()}
                </p>
              </div>
            )}

            {/* Open/Edit button for Fieldbook Doc */}
            <div className="pt-2">
              <button
                onClick={() => onOpenFieldbookDocEditor?.(node as Node<FieldbookDocNodeData>)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-500 text-white text-sm font-medium rounded-md hover:bg-blue-600 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                </svg>
                Open & Edit
              </button>
              <p className="mt-2 text-xs text-neutral-400 text-center">
                Full editor with formatting, @mentions, and more
              </p>
            </div>
          </>
        )}

        {/* Derived Doc-specific details */}
        {isDerivedDocNode(data) && (
          <>
            <div>
              <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
                Title
              </span>
              <p className="mt-1 text-sm text-neutral-900">
                {data.title}
              </p>
            </div>

            <div>
              <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
                Prompt
              </span>
              <p className="mt-1 text-xs text-neutral-600 bg-amber-50 rounded-md px-2 py-1.5 leading-relaxed">
                {data.prompt}
              </p>
            </div>

            <div>
              <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
                Sources
              </span>
              <p className="mt-1 text-xs text-neutral-500">
                Derived from {data.sourceNodeIds.length} source{data.sourceNodeIds.length !== 1 ? "s" : ""}
              </p>
            </div>

            {/* Open/Edit button for Derived Doc */}
            <div className="pt-2">
              <button
                onClick={() => onOpenDerivedDocEditor?.(node as Node<DerivedDocNodeData>)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-500 text-white text-sm font-medium rounded-md hover:bg-amber-600 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                </svg>
                Open & Edit
              </button>
              <p className="mt-2 text-xs text-neutral-400 text-center">
                View content, edit, and see provenance
              </p>
            </div>
          </>
        )}

        {/* Google Doc-specific details */}
        {isGoogleDocNode(data) && (
          <>
            <div>
              <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
                Document
              </span>
              <p className="mt-1 text-sm text-neutral-900">
                {data.label}
              </p>
              <p className="mt-0.5 text-xs text-neutral-400">
                {getDomain(data.url)}
              </p>
            </div>

            {/* Open button for Google Doc - in-app viewer */}
            <div className="pt-2">
              <button
                onClick={() => onOpenViewer?.(data.url, data.label)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-500 text-white text-sm font-medium rounded-md hover:bg-blue-600 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Open & Edit
              </button>
              <p className="mt-2 text-xs text-neutral-400 text-center">
                Opens in Fieldbook with editing enabled
              </p>
            </div>
          </>
        )}

        {/* URL-specific details */}
        {isUrlNode(data) && (
          <>
            <div>
              <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
                URL
              </span>
              <p className="mt-1 text-sm text-neutral-700 break-all">
                {data.url}
              </p>
              <p className="mt-0.5 text-xs text-neutral-400">
                {getDomain(data.url)}
              </p>
            </div>

            {/* Open button for URL - in-app viewer */}
            <div className="pt-2">
              <button
                onClick={() => onOpenViewer?.(data.url, data.label)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-500 text-white text-sm font-medium rounded-md hover:bg-blue-600 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {googleService?.isEditable ? "Open & Edit" : "Open"}
              </button>
              {googleService && (
                <p className="mt-2 text-xs text-neutral-400 text-center">
                  {googleService.isEditable 
                    ? "Opens in Fieldbook with editing enabled"
                    : `Opens ${googleService.name} in Fieldbook`
                  }
                </p>
              )}
            </div>
          </>
        )}

        {/* File-specific details */}
        {isFileNode(data) && (
          <>
            <div>
              <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
                File Name
              </span>
              <p className="mt-1 text-sm text-neutral-900 break-all">
                {data.fileName}
              </p>
            </div>

            <div>
              <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
                File Type
              </span>
              <p className="mt-1 text-sm text-neutral-700">
                {getFileTypeLabel(data.fileType)}
                <span className="text-neutral-400 ml-2">({data.fileType || "unknown"})</span>
              </p>
            </div>

            <div>
              <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
                Size
              </span>
              <p className="mt-1 text-sm text-neutral-700">
                {formatFileSize(data.fileSize)}
              </p>
            </div>

            {/* Open button for File - in-app viewer */}
            {data.previewUrl && (
              <div className="pt-2">
                <button
                  onClick={() => onOpenFileViewer?.(data)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-500 text-white text-sm font-medium rounded-md hover:bg-blue-600 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Open
                </button>
                <p className="mt-2 text-xs text-neutral-400 text-center">
                  Preview available until page refresh
                </p>
              </div>
            )}
          </>
        )}

        {/* Position */}
        <div className="pt-4 border-t border-neutral-100">
          <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
            Position
          </span>
          <p className="mt-1 text-xs text-neutral-500 font-mono">
            x: {Math.round(node.position.x)}, y: {Math.round(node.position.y)}
          </p>
        </div>

        {/* Delete button */}
        <div className="pt-4 border-t border-neutral-100">
          <button
            onClick={() => onDeleteNode?.(node.id)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
            </svg>
            Delete
          </button>
          <p className="mt-1.5 text-xs text-neutral-400 text-center">
            Press Delete or Backspace to remove
          </p>
        </div>
      </div>
    </div>
  );
}
