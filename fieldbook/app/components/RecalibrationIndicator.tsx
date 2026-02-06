"use client";

/**
 * RecalibrationIndicator - Visual feedback for reverberation state
 * 
 * Shows:
 * - "Recalibrating..." with shimmer animation when recalcStatus === "recalibrating"
 * - "Calibrated" checkmark badge when recalcStatus === "calibrated"
 * - Nothing when recalcStatus === "idle" or undefined
 */

import { useTheme } from "./ThemeProvider";
import type { RecalcStatus } from "./spine/types";

interface RecalibrationIndicatorProps {
  status?: RecalcStatus;
  className?: string;
  /** Show in compact mode (just icon) */
  compact?: boolean;
}

export function RecalibrationIndicator({ 
  status, 
  className = "",
  compact = false 
}: RecalibrationIndicatorProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  
  if (!status || status === "idle") {
    return null;
  }
  
  if (status === "recalibrating") {
    return (
      <div 
        className={`flex items-center gap-1.5 ${className}`}
        style={{ color: isDark ? "#818cf8" : "#6366f1" }}
      >
        {/* Spinner */}
        <svg 
          className="w-3 h-3 animate-spin" 
          fill="none" 
          viewBox="0 0 24 24"
        >
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
        {!compact && (
          <span className="text-[10px] font-medium tracking-wide animate-pulse">
            Recalibrating...
          </span>
        )}
      </div>
    );
  }
  
  if (status === "calibrated") {
    return (
      <div 
        className={`flex items-center gap-1 ${className}`}
        style={{ color: isDark ? "#4ade80" : "#22c55e" }}
      >
        {/* Checkmark */}
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
        {!compact && (
          <span className="text-[10px] font-medium tracking-wide">
            Calibrated
          </span>
        )}
      </div>
    );
  }
  
  return null;
}

/**
 * RecalibrationShimmer - Full overlay shimmer effect for content areas
 * 
 * Use this to wrap content that should show a shimmer during recalibration.
 * Supports flex layouts by passing through flex-1 and flex container behavior.
 */
interface RecalibrationShimmerProps {
  status?: RecalcStatus;
  children: React.ReactNode;
  className?: string;
}

export function RecalibrationShimmer({ 
  status, 
  children, 
  className = "" 
}: RecalibrationShimmerProps) {
  const isRecalibrating = status === "recalibrating";
  
  return (
    <div className={`relative flex-1 flex flex-col min-h-0 ${className}`}>
      {children}
      {isRecalibrating && (
        <div 
          className="absolute inset-0 pointer-events-none overflow-hidden z-10"
          aria-hidden="true"
        >
          {/* Animated shimmer sweep */}
          <div 
            style={{ 
              position: "absolute",
              top: 0,
              left: "-100%",
              width: "200%",
              height: "100%",
              background: "linear-gradient(90deg, transparent 0%, rgba(129, 140, 248, 0.15) 25%, rgba(129, 140, 248, 0.25) 50%, rgba(129, 140, 248, 0.15) 75%, transparent 100%)",
              animation: "shimmerSweep 1.5s ease-in-out infinite",
            }}
          />
          {/* Subtle pulsing overlay */}
          <div 
            style={{ 
              position: "absolute",
              inset: 0,
              background: "rgba(129, 140, 248, 0.03)",
              animation: "shimmerPulse 1s ease-in-out infinite alternate",
            }}
          />
        </div>
      )}
      <style jsx global>{`
        @keyframes shimmerSweep {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(100%);
          }
        }
        @keyframes shimmerPulse {
          0% {
            opacity: 0.5;
          }
          100% {
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}

/**
 * LastRecalibratedInfo - Shows when an item was last recalibrated
 */
interface LastRecalibratedInfoProps {
  lastRenderedAt?: string;
  lastDiff?: {
    before: string;
    after: string;
    message: string;
  } | null;
  className?: string;
}

export function LastRecalibratedInfo({ 
  lastRenderedAt, 
  lastDiff,
  className = "" 
}: LastRecalibratedInfoProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  
  if (!lastRenderedAt) return null;
  
  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };
  
  return (
    <div 
      className={`text-[10px] ${className}`}
      style={{ color: isDark ? "#737373" : "#a3a3a3" }}
    >
      <div className="flex items-center gap-1">
        <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>Last recalibrated: {formatTime(lastRenderedAt)}</span>
      </div>
      {lastDiff && lastDiff.before && lastDiff.after && (
        <div className="mt-0.5 flex items-center gap-1">
          <span style={{ color: isDark ? "#f87171" : "#ef4444" }}>
            {lastDiff.before.slice(0, 20)}{lastDiff.before.length > 20 ? "..." : ""}
          </span>
          <span>→</span>
          <span style={{ color: isDark ? "#4ade80" : "#22c55e" }}>
            {lastDiff.after.slice(0, 20)}{lastDiff.after.length > 20 ? "..." : ""}
          </span>
        </div>
      )}
    </div>
  );
}
