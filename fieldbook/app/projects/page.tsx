"use client";

/**
 * Field Books List Page (/projects)
 * 
 * Minimal table structure:
 * - Simple rows with subtle horizontal rules
 * - Clean typography
 * - Inline rename capability
 * - Persisted to JSON database
 * - Smooth fade-out transition on navigation
 * - Hover actions slide in from right
 */

import { useRef, useEffect, useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "../components/ThemeProvider";
import { useFieldbooks } from "../hooks/useFieldbook";
import { useNavContext } from "../components/NavContext";
import { ShareModal } from "../components/ShareModal";

export default function ProjectsPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const router = useRouter();
  const { clearNavState } = useNavContext();
  
  // Clear nav state when on projects list (no project context)
  useEffect(() => {
    clearNavState();
  }, [clearNavState]);
  
  // Fetch fieldbooks from persistent storage
  const { fieldbooks, isLoading, updateFieldbook, deleteFieldbook } = useFieldbooks();
  
  // Navigation transition state
  const [isNavigating, setIsNavigating] = useState(false);
  const [navigatingTo, setNavigatingTo] = useState<string | null>(null);
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [shareModalId, setShareModalId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when editing starts
  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingId]);

  const startEditing = useCallback((e: React.MouseEvent, projectId: string, currentName: string) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingId(projectId);
    setEditValue(currentName);
  }, []);

  const saveEdit = useCallback(async () => {
    if (editingId && editValue.trim()) {
      await updateFieldbook(editingId, { name: editValue.trim() });
    }
    setEditingId(null);
    setEditValue("");
  }, [editingId, editValue, updateFieldbook]);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setEditValue("");
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      saveEdit();
    } else if (e.key === "Escape") {
      cancelEdit();
    }
  }, [saveEdit, cancelEdit]);

  const handleDelete = useCallback(async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (deleteConfirmId === id) {
      // Second click - actually delete
      await deleteFieldbook(id);
      setDeleteConfirmId(null);
    } else {
      // First click - show confirm state
      setDeleteConfirmId(id);
      // Reset after 3 seconds if not confirmed
      setTimeout(() => setDeleteConfirmId((current) => current === id ? null : current), 3000);
    }
  }, [deleteConfirmId, deleteFieldbook]);

  const handleShare = useCallback((e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    setShareModalId(id);
  }, []);

  // Handle navigation with fade-out transition
  const handleNavigate = useCallback((e: React.MouseEvent, id: string) => {
    e.preventDefault();
    setIsNavigating(true);
    setNavigatingTo(id);
    
    // Wait for fade-out animation before navigating
    setTimeout(() => {
      router.push(`/projects/${id}`);
    }, 200);
  }, [router]);

  // Get the fieldbook for the share modal
  const shareFieldbook = shareModalId ? fieldbooks.find(f => f.id === shareModalId) : null;
  
  return (
    <main 
      className="flex-1 w-full max-w-4xl mx-auto px-6 py-12 transition-all duration-200 ease-out"
      style={{
        opacity: isNavigating ? 0 : 1,
        transform: isNavigating ? 'translateY(-8px)' : 'translateY(0)',
      }}
    >
        {/* Header */}
        <h1 
          className="text-sm font-medium mb-6"
          style={{ color: isDark ? '#a3a3a3' : '#525252' }}
        >
          Field Books
        </h1>

        {/* Loading state */}
        {isLoading && (
          <div 
            className="py-12 text-center text-sm"
            style={{ color: isDark ? '#a3a3a3' : '#737373' }}
          >
            Loading...
          </div>
        )}

        {/* Projects Table */}
        {!isLoading && (
          <div>
            {fieldbooks.map((fieldbook) => {
              const isHovered = hoveredId === fieldbook.id;
              const isEditing = editingId === fieldbook.id;
              const isConfirmingDelete = deleteConfirmId === fieldbook.id;
              
              // Shared easing for all animations - Linear-style smooth curve
              const easing = 'cubic-bezier(0.25, 0.1, 0.25, 1.0)';
              const duration = '150ms';
              
              return (
                <div
                  key={fieldbook.id}
                  className="relative overflow-hidden cursor-pointer"
                  style={{ 
                    borderBottom: `1px solid ${isDark ? '#404040' : '#e5e5e5'}`,
                    backgroundColor: isHovered && !isEditing 
                      ? (isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)') 
                      : 'transparent',
                    transition: `background-color ${duration} ${easing}`,
                  }}
                  onMouseEnter={() => setHoveredId(fieldbook.id)}
                  onMouseLeave={() => {
                    setHoveredId(null);
                    // Reset delete confirm when leaving row
                    if (deleteConfirmId === fieldbook.id) {
                      setDeleteConfirmId(null);
                    }
                  }}
                  onClick={(e) => !isEditing && handleNavigate(e, fieldbook.id)}
                >
                  <div className="flex items-center h-11 pl-3 pr-1.5">
                    {/* Left side: Title */}
                    <div className="flex-1 min-w-0">
                      {isEditing ? (
                        <input
                          ref={inputRef}
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={saveEdit}
                          onKeyDown={handleKeyDown}
                          className="w-full text-sm bg-transparent border-none outline-none py-3"
                          style={{ color: isDark ? '#fafafa' : '#171717' }}
                        />
                      ) : (
                        <span 
                          className="text-sm block truncate py-3"
                          style={{ color: isDark ? '#fafafa' : '#171717' }}
                        >
                          {fieldbook.name}
                        </span>
                      )}
                    </div>
                    
                    {/* Right side: Meta + Actions */}
                    <div className="flex items-center shrink-0 h-full">
                      {/* Meta information - slides left when actions appear */}
                      <div 
                        style={{
                          transform: isHovered && !isEditing ? 'translateX(-6px)' : 'translateX(0)',
                          transition: `transform ${duration} ${easing}`,
                        }}
                      >
                        <span 
                          className="text-xs whitespace-nowrap"
                          style={{ color: isDark ? '#a3a3a3' : '#737373' }}
                        >
                          {fieldbook.sources.length} sources, {fieldbook.syntheses.length} syntheses, {fieldbook.artifacts.length} artifacts
                        </span>
                      </div>
                      
                      {/* Actions container - fades in and slides */}
                      <div 
                        className="flex items-center gap-1"
                        style={{
                          opacity: isHovered && !isEditing ? 1 : 0,
                          transform: isHovered && !isEditing ? 'translateX(0)' : 'translateX(4px)',
                          marginLeft: isHovered && !isEditing ? '12px' : '0',
                          pointerEvents: isHovered && !isEditing ? 'auto' : 'none',
                          transition: `opacity ${duration} ${easing}, transform ${duration} ${easing}, margin-left ${duration} ${easing}`,
                        }}
                      >
                        {/* Edit button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            startEditing(e, fieldbook.id, fieldbook.name);
                          }}
                          className={`p-1.5 transition-colors duration-150 rounded cursor-pointer ${
                            isDark 
                              ? 'text-neutral-400 hover:text-white' 
                              : 'text-neutral-500 hover:text-neutral-900'
                          }`}
                          title="Edit name"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
                          </svg>
                        </button>
                        
                        {/* Share button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleShare(e, fieldbook.id);
                          }}
                          className={`p-1.5 transition-colors duration-150 rounded cursor-pointer ${
                            isDark 
                              ? 'text-neutral-400 hover:text-white' 
                              : 'text-neutral-500 hover:text-neutral-900'
                          }`}
                          title="Share"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
                          </svg>
                        </button>
                        
                        {/* Delete button */}
                        {isConfirmingDelete ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(e, fieldbook.id);
                            }}
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
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(e, fieldbook.id);
                            }}
                            className={`p-1.5 transition-colors duration-150 rounded cursor-pointer ${
                              isDark 
                                ? 'text-neutral-400 hover:text-white' 
                                : 'text-neutral-500 hover:text-neutral-900'
                            }`}
                            title="Delete"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            
            {fieldbooks.length === 0 && (
              <div 
                className="py-12 text-center text-sm"
                style={{ color: isDark ? '#a3a3a3' : '#737373' }}
              >
                No field books yet
              </div>
            )}
          </div>
        )}

        {/* Share Modal */}
        {shareFieldbook && (
          <ShareModal
            fieldBookId={shareFieldbook.id}
            fieldBookName={shareFieldbook.name}
            isOpen={!!shareModalId}
            onClose={() => setShareModalId(null)}
            currentUserId="current-user"
          />
        )}
    </main>
  );
}
