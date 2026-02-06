"use client";

/**
 * UserMenu - User avatar with dropdown for account actions
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

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Get initials
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const handleSignOut = () => {
    signOut({ callbackUrl: "/login" });
  };

  return (
    <div className="relative" ref={menuRef}>
      {/* Avatar Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center w-7 h-7 rounded-full overflow-hidden transition-opacity hover:opacity-80"
        style={{
          backgroundColor: avatarUrl ? undefined : (isDark ? "#404040" : "#e5e5e5"),
        }}
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
        ) : (
          <span
            className="text-[10px] font-medium"
            style={{ color: isDark ? "#d4d4d4" : "#525252" }}
          >
            {initials}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className="absolute right-0 top-full mt-2 w-56 py-1 z-50"
          style={{
            backgroundColor: isDark ? "#171717" : "#ffffff",
            border: `1px solid ${isDark ? "#404040" : "#e5e5e5"}`,
            boxShadow: isDark
              ? "0 4px 12px rgba(0, 0, 0, 0.4)"
              : "0 4px 12px rgba(0, 0, 0, 0.1)",
          }}
        >
          {/* User Info */}
          <div
            className="px-3 py-2"
            style={{ borderBottom: `1px solid ${isDark ? "#404040" : "#e5e5e5"}` }}
          >
            <div
              className="text-sm font-medium"
              style={{ color: isDark ? "#fafafa" : "#171717" }}
            >
              {name}
            </div>
            <div
              className="text-xs truncate"
              style={{ color: isDark ? "#737373" : "#a3a3a3" }}
            >
              {email}
            </div>
          </div>

          {/* Menu Items */}
          <div className="py-1">
            <button
              onClick={handleSignOut}
              className="w-full text-left px-3 py-2 text-sm transition-colors"
              style={{
                color: isDark ? "#d4d4d4" : "#404040",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = isDark ? "#262626" : "#f5f5f5";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
              }}
            >
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
