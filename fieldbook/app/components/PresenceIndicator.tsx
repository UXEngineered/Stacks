"use client";

/**
 * PresenceIndicator - Shows who is currently editing a document
 * 
 * Minimal, calm design:
 * - Initials avatar
 * - "editing" text
 * - No live cursors or typing indicators
 */

import { useTheme } from "./ThemeProvider";

interface PresenceIndicatorProps {
  userName: string;
  avatarUrl?: string | null;
}

export function PresenceIndicator({ userName, avatarUrl }: PresenceIndicatorProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  // Get initials from name
  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="flex items-center gap-2">
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={userName}
          className="w-6 h-6 rounded-full"
        />
      ) : (
        <div
          className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-medium"
          style={{
            backgroundColor: isDark ? "#3b82f6" : "#2563eb",
            color: "#ffffff",
          }}
        >
          {initials}
        </div>
      )}
      <span
        className="text-xs"
        style={{ color: isDark ? "#a3a3a3" : "#525252" }}
      >
        editing
      </span>
    </div>
  );
}

/**
 * PresenceBanner - Full-width banner shown when viewing a document being edited
 */
interface PresenceBannerProps {
  userName: string;
  avatarUrl?: string | null;
  onRequestEdit?: () => void;
}

export function PresenceBanner({ userName, avatarUrl, onRequestEdit }: PresenceBannerProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div
      className="px-4 py-2 flex items-center justify-between"
      style={{
        backgroundColor: isDark ? "rgba(59, 130, 246, 0.1)" : "rgba(37, 99, 235, 0.05)",
        borderBottom: `1px solid ${isDark ? "#404040" : "#e5e5e5"}`,
      }}
    >
      <div className="flex items-center gap-2">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={userName}
            className="w-5 h-5 rounded-full"
          />
        ) : (
          <div
            className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-medium"
            style={{
              backgroundColor: isDark ? "#3b82f6" : "#2563eb",
              color: "#ffffff",
            }}
          >
            {initials}
          </div>
        )}
        <span
          className="text-xs"
          style={{ color: isDark ? "#d4d4d4" : "#404040" }}
        >
          <strong>{userName}</strong> is editing this document
        </span>
      </div>

      {onRequestEdit && (
        <button
          onClick={onRequestEdit}
          className="text-xs px-3 py-1 transition-colors"
          style={{
            backgroundColor: isDark ? "#262626" : "#f5f5f5",
            color: isDark ? "#d4d4d4" : "#404040",
            border: `1px solid ${isDark ? "#404040" : "#e5e5e5"}`,
          }}
        >
          Request edit access
        </button>
      )}
    </div>
  );
}
