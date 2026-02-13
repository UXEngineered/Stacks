"use client";

/**
 * RecalibratingTitle — Blur-based recalibration animation on the title itself.
 *
 * Three visual states:
 *   idle          → normal rendering
 *   recalibrating → blur + reduced opacity + subtle shimmer sweep
 *   settled       → animates back to clarity when status moves to "calibrated"
 *
 * Replaces the spinner/checkmark indicator with a title-level treatment
 * that feels computational, not flashy.
 *
 * ── Tuning knobs (search for "TUNE:" in comments) ──────────────────────
 *   blur strength, shimmer intensity, animation timing, letter-spacing
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { useTheme } from "./ThemeProvider";
import type { RecalcStatus } from "./spine/types";

interface RecalibratingTitleProps {
  /** The textarea element rendered as children */
  children: React.ReactNode;
  /** Current recalibration status */
  status?: RecalcStatus;
  /** Additional class names on the wrapper */
  className?: string;
}

export function RecalibratingTitle({
  children,
  status,
  className = "",
}: RecalibratingTitleProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  // Track the previous status to detect the "settling" transition
  const prevStatusRef = useRef<RecalcStatus | undefined>(undefined);
  const [phase, setPhase] = useState<"idle" | "recalibrating" | "settling">(
    status === "recalibrating" ? "recalibrating" : "idle"
  );

  useEffect(() => {
    const prev = prevStatusRef.current;
    prevStatusRef.current = status;

    // On very first render, only react if status is "recalibrating"
    if (prev === undefined) {
      if (status === "recalibrating") {
        setPhase("recalibrating");
      }
      return;
    }

    if (status === "recalibrating") {
      setPhase("recalibrating");
    } else if (prev === "recalibrating" && (status === "calibrated" || status === "idle")) {
      // Just finished recalibrating → settle back to clarity
      setPhase("settling");
      // TUNE: settling duration — matches the CSS ease-out below (350ms)
      const timer = setTimeout(() => setPhase("idle"), 400);
      return () => clearTimeout(timer);
    } else {
      setPhase("idle");
    }
  }, [status]);

  const isRecalibrating = phase === "recalibrating";
  const isSettling = phase === "settling";
  const isActive = isRecalibrating || isSettling;

  // ── Shimmer gradient colors ─────────────────────────────────────────
  // TUNE: shimmer intensity — slightly more visible than before
  const shimmerColor = isDark
    ? "rgba(139, 92, 246, 0.08)"   // subtle purple tint in dark mode
    : "rgba(124, 58, 237, 0.06)";  // subtle purple tint in light mode

  // Generate a unique class name to scope the CSS to this component
  const recalClass = isRecalibrating ? "recal-title-active" : isSettling ? "recal-title-settling" : "";

  return (
    <div className={`relative ${className}`}>
      {/* Title content wrapper — applies visual treatment via CSS class */}
      <div
        className={recalClass}
        style={{
          // TUNE: blur strength (2–4px). Higher = more obscured.
          filter: isRecalibrating ? "blur(2.5px)" : "blur(0px)",
          // TUNE: opacity during recalibration (0.8–0.9 recommended)
          opacity: isRecalibrating ? 0.7 : 1,
          // TUNE: vertical shift (1–2px) — subtle "unsettled" feel
          transform: isRecalibrating ? "translateY(1.5px)" : "translateY(0)",
          // Timing: ease-in when entering recalibration, ease-out when settling
          transition: isRecalibrating
            ? "filter 300ms ease-in, opacity 300ms ease-in, transform 300ms ease-in"
            : "filter 400ms ease-out, opacity 400ms ease-out, transform 400ms ease-out",
          // Ensure the filter actually composites the children
          willChange: isActive ? "filter, opacity, transform" : "auto",
        }}
      >
        {children}
      </div>

      {/* Shimmer overlay — sweeps across during active recalibration */}
      {isActive && (
        <div
          className="absolute inset-0 pointer-events-none overflow-hidden"
          style={{
            borderRadius: "4px",
            opacity: isRecalibrating ? 1 : 0,
            transition: "opacity 400ms ease-out",
          }}
          aria-hidden="true"
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              left: "-100%",
              width: "300%",
              height: "100%",
              // TUNE: shimmer gradient — adjust stop positions and color for intensity
              background: `linear-gradient(90deg, transparent 0%, ${shimmerColor} 25%, transparent 50%, ${shimmerColor} 75%, transparent 100%)`,
              // TUNE: shimmer speed (1.2–1.5s). Slower = more computational feel.
              animation: "recalTitleShimmer 1.4s ease-in-out infinite",
            }}
          />
        </div>
      )}

      {/* Subtle bottom accent bar — visible indication that recalibration is in progress */}
      {isActive && (
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: "2px",
            borderRadius: "1px",
            background: isDark
              ? "linear-gradient(90deg, transparent, rgba(139, 92, 246, 0.4), transparent)"
              : "linear-gradient(90deg, transparent, rgba(124, 58, 237, 0.3), transparent)",
            opacity: isRecalibrating ? 1 : 0,
            transition: "opacity 400ms ease-out",
            animation: isRecalibrating ? "recalBarPulse 1.5s ease-in-out infinite" : "none",
          }}
          aria-hidden="true"
        />
      )}

      {/* Keyframes + reduced-motion override */}
      <style>{`
        @keyframes recalTitleShimmer {
          0% { transform: translateX(0); }
          100% { transform: translateX(66%); }
        }

        @keyframes recalBarPulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }

        @media (prefers-reduced-motion: reduce) {
          .recal-title-active,
          .recal-title-settling {
            filter: none !important;
            transform: none !important;
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}
