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

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useState, useRef, useEffect, useCallback } from "react";
import { useTheme } from "./ThemeProvider";
import { StacksLogo } from "./StacksLogo";
import { TorusAnimation } from "./TorusAnimation";
import { ShareModal } from "./ShareModal";
import { ForkFieldbookModal } from "./ForkFieldbookModal";
import { Button } from "./Button";
import { MovementDrawer } from "./MovementDrawer";
import { useNavContext } from "./NavContext";
import { getUnseenCount } from "@/app/lib/movement/mock";

interface GlobalNavProps {
  // Project context (when viewing a project)
  projectId?: string;
  projectName?: string;
  onProjectNameChange?: (name: string) => void;
  onDeleteProject?: () => void;
  isDeleteConfirm?: boolean;
  /** When true, viewing in read-only mode (no edit controls) */
  readOnly?: boolean;
  /** Movement events for the right-side drawer */
  movement?: { events: import("@/app/lib/movement/types").MovementEvent[] };
  /** Callback when user navigates from Movement drawer to a node */
  onMovementNavigate?: (nodeId: string) => void;
}

export function GlobalNav({
  projectId,
  projectName,
  onProjectNameChange,
  onDeleteProject,
  isDeleteConfirm = false,
  readOnly = false,
  movement,
  onMovementNavigate,
}: GlobalNavProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const { theme } = useTheme();
  const { setIsNavigating } = useNavContext();
  const isDark = theme === "dark";
  
  // Check if this is a newly created fieldbook
  const isNewFieldbook = searchParams.get("new") === "true";
  
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
  
  // Fieldbook actions dropdown state
  const [isActionsOpen, setIsActionsOpen] = useState(false);
  const [isDeleteConfirmInDropdown, setIsDeleteConfirmInDropdown] = useState(false);
  const actionsDropdownRef = useRef<HTMLDivElement>(null);
  
  // Movement drawer state
  const [isMovementDrawerOpen, setIsMovementDrawerOpen] = useState(false);
  
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
  
  // Auto-start editing when viewing a newly created fieldbook
  useEffect(() => {
    if (isNewFieldbook && projectId && projectName && !readOnly) {
      // Start editing mode immediately
      setIsEditingName(true);
      setEditNameValue("");
      
      // Remove the ?new param from URL without navigation (clean up the URL)
      const url = new URL(window.location.href);
      url.searchParams.delete("new");
      window.history.replaceState({}, "", url.toString());
    }
  }, [isNewFieldbook, projectId, projectName, readOnly]);
  
  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (actionsDropdownRef.current && !actionsDropdownRef.current.contains(event.target as Node)) {
        setIsActionsOpen(false);
        setIsDeleteConfirmInDropdown(false);
      }
    }
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  
  // Reset creating state when pathname changes (user navigated away)
  useEffect(() => {
    setIsCreatingFieldbook(false);
  }, [pathname]);
  
  const handleNewFieldBook = async () => {
    // Prevent double-clicks
    if (isCreatingFieldbook) return;
    
    setIsCreatingFieldbook(true);
    setIsNavigating(true); // Signal to other components that navigation is starting
    
    try {
      const res = await fetch("/api/db/fieldbooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Untitled" }),
      });
      
      if (res.ok) {
        const fieldbook = await res.json();
        router.push(`/projects/${fieldbook.id}?new=true`);
        // Don't reset states - let navigation unmount the component
      } else {
        // Only reset on error
        setIsCreatingFieldbook(false);
        setIsNavigating(false);
      }
    } catch (error) {
      console.error("Failed to create fieldbook:", error);
      setIsCreatingFieldbook(false);
      setIsNavigating(false);
    }
  };
  
  const startEditingName = useCallback(() => {
    setIsEditingName(true);
    setEditNameValue(projectName || "");
  }, [projectName]);
  
  const isNameValid = useCallback((name: string) => {
    const trimmed = name.trim();
    return trimmed.length > 0 && trimmed.toLowerCase() !== "untitled";
  }, []);
  
  const saveNameEdit = useCallback(() => {
    const trimmedValue = editNameValue.trim();
    
    // Reject empty or "Untitled" names
    if (!isNameValid(trimmedValue)) {
      // Keep editing mode open and refocus - don't accept invalid name
      nameInputRef.current?.focus();
      return;
    }
    
    if (onProjectNameChange) {
      onProjectNameChange(trimmedValue);
    }
    setIsEditingName(false);
  }, [editNameValue, onProjectNameChange, isNameValid]);
  
  const handleNameKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      saveNameEdit();
    } else if (e.key === "Escape") {
      // Don't allow escape if current name is "Untitled" - must provide a real name
      if (projectName?.toLowerCase() === "untitled") {
        return;
      }
      setIsEditingName(false);
      setEditNameValue(projectName || "");
    }
  }, [saveNameEdit, projectName]);
  
  return (
    <>
      <header 
        className="h-12 flex items-center justify-between px-4 shrink-0"
        style={{ borderBottom: `1px solid ${isDark ? '#404040' : '#e5e5e5'}` }}
      >
        {/* Left side: Logo + Breadcrumbs */}
        <div className="flex items-center gap-3">
          {/* Logo - always visible, clickable */}
          <Link 
            href="/projects"
            className="flex items-center gap-2 transition-colors"
            style={{ color: isDark ? '#fafafa' : '#171717' }}
          >
            <div className="overflow-hidden" style={{ width: 22, height: 22 }}>
              <TorusAnimation
                color={isDark ? "#d4d4d4" : "#525252"}
                size={22}
                speed={1.5}
                glyphSpacing={3}
                glyphSize={0.8}
                glyphWeight={0.7}
              />
            </div>
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
                placeholder="Enter fieldbook name..."
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
          {/* Project-specific actions dropdown - fade in when viewing a project */}
          <div 
            ref={actionsDropdownRef}
            className="relative"
            style={{
              opacity: isProjectView ? 1 : 0,
              pointerEvents: isProjectView ? 'auto' : 'none',
              transition: `opacity 200ms ${easing}`,
            }}
          >
            <Button
              variant="tertiary"
              onClick={() => setIsActionsOpen(!isActionsOpen)}
            >
              Fieldbook Actions
            </Button>
            
            {isActionsOpen && (
              <div 
                className="absolute right-0 top-full mt-0.5 py-1 rounded-lg shadow-xl z-50 min-w-[220px] animate-dropdown-in"
                style={{
                  backgroundColor: isDark ? "#1c1c1c" : "#ffffff",
                  border: `1px solid ${isDark ? "#333333" : "#e5e5e5"}`,
                  transformOrigin: 'top right',
                  animation: 'dropdownIn 150ms cubic-bezier(0.16, 1, 0.3, 1) forwards',
                }}
              >
                <style>{`
                  @keyframes dropdownIn {
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
                {/* Share - always visible */}
                <button
                  onClick={() => {
                    setIsShareOpen(true);
                    setIsActionsOpen(false);
                  }}
                  className="w-full px-3 py-2 text-left transition-colors cursor-pointer flex items-start gap-3 rounded-md mx-1"
                  style={{ width: 'calc(100% - 8px)' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = isDark ? "rgba(255,255,255,0.05)" : "#f5f5f5";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent";
                  }}
                >
                  <svg className="w-4 h-4 mt-0.5 shrink-0" style={{ color: isDark ? "#a3a3a3" : "#737373" }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
                  </svg>
                  <div>
                    <div className="text-[12px] font-medium" style={{ color: isDark ? "#e5e5e5" : "#171717" }}>Share</div>
                    <div className="text-[11px]" style={{ color: isDark ? "#737373" : "#a3a3a3", lineHeight: '1.3' }}>Invite collaborators to this fieldbook</div>
                  </div>
                </button>
                
                {/* New Volume - hidden in read-only mode */}
                {!readOnly && (
                  <button
                    onClick={() => {
                      setIsForkOpen(true);
                      setIsActionsOpen(false);
                    }}
                    className="w-full px-3 py-2 text-left transition-colors cursor-pointer flex items-start gap-3 rounded-md mx-1"
                    style={{ width: 'calc(100% - 8px)' }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = isDark ? "rgba(255,255,255,0.05)" : "#f5f5f5";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "transparent";
                    }}
                  >
                    <svg className="w-4 h-4 mt-0.5 shrink-0" style={{ color: isDark ? "#a3a3a3" : "#737373" }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                    </svg>
                    <div>
                      <div className="text-[12px] font-medium" style={{ color: isDark ? "#e5e5e5" : "#171717" }}>New Volume</div>
                      <div className="text-[11px]" style={{ color: isDark ? "#737373" : "#a3a3a3", lineHeight: '1.3' }}>Start a new iteration of this fieldbook</div>
                    </div>
                  </button>
                )}
                
                {/* Delete - hidden in read-only mode */}
                {onDeleteProject && !readOnly && (
                  <>
                    <div 
                      className="my-1.5 mx-3"
                      style={{ borderTop: `1px solid ${isDark ? "#333333" : "#e5e5e5"}` }}
                    />
                    {isDeleteConfirmInDropdown ? (
                      <button
                        onClick={() => {
                          onDeleteProject();
                          setIsActionsOpen(false);
                          setIsDeleteConfirmInDropdown(false);
                        }}
                        className="w-full px-3 py-2 text-left transition-colors cursor-pointer flex items-start gap-3 rounded-md mx-1"
                        style={{ 
                          width: 'calc(100% - 8px)',
                          backgroundColor: '#ef4444',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#dc2626';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#ef4444';
                        }}
                      >
                        <svg className="w-4 h-4 mt-0.5 shrink-0" style={{ color: '#ffffff' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                        </svg>
                        <div>
                          <div className="text-[12px] font-medium" style={{ color: '#ffffff' }}>Confirm Delete</div>
                          <div className="text-[11px]" style={{ color: 'rgba(255,255,255,0.7)', lineHeight: '1.3' }}>Click to permanently delete</div>
                        </div>
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setIsDeleteConfirmInDropdown(true);
                          // Reset after 3 seconds if not confirmed
                          setTimeout(() => setIsDeleteConfirmInDropdown(false), 3000);
                        }}
                        className="w-full px-3 py-2 text-left transition-colors cursor-pointer flex items-start gap-3 rounded-md mx-1"
                        style={{ width: 'calc(100% - 8px)' }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = isDark ? "rgba(255,255,255,0.05)" : "#f5f5f5";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = "transparent";
                        }}
                      >
                        <svg className="w-4 h-4 mt-0.5 shrink-0" style={{ color: '#ef4444' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                        </svg>
                        <div>
                          <div className="text-[12px] font-medium" style={{ color: '#ef4444' }}>Delete</div>
                          <div className="text-[11px]" style={{ color: isDark ? "#737373" : "#a3a3a3", lineHeight: '1.3' }}>Remove this fieldbook permanently</div>
                        </div>
                      </button>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
          
          {/* Movement - opens right-side drawer */}
          <div
            className="relative inline-block"
            style={{
              opacity: isProjectView ? 1 : 0,
              pointerEvents: isProjectView ? 'auto' : 'none',
              transition: `opacity 200ms ${easing}`,
            }}
          >
            <Button
              variant="tertiary"
              onClick={() => setIsMovementDrawerOpen(true)}
            >
              Movement
            </Button>
            {isProjectView && movement && (() => {
              const unseen = getUnseenCount(movement.events, projectId || '', session?.user?.id);
              if (unseen === 0) return null;
              return (
                <span
                  className="absolute -top-0.5 -right-0.5 min-w-[14px] h-3.5 px-1 flex items-center justify-center rounded-full text-[9px] font-medium"
                  style={{
                    backgroundColor: isDark ? "#8b5cf6" : "#7c3aed",
                    color: "#ffffff",
                  }}
                >
                  {unseen > 99 ? "99+" : unseen}
                </span>
              );
            })()}
          </div>
          
          {/* Start New Fieldbook button - only show when NOT viewing a project */}
          {!isProjectView && (
            <div 
              style={{
                opacity: isCreatingFieldbook ? 0 : 1,
                pointerEvents: isCreatingFieldbook ? 'none' : 'auto',
                transition: 'opacity 100ms ease-out',
              }}
            >
              <Button
                variant="primary"
                onClick={handleNewFieldBook}
              >
                Start New Fieldbook
              </Button>
            </div>
          )}
          
          {/* User identifier / Sign in - rightmost */}
          {status === "loading" ? (
            <div className="w-7 h-7" />
          ) : session?.user ? (
            <Button 
              variant="tertiary"
              onClick={() => {}}
              title={session.user.name || session.user.email || "User"}
            >
              {(() => {
                const name = session.user.name || session.user.email || "US";
                const parts = name.split(/[\s@]+/);
                if (parts.length >= 2) {
                  return (parts[0][0] + parts[1][0]).toUpperCase();
                }
                return name.slice(0, 2).toUpperCase();
              })()}
            </Button>
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

      {/* Movement Drawer */}
      {isProjectView && projectId && (
        <MovementDrawer
          isOpen={isMovementDrawerOpen}
          onClose={() => setIsMovementDrawerOpen(false)}
          events={movement?.events ?? []}
          projectId={projectId}
          userId={session?.user?.id}
          onNavigateToItem={(nodeId) => {
            onMovementNavigate?.(nodeId);
            setIsMovementDrawerOpen(false);
          }}
        />
      )}
    </>
  );
}
