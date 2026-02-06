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
 */

import { useRef, useEffect, useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "../components/ThemeProvider";
import { useFieldbooks } from "../hooks/useFieldbook";
import { useNavContext } from "../components/NavContext";

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
            {fieldbooks.map((fieldbook) => (
              <div
                key={fieldbook.id}
                className="group flex items-center justify-between py-3"
                style={{ borderBottom: `1px solid ${isDark ? '#404040' : '#e5e5e5'}` }}
              >
                {editingId === fieldbook.id ? (
                  // Edit mode
                  <input
                    ref={inputRef}
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={saveEdit}
                    onKeyDown={handleKeyDown}
                    className="flex-1 text-sm bg-transparent border-none outline-none"
                    style={{ color: isDark ? '#fafafa' : '#171717' }}
                  />
                ) : (
                  // View mode - clickable row with navigation transition
                  <div
                    onClick={(e) => handleNavigate(e, fieldbook.id)}
                    className="flex-1 flex items-center gap-2 cursor-pointer"
                  >
                    <span 
                      className="text-sm"
                      style={{ color: isDark ? '#fafafa' : '#171717' }}
                    >
                      {fieldbook.name}
                    </span>
                    <button
                      onClick={(e) => startEditing(e, fieldbook.id, fieldbook.name)}
                      className="opacity-0 group-hover:opacity-100 p-0.5 transition-opacity"
                      style={{ color: isDark ? '#737373' : '#a3a3a3' }}
                      title="Rename"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
                      </svg>
                    </button>
                  </div>
                )}
                <div className="flex items-center gap-3 ml-4 shrink-0">
                  <span 
                    className="text-xs"
                    style={{ color: isDark ? '#a3a3a3' : '#737373' }}
                  >
                    {fieldbook.sources.length} sources, {fieldbook.syntheses.length} syntheses, {fieldbook.artifacts.length} artifacts
                  </span>
                  <button
                    onClick={(e) => handleDelete(e, fieldbook.id)}
                    className="opacity-0 group-hover:opacity-100 p-0.5 transition-opacity"
                    style={{ 
                      color: deleteConfirmId === fieldbook.id 
                        ? '#ef4444' 
                        : (isDark ? '#737373' : '#a3a3a3') 
                    }}
                    title={deleteConfirmId === fieldbook.id ? "Click again to confirm delete" : "Delete"}
                  >
                    {deleteConfirmId === fieldbook.id ? (
                      <span className="text-[10px] font-medium">Confirm?</span>
                    ) : (
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            ))}
            
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
    </main>
  );
}
