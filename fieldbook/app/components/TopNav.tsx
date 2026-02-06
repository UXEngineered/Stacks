"use client";

/**
 * Top navigation bar for the field books list view
 * 
 * Minimal design:
 * - No background color
 * - Only essential actions
 * - Light/dark mode toggle
 * - User menu when logged in
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { PlusIcon } from "./icons";
import { useTheme } from "./ThemeProvider";
import { UserMenu } from "./UserMenu";
import { StacksLogo } from "./StacksLogo";

export function TopNav() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { theme, toggleTheme } = useTheme();
  const [isCreatingFieldbook, setIsCreatingFieldbook] = useState(false);

  const handleNewFieldBook = async () => {
    // Prevent double-clicks
    if (isCreatingFieldbook) return;
    
    setIsCreatingFieldbook(true);
    try {
      const res = await fetch("/api/db/fieldbooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Untitled" }),
      });
      
      if (res.ok) {
        const fieldbook = await res.json();
        router.push(`/projects/${fieldbook.id}`);
      }
    } catch (error) {
      console.error("Failed to create fieldbook:", error);
    } finally {
      setIsCreatingFieldbook(false);
    }
  };

  const isDark = theme === "dark";
  
  return (
    <header 
      className="h-12 flex items-center justify-between px-6"
      style={{ 
        borderBottom: `1px solid ${isDark ? '#404040' : '#e5e5e5'}`,
      }}
    >
      {/* Left: Branding */}
      <div className="flex items-center gap-2">
        <StacksLogo 
          size={18} 
          color={isDark ? '#fafafa' : '#171717'} 
        />
        <span 
          className="text-sm font-semibold tracking-tight"
          style={{ color: isDark ? '#fafafa' : '#171717' }}
        >
          Stacks
        </span>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-4">
        <button
          onClick={handleNewFieldBook}
          disabled={isCreatingFieldbook}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50"
          style={{ color: isDark ? '#d4d4d4' : '#404040' }}
          title="New Field Book"
        >
          <PlusIcon className="w-3.5 h-3.5" />
          <span>{isCreatingFieldbook ? "Creating..." : "New Field Book"}</span>
        </button>
        
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-1.5 transition-colors"
          style={{ color: isDark ? '#a3a3a3' : '#525252' }}
          title={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
        >
          {theme === "light" ? (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
            </svg>
          )}
        </button>
        
        {/* User Menu or Sign In */}
        {status === "loading" ? (
          <div className="w-7 h-7" /> // Placeholder while loading
        ) : session?.user ? (
          <UserMenu
            name={session.user.name || "User"}
            email={session.user.email || ""}
            avatarUrl={session.user.image}
          />
        ) : (
          <Link
            href="/login"
            className="text-xs font-medium transition-colors"
            style={{ color: isDark ? '#a3a3a3' : '#525252' }}
          >
            Sign in
          </Link>
        )}
      </div>
    </header>
  );
}
