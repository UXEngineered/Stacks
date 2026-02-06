"use client";

/**
 * Custom React Flow node styled as an artifact tile
 * Features a small label header and selection state
 */

import { memo } from "react";
import { Handle, Position, type NodeProps } from "reactflow";

export interface ArtifactNodeData {
  label: string;
  type: "input" | "output";
}

function ArtifactNodeComponent({ data, selected }: NodeProps<ArtifactNodeData>) {
  const isInput = data.type === "input";

  return (
    <div
      className={`
        min-w-[140px] bg-white rounded-lg border-2 shadow-sm transition-all
        ${selected 
          ? "border-blue-500 shadow-md ring-2 ring-blue-100" 
          : "border-neutral-200 hover:border-neutral-300"
        }
      `}
    >
      {/* Label header */}
      <div
        className={`
          px-3 py-1.5 text-xs font-medium rounded-t-md border-b
          ${selected 
            ? "bg-blue-50 text-blue-700 border-blue-100" 
            : "bg-neutral-50 text-neutral-600 border-neutral-100"
          }
        `}
      >
        {data.label}
      </div>

      {/* Content area */}
      <div className="px-3 py-3">
        <div className="text-xs text-neutral-400">
          {isInput ? "Source artifact" : "Generated artifact"}
        </div>
      </div>

      {/* Handles for connections */}
      {isInput && (
        <Handle
          type="source"
          position={Position.Bottom}
          className="!w-2 !h-2 !bg-neutral-400 !border-2 !border-white"
        />
      )}
      {!isInput && (
        <Handle
          type="target"
          position={Position.Top}
          className="!w-2 !h-2 !bg-neutral-400 !border-2 !border-white"
        />
      )}
    </div>
  );
}

export const ArtifactNode = memo(ArtifactNodeComponent);
