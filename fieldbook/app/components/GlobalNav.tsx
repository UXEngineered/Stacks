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
            className="flex items-center gap-3"
            style={{
              opacity: isProjectView ? 1 : 0,
              pointerEvents: isProjectView ? 'auto' : 'none',
              transition: `opacity 200ms ${easing}`,
            }}
          >
            {/* Delete button - hidden in read-only mode */}
            {onDeleteProject && !readOnly && (
              <button
                onClick={onDeleteProject}
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs transition-colors"
                style={{
                  color: isDeleteConfirm ? '#ef4444' : (isDark ? '#737373' : '#a3a3a3'),
                  border: `1px solid ${isDeleteConfirm ? '#ef4444' : (isDark ? '#404040' : '#e5e5e5')}`,
                }}
                title={isDeleteConfirm ? "Click again to confirm delete" : "Delete field book"}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                </svg>
                {isDeleteConfirm ? "Confirm?" : "Delete"}
              </button>
            )}
            
            {/* Fork button - hidden in read-only mode */}
            {!readOnly && (
              <button
                onClick={() => setIsForkOpen(true)}
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs transition-colors"
                style={{
                  color: isDark ? '#a3a3a3' : '#525252',
                  border: `1px solid ${isDark ? '#404040' : '#e5e5e5'}`,
                }}
                title="Start a new phase from this fieldbook"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
                </svg>
                New Phase
              </button>
            )}
            
            {/* Share button - always visible so owners can share */}
            <button
              onClick={() => setIsShareOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs transition-colors"
              style={{
                color: isDark ? '#a3a3a3' : '#525252',
                border: `1px solid ${isDark ? '#404040' : '#e5e5e5'}`,
              }}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
              </svg>
              Share
            </button>
          </div>
          
          {/* Theme Toggle - always visible */}
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

          {/* Start New Fieldbook button - fade in when NOT viewing a project */}
          <div 
            style={{
              opacity: (isProjectView || isCreatingFieldbook) ? 0 : 1,
              pointerEvents: (isProjectView || isCreatingFieldbook) ? 'none' : 'auto',
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
          
          {/* User Menu - always visible */}
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
