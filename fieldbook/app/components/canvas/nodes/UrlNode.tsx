"use client";

/**
 * Custom React Flow node for URL references
 * Displays a doc-style preview tile with service detection
 * Special handling for Google Docs/Sheets (internal Sparq documents)
 */

import { memo } from "react";
import { Handle, Position, type NodeProps } from "reactflow";

export interface UrlNodeData {
  label: string;
  type: "url";
  url: string;
}

// Detect service type from URL
function detectService(url: string): {
  type: "google-docs" | "google-sheets" | "google-slides" | "google-drive" | "google-forms" | "youtube" | "figma" | "generic";
  label: string;
  color: string;
  bgColor: string;
} {
  const urlLower = url.toLowerCase();
  
  if (urlLower.includes("docs.google.com/document")) {
    return { type: "google-docs", label: "Google Docs", color: "text-blue-600", bgColor: "bg-blue-50/50" };
  }
  if (urlLower.includes("docs.google.com/spreadsheets")) {
    return { type: "google-sheets", label: "Google Sheets", color: "text-green-600", bgColor: "bg-green-50/50" };
  }
  if (urlLower.includes("docs.google.com/presentation")) {
    return { type: "google-slides", label: "Google Slides", color: "text-yellow-600", bgColor: "bg-yellow-50/50" };
  }
  if (urlLower.includes("drive.google.com")) {
    return { type: "google-drive", label: "Google Drive", color: "text-blue-500", bgColor: "bg-blue-50/50" };
  }
  if (urlLower.includes("docs.google.com/forms")) {
    return { type: "google-forms", label: "Google Forms", color: "text-purple-600", bgColor: "bg-purple-50/50" };
  }
  if (urlLower.includes("youtube.com") || urlLower.includes("youtu.be")) {
    return { type: "youtube", label: "YouTube", color: "text-red-600", bgColor: "bg-red-50/50" };
  }
  if (urlLower.includes("figma.com")) {
    return { type: "figma", label: "Figma", color: "text-purple-600", bgColor: "bg-purple-50/50" };
  }
  
  return { type: "generic", label: "Link", color: "text-neutral-400", bgColor: "bg-neutral-50/50" };
}

// Extract domain from URL for display
function getDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace("www.", "");
  } catch {
    return url;
  }
}

// Service-specific icons
function ServiceIcon({ type, className }: { type: string; className?: string }) {
  switch (type) {
    case "google-docs":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 2l5 5h-5V4zM6 20V4h6v6h6v10H6z"/>
          <path d="M8 12h8v2H8zm0 4h8v2H8z"/>
        </svg>
      );
    case "google-sheets":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 2l5 5h-5V4zM6 20V4h6v6h6v10H6z"/>
          <path d="M8 12h3v2H8zm5 0h3v2h-3zm-5 4h3v2H8zm5 0h3v2h-3z"/>
        </svg>
      );
    case "google-slides":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 2l5 5h-5V4zM6 20V4h6v6h6v10H6z"/>
          <rect x="7" y="12" width="10" height="6" rx="1"/>
        </svg>
      );
    case "google-drive":
    case "google-forms":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"/>
        </svg>
      );
    case "youtube":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
        </svg>
      );
    case "figma":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
          <path d="M15.852 8.981h-4.588V0h4.588c2.476 0 4.49 2.014 4.49 4.49s-2.014 4.491-4.49 4.491zM12.735 7.51h3.117c1.665 0 3.019-1.355 3.019-3.019s-1.355-3.019-3.019-3.019h-3.117V7.51zM8.148 24c-2.476 0-4.49-2.014-4.49-4.49s2.014-4.49 4.49-4.49h4.588v4.49c0 2.476-2.014 4.49-4.588 4.49zm-.001-7.509c-1.665 0-3.019 1.355-3.019 3.019s1.354 3.02 3.019 3.02 3.019-1.355 3.019-3.02v-3.019H8.147z"/>
        </svg>
      );
    default:
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
        </svg>
      );
  }
}

function UrlNodeComponent({ data, selected }: NodeProps<UrlNodeData>) {
  const service = detectService(data.url);
  const domain = getDomain(data.url);
  const isGoogleDoc = service.type === "google-docs" || service.type === "google-sheets" || service.type === "google-slides";

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
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
        </svg>
        URL Reference
      </div>

      {/* Document preview area */}
      <div className="px-2 pt-2">
        <div className={`w-full h-16 rounded-lg flex items-center justify-center ${service.bgColor}`}>
          <div className="flex flex-col items-center gap-1">
            <ServiceIcon type={service.type} className={`w-6 h-6 ${service.color}`} />
            <span className={`text-[10px] font-medium ${service.color}`}>
              {service.label}
            </span>
          </div>
        </div>
      </div>

      {/* Document info */}
      <div className="px-3 py-2">
        <div className="text-xs font-medium text-neutral-900 truncate" title={data.label}>
          {data.label}
        </div>
        <div className="flex items-center gap-1 mt-0.5">
          <span className="text-[10px] text-neutral-400 truncate" title={domain}>
            {domain}
          </span>
          {isGoogleDoc && (
            <span className="text-[9px] px-1 py-0.5 bg-green-100 text-green-700 rounded font-medium">
              Editable
            </span>
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

export const UrlNode = memo(UrlNodeComponent);
