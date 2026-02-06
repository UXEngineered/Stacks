"use client";

/**
 * Save Status Indicator
 * 
 * Displays autosave status with visual feedback:
 * - Idle: Nothing shown
 * - Pending: "Editing..." with subtle pulse
 * - Saving: "Saving..." with spinner
 * - Saved: "Saved" with checkmark, fades after a few seconds
 * - Error: Red text with retry option
 * - Conflict: Warning with action buttons
 */

import { useEffect, useState } from "react";
import type { SaveStatus } from "../../lib/storage/types";

interface SaveStatusIndicatorProps {
  status: SaveStatus;
  version: number;
  onRetry?: () => void;
  onResolveConflict?: () => void;
  className?: string;
}

export function SaveStatusIndicator({
  status,
  version,
  onRetry,
  onResolveConflict,
  className = "",
}: SaveStatusIndicatorProps) {
  const [showSaved, setShowSaved] = useState(false);
  
  // Auto-hide "Saved" indicator after 3 seconds
  useEffect(() => {
    if (status.state === "saved") {
      setShowSaved(true);
      const timer = setTimeout(() => setShowSaved(false), 3000);
      return () => clearTimeout(timer);
    } else {
      setShowSaved(false);
    }
  }, [status]);
  
  // Format relative time
  const formatTime = (timestamp: number): string => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 5) return "just now";
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ago`;
  };
  
  return (
    <div className={`flex items-center gap-2 text-xs ${className}`}>
      {/* Pending state */}
      {status.state === "pending" && (
        <span className="text-neutral-400 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-neutral-300 animate-pulse" />
          Editing...
        </span>
      )}
      
      {/* Saving state */}
      {status.state === "saving" && (
        <span className="text-neutral-500 flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle 
              className="opacity-25" 
              cx="12" 
              cy="12" 
              r="10" 
              stroke="currentColor" 
              strokeWidth="4"
            />
            <path 
              className="opacity-75" 
              fill="currentColor" 
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          Saving...
        </span>
      )}
      
      {/* Saved state */}
      {status.state === "saved" && showSaved && (
        <span className="text-green-600 flex items-center gap-1.5 animate-in fade-in duration-200">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          Saved
        </span>
      )}
      
      {/* Idle state - show version if we have one */}
      {status.state === "idle" && version > 0 && (
        <span className="text-neutral-400">
          v{version}
        </span>
      )}
      
      {/* Error state */}
      {status.state === "error" && (
        <span className="text-red-500 flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          Save failed
          {onRetry && (
            <button 
              onClick={onRetry}
              className="ml-1 text-red-600 hover:text-red-700 underline underline-offset-2"
            >
              Retry
            </button>
          )}
        </span>
      )}
      
      {/* Conflict state */}
      {status.state === "conflict" && (
        <span className="text-amber-600 flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          Conflict detected
          {onResolveConflict && (
            <button 
              onClick={onResolveConflict}
              className="ml-1 text-amber-700 hover:text-amber-800 underline underline-offset-2"
            >
              Resolve
            </button>
          )}
        </span>
      )}
    </div>
  );
}
