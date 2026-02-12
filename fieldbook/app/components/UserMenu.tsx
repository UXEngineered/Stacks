"use client";

/**
 * UserMenu - User avatar/initials button with dropdown
 *
 * Matches the style of the Fieldbook Actions and Export dropdowns.
 * Shows basic user info and a sign-out action.
 */

import { useState, useRef, useEffect } from "react";
import { signOut } from "next-auth/react";
import { useTheme } from "./ThemeProvider";

interface UserMenuProps {
  name: string;
  email: string;
  avatarUrl?: string | null;
}

export function UserMenu({ name, email, avatarUrl }: UserMenuProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Get initials
  const initials = (() => {
    const parts = name.split(/[\s@]+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  })();

  const handleSignOut = () => {
    signOut({ callbackUrl: "/login" });
  };

  return (
    <div className="relative" ref={menuRef}>
      {/* Initials Button — secondary style, square */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center cursor-pointer"
        style={{
          fontSize: "12.5px",
          fontWeight: 500,
          padding: "5px 10px",
          borderRadius: "6px",
          transition: "all 150ms cubic-bezier(0.16, 1, 0.3, 1)",
          backgroundColor: "transparent",
          color: isDark ? "#a3a3a3" : "#525252",
          border: `0.5px solid ${isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)"}`,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = "transparent";
        }}
        title={name}
      >
        {initials}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          className="absolute right-0 top-full mt-0.5 py-1 rounded-lg shadow-xl z-50 min-w-[220px]"
          style={{
            backgroundColor: isDark ? "#1c1c1c" : "#ffffff",
            border: `1px solid ${isDark ? "#333333" : "#e5e5e5"}`,
            transformOrigin: "top right",
            animation: "userMenuIn 150ms cubic-bezier(0.16, 1, 0.3, 1) forwards",
          }}
        >
          <style>{`
            @keyframes userMenuIn {
              from {
                opacity: 0;
                transform: scale(0.95) translateY(-4px);
              }
              to {
                opacity: 1;
                transform: scale(1) translateY(0);
              }
            }
          `}</style>

          {/* User info section */}
          <div
            className="px-4 py-2.5"
            style={{ borderBottom: `1px solid ${isDark ? "#333333" : "#e5e5e5"}` }}
          >
            <div
              className="text-[12px] font-medium"
              style={{ color: isDark ? "#e5e5e5" : "#171717" }}
            >
              {name}
            </div>
            <div
              className="text-[11px] mt-0.5 truncate"
              style={{ color: isDark ? "#737373" : "#a3a3a3" }}
            >
              {email}
            </div>
          </div>

          {/* Sign out action */}
          <div className="py-1">
            <button
              onClick={handleSignOut}
              className="w-full px-3 py-2 text-left transition-colors cursor-pointer flex items-center gap-3 rounded-md mx-1"
              style={{ width: "calc(100% - 8px)" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = isDark ? "rgba(255,255,255,0.05)" : "#f5f5f5";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
              }}
            >
              <svg
                className="w-4 h-4 shrink-0"
                style={{ color: isDark ? "#a3a3a3" : "#737373" }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9"
                />
              </svg>
              <span
                className="text-[12px] font-medium"
                style={{ color: isDark ? "#e5e5e5" : "#171717" }}
              >
                Sign out
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
