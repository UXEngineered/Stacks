"use client";

/**
 * RecalibrationIndicator - Visual feedback for reverberation state
 * 
 * Always rendered (never null) so CSS transitions can animate in/out smoothly.
 * 
 * States:
 *   idle / undefined → invisible (scale 0, opacity 0)
 *   recalibrating    → purple dot fades & scales in, gentle pulse
 *   calibrated       → green checkmark fades in, then fades out to idle
 */

import { useState, useEffect, useRef } from "react";
import { useTheme } from "./ThemeProvider";
import type { RecalcStatus } from "./spine/types";

const EASING = "cubic-bezier(0.16, 1, 0.3, 1)";
const ENTER_MS = 300;
const EXIT_MS = 350;

interface RecalibrationIndicatorProps {
  status?: RecalcStatus;
  className?: string;
  /** Show in compact mode (just dot / icon, no text) */
  compact?: boolean;
}

export function RecalibrationIndicator({ 
  status, 
  className = "",
  compact = false 
}: RecalibrationIndicatorProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  // Visual phase lags behind `status` so we can animate exits
  const prevStatusRef = useRef<RecalcStatus | undefined>(undefined);
  const [visual, setVisual] = useState<"hidden" | "recalibrating" | "calibrated">(
    status === "recalibrating" ? "recalibrating" : status === "calibrated" ? "calibrated" : "hidden"
  );

  useEffect(() => {
    const prev = prevStatusRef.current;
    prevStatusRef.current = status;

    if (status === "recalibrating") {
      setVisual("recalibrating");
    } else if (status === "calibrated") {
      setVisual("calibrated");
    } else {
      // idle or undefined → animate out then hide
      if (prev === "calibrated" || prev === "recalibrating") {
        // Let the CSS transition run before fully hiding
        const timer = setTimeout(() => setVisual("hidden"), EXIT_MS);
        return () => clearTimeout(timer);
      }
      setVisual("hidden");
    }
  }, [status]);

  const isVisible = visual !== "hidden";
  const isRecalibrating = status === "recalibrating";
  const isCalibrated = status === "calibrated";
  const isExiting = !isRecalibrating && !isCalibrated && visual !== "hidden";

  const dotColor = isDark ? "#8b5cf6" : "#7c3aed";
  const checkColor = isDark ? "#4ade80" : "#22c55e";

  return (
    <div
      className={`flex items-center shrink-0 ${className}`}
      style={{
        opacity: isVisible && !isExiting ? 1 : 0,
        transform: isVisible && !isExiting ? "scale(1)" : "scale(0.3)",
        transition: `opacity ${isExiting ? EXIT_MS : ENTER_MS}ms ${EASING}, transform ${isExiting ? EXIT_MS : ENTER_MS}ms ${EASING}`,
        pointerEvents: isVisible ? "auto" : "none",
        // Reserve minimal space so neighbours don't shift
        width: isVisible ? "auto" : 0,
        overflow: "hidden",
      }}
      aria-hidden={!isVisible}
    >
      {/* Recalibrating: purple dot with gentle pulse */}
      {(visual === "recalibrating") && (
        <div className="flex items-center gap-1.5">
          <span
            style={{
              display: "inline-block",
              width: 7,
              height: 7,
              borderRadius: "50%",
              backgroundColor: dotColor,
              animation: "recalDotPulse 1.8s ease-in-out infinite",
              flexShrink: 0,
            }}
          />
          {!compact && (
            <span
              className="text-[10px] font-medium tracking-wide"
              style={{ color: dotColor, whiteSpace: "nowrap" }}
            >
              Recalibrating…
            </span>
          )}
        </div>
      )}

      {/* Calibrated: brief green check */}
      {(visual === "calibrated") && (
        <div className="flex items-center gap-1">
          <svg className="w-3 h-3" fill="none" stroke={checkColor} viewBox="0 0 24 24" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          {!compact && (
            <span
              className="text-[10px] font-medium tracking-wide"
              style={{ color: checkColor, whiteSpace: "nowrap" }}
            >
              Calibrated
            </span>
          )}
        </div>
      )}

      <style>{`
        @keyframes recalDotPulse {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
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
      className={`${className}`}
      style={{ 
        color: isDark ? "#737373" : "#a3a3a3",
        fontSize: "12.5px",
        animation: "recalInfoIn 450ms cubic-bezier(0.16, 1, 0.3, 1) both",
      }}
    >
      <style>{`
        @keyframes recalInfoIn {
          0% { opacity: 0; max-height: 0; margin-bottom: 0; }
          100% { opacity: 1; max-height: 60px; margin-bottom: 16px; }
        }
      `}</style>
      <div className="flex items-center gap-1">
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
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
