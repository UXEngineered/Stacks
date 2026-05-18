"use client";

import { useState, useEffect } from "react";

interface ConfidenceScoreBlockProps {
  aiScore: number;
  humanOverride?: number | null;
  recalcStatus?: string;
  readOnly: boolean;
  isDark: boolean;
  onOverride: (score: number) => void;
  onReset: () => void;
}

export function ConfidenceScoreBlock({
  aiScore,
  humanOverride,
  recalcStatus,
  readOnly,
  isDark,
  onOverride,
  onReset,
}: ConfidenceScoreBlockProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [sliderValue, setSliderValue] = useState(humanOverride ?? aiScore);
  const [hoverScore, setHoverScore] = useState(false);
  const hasOverride = humanOverride != null;
  const displayScore = hasOverride ? humanOverride : aiScore;

  useEffect(() => {
    setSliderValue(humanOverride ?? aiScore);
  }, [humanOverride, aiScore]);

  const barColor = (score: number) =>
    score >= 75
      ? (isDark ? "#22c55e" : "#16a34a")
      : score >= 50
        ? (isDark ? "#a3a3a3" : "#737373")
        : (isDark ? "#f59e0b" : "#d97706");

  const label = (score: number) =>
    score >= 75
      ? "High — corroborating sources with consistent evidence."
      : score >= 50
        ? "Moderate — supported by evidence but gaps remain."
        : "Low — limited or conflicting sources; treat as provisional.";

  const handleCommit = () => {
    setIsEditing(false);
    if (sliderValue !== (humanOverride ?? aiScore)) {
      onOverride(sliderValue);
    }
  };

  const muted = isDark ? "#525252" : "#a3a3a3";
  const textColor = isDark ? "#d4d4d4" : "#404040";
  const subtleText = isDark ? "#737373" : "#a3a3a3";
  const border = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";
  const trackBg = isDark ? "#262626" : "#e5e5e5";

  return (
    <div
      className="mb-4 px-3 py-2.5 rounded-md"
      style={{
        border: `1px solid ${border}`,
        backgroundColor: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.015)",
      }}
    >
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <span
            className="text-[10px] font-medium tracking-wider uppercase"
            style={{ color: muted }}
          >
            Confidence
          </span>
          {hasOverride && (
            <span
              className="text-[9px] px-1.5 py-0.5 rounded-full"
              style={{
                backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)",
                color: subtleText,
              }}
            >
              overridden
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {hasOverride && (
            <span
              className="text-[10px] tabular-nums line-through"
              style={{ color: muted }}
              title="AI-generated score"
            >
              {aiScore}%
            </span>
          )}
          {!readOnly && !isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              onMouseEnter={() => setHoverScore(true)}
              onMouseLeave={() => setHoverScore(false)}
              className="text-[12px] font-semibold tabular-nums cursor-pointer inline-flex items-center gap-1 rounded px-1.5 py-0.5 -mr-1.5"
              style={{
                color: textColor,
                backgroundColor: hoverScore
                  ? (isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)")
                  : "transparent",
                transition: "background-color 150ms",
              }}
              title="Click to override"
            >
              {displayScore}%
              <svg
                className="w-2.5 h-2.5 transition-opacity duration-150"
                style={{ opacity: hoverScore ? 0.7 : 0.3 }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487z" />
              </svg>
            </button>
          ) : (
            <span
              className="text-[12px] font-semibold tabular-nums"
              style={{ color: textColor }}
            >
              {isEditing ? sliderValue : displayScore}%
            </span>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div
        className="h-1 rounded-full overflow-hidden mb-1.5"
        style={{ backgroundColor: trackBg }}
      >
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${isEditing ? sliderValue : displayScore}%`,
            backgroundColor: barColor(isEditing ? sliderValue : displayScore),
          }}
        />
      </div>

      {/* Editing controls */}
      {isEditing ? (
        <div className="mt-2.5">
          <input
            type="range"
            min={0}
            max={100}
            value={sliderValue}
            onChange={(e) => setSliderValue(Number(e.target.value))}
            className="w-full h-1 rounded-full appearance-none cursor-pointer"
            style={{
              accentColor: isDark ? "#d4d4d4" : "#404040",
              background: trackBg,
            }}
          />
          <div className="flex items-center gap-2 mt-2">
            <button
              onClick={handleCommit}
              className="text-[10px] font-medium px-2.5 py-1 rounded cursor-pointer"
              style={{
                backgroundColor: isDark ? "#d4d4d4" : "#171717",
                color: isDark ? "#171717" : "#fafafa",
              }}
            >
              Set to {sliderValue}%
            </button>
            <button
              onClick={() => {
                setIsEditing(false);
                setSliderValue(humanOverride ?? aiScore);
              }}
              className="text-[10px] px-2.5 py-1 rounded cursor-pointer"
              style={{
                backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)",
                color: subtleText,
              }}
            >
              Cancel
            </button>
            {hasOverride && (
              <button
                onClick={() => {
                  setIsEditing(false);
                  onReset();
                }}
                className="text-[10px] ml-auto cursor-pointer hover:underline"
                style={{ color: subtleText }}
              >
                Reset to AI score
              </button>
            )}
          </div>
        </div>
      ) : (
        <p
          className="text-[9px] leading-relaxed"
          style={{ color: subtleText }}
        >
          {label(displayScore)}
          {recalcStatus === "calibrated" && " Reduced after upstream changes."}
        </p>
      )}
    </div>
  );
}
