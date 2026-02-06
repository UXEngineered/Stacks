"use client";

/**
 * GlobalNav - Unified navigation bar that persists across all pages
 * 
 * Features:
 * - Always-visible logo/brand
 * - Animated breadcrumbs for project context
 * - Context-aware action buttons
 * - Smooth transitions between states
 */

import { useRouter, usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useState, useRef, useEffect, useCallback } from "react";
import { useTheme } from "./ThemeProvider";
import { UserMenu } from "./UserMenu";
import { StacksLogo } from "./StacksLogo";
import { ShareModal } from "./ShareModal";
import { ForkFieldbookModal } from "./ForkFieldbookModal";
import { Button } from "./Button";

interface GlobalNavProps {
  // Project context (when viewing a project)
  projectId?: string;
  projectName?: string;
  onProjectNameChange?: (name: string) => void;
  onDeleteProject?: () => void;
  isDeleteConfirm?: boolean;
  /** When true, viewing in read-only mode (no edit controls) */
  readOnly?: boolean;
}

export function GlobalNav({
  projectId,
  projectName,
  onProjectNameChange,
  onDeleteProject,
  isDeleteConfirm = false,
  readOnly = false,
}: GlobalNavProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  
  // Determine if we're viewing a project
  const isProjectView = !!projectId;
  
  // Name editing state
  const [isEditingName, setIsEditingName] = useState(false);
  const [editNameValue, setEditNameValue] = useState(projectName || "");
  const nameInputRef = useRef<HTMLInputElement>(null);
  
  // Share modal state
  const [isShareOpen, setIsShareOpen] = useState(false);
  
  // Fork modal state
  const [isForkOpen, setIsForkOpen] = useState(false);
  
  // Creating fieldbook state (prevents double-clicks)
  const [isCreatingFieldbook, setIsCreatingFieldbook] = useState(false);
  
  // Header hover state for revealing theme toggle
  const [isHeaderHovered, setIsHeaderHovered] = useState(false);
  
  // Animation timing (matching fieldbook list)
  const easing = 'cubic-bezier(0.16, 1, 0.3, 1)';
  const duration = '220ms';
  
  // Update edit value when project name changes
  useEffect(() => {
    setEditNameValue(projectName || "");
  }, [projectName]);
  
  // Focus input when editing starts
  useEffect(() => {
    if (isEditingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [isEditingName]);
  
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
  
  const startEditingName = useCallback(() => {
    setIsEditingName(true);
    setEditNameValue(projectName || "");
  }, [projectName]);
  
  const saveNameEdit = useCallback(() => {
    if (editNameValue.trim() && onProjectNameChange) {
      onProjectNameChange(editNameValue.trim());
    }
    setIsEditingName(false);
  }, [editNameValue, onProjectNameChange]);
  
  const handleNameKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      saveNameEdit();
    } else if (e.key === "Escape") {
      setIsEditingName(false);
      setEditNameValue(projectName || "");
    }
  }, [saveNameEdit, projectName]);
  
  return (
    <>
      <header 
        className="h-12 flex items-center justify-between px-4 shrink-0"
        style={{ borderBottom: `1px solid ${isDark ? '#404040' : '#e5e5e5'}` }}
        onMouseEnter={() => setIsHeaderHovered(true)}
        onMouseLeave={() => setIsHeaderHovered(false)}
      >
        {/* Left side: Logo + Breadcrumbs */}
        <div className="flex items-center gap-3">
          {/* Logo - always visible, clickable */}
          <Link 
            href="/projects"
            className="flex items-center gap-2 transition-colors"
            style={{ color: isDark ? '#fafafa' : '#171717' }}
          >
            <StacksLogo 
              size={18} 
              color={isDark ? '#fafafa' : '#171717'} 
            />
            <span className="text-sm font-semibold tracking-tight">Stacks</span>
          </Link>
          
          {/* Breadcrumb - slides in when viewing a project */}
          <div 
            className="flex items-center gap-3 overflow-hidden"
            style={{
              maxWidth: isProjectView ? '400px' : '0px',
              opacity: isProjectView ? 1 : 0,
              transition: `max-width 200ms ${easing}, opacity 200ms ${easing}`,
            }}
          >
            <span 
              className="shrink-0"
              style={{ color: isDark ? '#525252' : '#a3a3a3' }}
            >
              /
            </span>
            {isEditingName && !readOnly ? (
              <input
                ref={nameInputRef}
                type="text"
                value={editNameValue}
                onChange={(e) => setEditNameValue(e.target.value)}
                onBlur={saveNameEdit}
                onKeyDown={handleNameKeyDown}
                className="text-sm bg-transparent border-none outline-none min-w-[100px]"
                style={{ color: isDark ? '#a3a3a3' : '#525252' }}
              />
            ) : (
              <div className="group flex items-center gap-1.5 whitespace-nowrap">
                <span 
                  className="text-sm"
                  style={{ color: isDark ? '#a3a3a3' : '#525252' }}
                >
                  {projectName || "Untitled"}
                </span>
                {/* Read-only badge */}
                {readOnly && (
                  <span 
                    className="text-[9px] px-1.5 py-0.5 rounded font-medium"
                    style={{ 
                      backgroundColor: isDark ? '#3f3f46' : '#e5e5e5',
                      color: isDark ? '#a1a1aa' : '#525252',
                    }}
                    title="Viewing in read-only mode"
                  >
                    Read-only
                  </span>
                )}
                {onProjectNameChange && !readOnly && (
                  <button
                    onClick={startEditingName}
                    className="opacity-0 group-hover:opacity-100 p-0.5 transition-opacity"
                    style={{ color: isDark ? '#525252' : '#a3a3a3' }}
                    title="Rename field book"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
                    </svg>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
        
        {/* Right side: Actions */}
        <div className="flex items-center gap-3">
          {/* Project-specific actions - fade in when viewing a project */}
          <div 
            className="flex items-center gap-1"
            style={{
              opacity: isProjectView ? 1 : 0,
              pointerEvents: isProjectView ? 'auto' : 'none',
              transition: `opacity 200ms ${easing}`,
            }}
          >
            {/* Delete button - hidden in read-only mode */}
            {onDeleteProject && !readOnly && (
              isDeleteConfirm ? (
                <button
                  onClick={onDeleteProject}
                  className="px-2 py-0.5 text-[10px] font-medium rounded transition-colors duration-150 cursor-pointer hover:bg-red-600"
                  style={{ 
                    backgroundColor: '#ef4444',
                    color: '#ffffff',
                  }}
                  title="Click to confirm delete"
                >
                  Confirm
                </button>
              ) : (
                <Button
                  variant="tertiary"
                  onClick={onDeleteProject}
                >
                  Delete
                </Button>
              )
            )}
            
            {/* Fork button - hidden in read-only mode */}
            {!readOnly && (
              <Button
                variant="tertiary"
                onClick={() => setIsForkOpen(true)}
              >
                New Phase
              </Button>
            )}
            
            {/* Share button - always visible so owners can share */}
            <Button
              variant="tertiary"
              onClick={() => setIsShareOpen(true)}
            >
              Share
            </Button>
          </div>
          
          {/* Start New Fieldbook button - only show when NOT viewing a project */}
          {!isProjectView && (
            <div 
              style={{
                opacity: isCreatingFieldbook ? 0 : 1,
                pointerEvents: isCreatingFieldbook ? 'none' : 'auto',
                transition: `opacity 150ms ${easing}`,
              }}
            >
              <Button
                variant="primary"
                onClick={handleNewFieldBook}
                disabled={isCreatingFieldbook}
              >
                Start New Fieldbook
              </Button>
            </div>
          )}
          
          {/* User Menu / Sign in */}
          {status === "loading" ? (
            <div className="w-7 h-7" />
          ) : session?.user ? (
            <UserMenu
              name={session.user.name || "User"}
              email={session.user.email || ""}
              avatarUrl={session.user.image}
            />
          ) : (
            <Button variant="tertiary" onClick={() => router.push('/login')}>
              Sign in
            </Button>
          )}

          {/* Theme Toggle - always rightmost */}
          <button
            onClick={toggleTheme}
            className="p-1.5 cursor-pointer"
            style={{ 
              color: isDark ? '#a3a3a3' : '#737373',
              transition: 'color 150ms',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = isDark ? '#ffffff' : '#171717';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = isDark ? '#a3a3a3' : '#737373';
            }}
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
        </div>
      </header>
      
      {/* Share Modal */}
      {isProjectView && session?.user && (
        <ShareModal
          fieldBookId={projectId}
          fieldBookName={projectName || "Untitled"}
          isOpen={isShareOpen}
          onClose={() => setIsShareOpen(false)}
          currentUserId={session.user.id}
        />
      )}
      
      {/* Fork Modal */}
      {isProjectView && (
        <ForkFieldbookModal
          parentFieldbook={{
            id: projectId,
            name: projectName || "Untitled",
          }}
          isOpen={isForkOpen}
          onClose={() => setIsForkOpen(false)}
        />
      )}
    </>
  );
}
