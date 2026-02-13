"use client";

/**
 * SourceEditor - Editor-first Source editing experience
 * 
 * Features:
 * - Inline editable title with auto-inference from content
 * - Rich text editor
 * - Autosave after 10s idle
 * - Drag-drop file support
 * - Import from Google Drive or file upload (small buttons)
 * - Version tracking
 */

import { useState, useCallback, useRef, useEffect, useLayoutEffect } from "react";
import type { SourceItem, SourceKind } from "./types";
import { DocumentEditor } from "../editor/DocumentEditor";
import type { FieldbookDocument } from "../../lib/blocks";
import { useTheme } from "../ThemeProvider";
import { parseTranscript } from "../../lib/transcript-parser";
import { ExportDropdown } from "../ExportDropdown";
import { Button } from "../Button";

// Check if Google Drive is configured
const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
const isGoogleConfigured = GOOGLE_API_KEY && GOOGLE_CLIENT_ID && 
  GOOGLE_CLIENT_ID !== "your-google-client-id.apps.googleusercontent.com";

// Autosave delay in ms
const AUTOSAVE_DELAY = 10000;

interface SourceEditorProps {
  /** The source being edited (null for new source) */
  source: SourceItem | null;
  /** Whether this is a new unsaved source */
  isNew?: boolean;
  /** Called when save is triggered, with optional autoSynthesize flag */
  onSave?: (source: SourceItem, autoSynthesize?: boolean) => void;
  /** Called when discarding a new unsaved source */
  onDiscard?: () => void;
  /** Called when deleting an existing source */
  onDelete?: (id: string) => void;
  /** Called when user wants to synthesize this source */
  onSynthesize?: (sourceId: string) => void;
  /** When true, disables all editing controls */
  readOnly?: boolean;
  /** Whether this source has downstream items that depend on it */
  hasDownstreamDependencies?: boolean;
}

export function SourceEditor({
  source,
  isNew = false,
  onSave,
  onDiscard,
  onDelete,
  onSynthesize,
  readOnly = false,
  hasDownstreamDependencies = false,
}: SourceEditorProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  
  // Auto-synthesize toggle - persisted to localStorage
  const [autoSynthesize, setAutoSynthesize] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("fieldbook-auto-synthesize");
      return stored === "true";
    }
    return false;
  });
  
  // Persist auto-synthesize preference
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("fieldbook-auto-synthesize", autoSynthesize.toString());
    }
  }, [autoSynthesize]);
  
  // Delete confirmation state (for sources with downstream dependencies)
  const [isDeleteConfirm, setIsDeleteConfirm] = useState(false);
  
  // Reset delete confirm state after timeout
  useEffect(() => {
    if (isDeleteConfirm) {
      const timer = setTimeout(() => setIsDeleteConfirm(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isDeleteConfirm]);
  
  const [sourceKind, setSourceKind] = useState<SourceKind>(source?.kind || "note");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const autosaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Initialize state from source or defaults for new
  const [title, setTitle] = useState(source?.title || "");
  const [content, setContent] = useState<FieldbookDocument>(() => getInitialContent(source));
  const [isSaving, setIsSaving] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  
  // Track if user has manually edited the title
  const [titleManuallyEdited, setTitleManuallyEdited] = useState(!!source?.title);
  
  // Track original values to detect dirty state
  const originalTitle = useRef(source?.title || "");
  const originalContent = useRef(source?.content || "");
  
  // Track dirty state
  const [isDirty, setIsDirty] = useState(isNew);
  
  // Track whether source has been saved at least once (prevents autosave on brand-new sources)
  const [hasBeenSaved, setHasBeenSaved] = useState(!isNew);
  
  // Track if content has been modified (separate from title)
  const contentRef = useRef<string>(source?.content || "");

  // Extract title from content (first line)
  const inferTitleFromContent = useCallback((doc: FieldbookDocument): string => {
    if (!doc.content || doc.content.length === 0) return "";
    
    // Get first non-empty paragraph
    for (const block of doc.content) {
      if (block.type === "paragraph" && block.content && block.content.length > 0) {
        const firstText = block.content.find((n: { type: string }) => n.type === "text") as { text?: string } | undefined;
        if (firstText?.text) {
          let inferred = firstText.text.trim();
          
          // Strip markdown header syntax
          inferred = inferred.replace(/^#+\s*/, "");
          
          // Truncate if too long
          if (inferred.length > 60) {
            inferred = inferred.slice(0, 57) + "...";
          }
          
          return inferred;
        }
      }
      if (block.type === "heading" && block.content && block.content.length > 0) {
        const headingText = block.content.find((n: { type: string }) => n.type === "text") as { text?: string } | undefined;
        if (headingText?.text) {
          return headingText.text.trim().slice(0, 60);
        }
      }
    }
    
    return "";
  }, []);

  // Update dirty state when title changes
  useEffect(() => {
    const titleChanged = title !== originalTitle.current;
    const contentChanged = contentRef.current !== originalContent.current;
    setIsDirty(titleChanged || contentChanged || isNew);
  }, [title, isNew]);

  // Refs for latest values — avoids stale closures in autosave timer
  const titleRef = useRef(title);
  titleRef.current = title;
  const contentLatestRef = useRef(content);
  contentLatestRef.current = content;

  // Perform save - triggerAutoSynthesize is only true for manual saves, not autosave
  const performSave = useCallback((finalTitle?: string, triggerAutoSynthesize: boolean = false) => {
    // Read from refs so autosave always has the freshest values
    const currentTitle = titleRef.current;
    const currentContent = contentLatestRef.current;
    const titleToUse = finalTitle || currentTitle || inferTitleFromContent(currentContent) || "Untitled";
    
    // Don't save if no meaningful content
    const hasContent = currentContent.content?.some(
      (block) => block.content && block.content.length > 0
    );
    if (!hasContent && !titleToUse.trim()) return;

    setIsSaving(true);
    const now = new Date().toISOString();
    const serializedContent = JSON.stringify(currentContent);
    
    const savedSource: SourceItem = {
      id: source?.id || `source-${Date.now()}`,
      type: "source",
      title: titleToUse.trim(),
      content: serializedContent,
      kind: sourceKind,
      url: source?.url,
      createdAt: source?.createdAt || now,
      updatedAt: now,
      lastSavedAt: now,
      version: (source?.version || 0) + 1,
      highlights: source?.highlights,
    };

    // Update original refs after save
    originalTitle.current = titleToUse.trim();
    originalContent.current = serializedContent;
    
    // Update title if it was auto-inferred
    if (!currentTitle && titleToUse !== "Untitled") {
      setTitle(titleToUse);
    }
    
    setIsDirty(false);
    setHasBeenSaved(true);
    // Only trigger auto-synthesis on manual save, not autosave
    onSave(savedSource, triggerAutoSynthesize && isNew && autoSynthesize);
    
    setTimeout(() => setIsSaving(false), 500);
  }, [source, sourceKind, onSave, inferTitleFromContent, isNew, autoSynthesize]);

  // Handle manual save - only manual save triggers auto-synthesis
  const handleSave = useCallback(() => {
    // Clear any pending autosave
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }
    performSave(undefined, true); // Pass true to trigger auto-synthesis
  }, [performSave]);

  // Schedule autosave — only for sources that have been saved at least once
  const hasBeenSavedRef = useRef(hasBeenSaved);
  hasBeenSavedRef.current = hasBeenSaved;
  const isDirtyRef = useRef(isDirty);
  isDirtyRef.current = isDirty;

  const scheduleAutosave = useCallback(() => {
    // Clear existing timer
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }
    
    // Don't autosave brand-new sources — require a manual first save
    if (!hasBeenSavedRef.current) return;

    // Schedule new autosave (reads refs for fresh state)
    autosaveTimerRef.current = setTimeout(() => {
      if (isDirtyRef.current) {
        performSave();
      }
    }, AUTOSAVE_DELAY);
  }, [performSave]);

  // Handle content changes from editor
  const handleContentChange = useCallback((newContent: FieldbookDocument) => {
    setContent(newContent);
    const serialized = JSON.stringify(newContent);
    contentRef.current = serialized;
    
    // Auto-infer title if not manually edited
    if (!titleManuallyEdited && !title) {
      const inferred = inferTitleFromContent(newContent);
      if (inferred) {
        setTitle(inferred);
      }
    }
    
    // Check if content changed from original
    const contentChanged = serialized !== originalContent.current;
    const titleChanged = title !== originalTitle.current;
    setIsDirty(contentChanged || titleChanged || isNew);
    
    // Schedule autosave
    scheduleAutosave();
  }, [title, titleManuallyEdited, isNew, inferTitleFromContent, scheduleAutosave]);

  // Handle title change (mark as manually edited)
  const handleTitleChange = useCallback((newTitle: string) => {
    setTitle(newTitle);
    if (newTitle !== inferTitleFromContent(content)) {
      setTitleManuallyEdited(true);
    }
  }, [content, inferTitleFromContent]);

  // Cleanup autosave timer on unmount
  useEffect(() => {
    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }
    };
  }, []);

  // Scroll to top when switching between sources (before browser paints)
  useLayoutEffect(() => {
    if (scrollContainerRef.current) scrollContainerRef.current.scrollTop = 0;
  }, [source?.id]);

  // Save on blur (window/tab switch)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && isDirty) {
        performSave();
      }
    };
    
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isDirty, performSave]);

  // Process a file (shared between upload and drag-drop)
  const processFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const parsed = parseTranscript(text, file.name);
      
      setTitle(parsed.title);
      setTitleManuallyEdited(true); // Treat imported title as intentional
      setContent(textToDocument(parsed.content));
      contentRef.current = JSON.stringify(textToDocument(parsed.content));
      setSourceKind("document");
      setIsDirty(true);
      
      // Schedule autosave for imported content
      scheduleAutosave();
    };
    reader.readAsText(file);
  }, [scheduleAutosave]);

  // Handle file upload
  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    processFile(file);
    
    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [processFile]);

  // Handle drag-drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file && /\.(txt|vtt|srt)$/i.test(file.name)) {
      processFile(file);
    }
  }, [processFile]);

  // Handle Google Drive import
  const handleGoogleDriveImport = useCallback(() => {
    if (!isGoogleConfigured) return;
    
    // Load Google API if not loaded
    const loadAndOpenPicker = () => {
      const tokenClient = (window as { google?: { accounts?: { oauth2?: { initTokenClient: (config: {
        client_id: string;
        scope: string;
        callback: (response: { access_token?: string; error?: string }) => void;
      }) => { requestAccessToken: () => void } } } } }).google?.accounts?.oauth2?.initTokenClient({
        client_id: GOOGLE_CLIENT_ID!,
        scope: "https://www.googleapis.com/auth/drive.readonly",
        callback: async (response) => {
          if (response.error || !response.access_token) {
            console.error("Google auth failed");
            return;
          }

          const picker = new (window as { google: { picker: { 
            PickerBuilder: new () => {
              setOAuthToken: (token: string) => unknown;
              setDeveloperKey: (key: string) => unknown;
              addView: (view: unknown) => unknown;
              setCallback: (cb: (data: { action: string; docs?: { id: string; name: string }[] }) => void) => unknown;
              build: () => { setVisible: (v: boolean) => void };
            };
            ViewId: { DOCUMENTS: string };
          } } }).google.picker.PickerBuilder()
            .setOAuthToken(response.access_token)
            .setDeveloperKey(GOOGLE_API_KEY!)
            .addView((window as { google: { picker: { ViewId: { DOCUMENTS: string } } } }).google.picker.ViewId.DOCUMENTS)
            .setCallback(async (data: { action: string; docs?: { id: string; name: string }[] }) => {
              if (data.action === "picked" && data.docs?.[0]) {
                const doc = data.docs[0];
                try {
                  const res = await fetch("/api/integrations/google-drive/document", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ documentId: doc.id, accessToken: response.access_token }),
                  });
                  if (res.ok) {
                    const { title: docTitle, content: docContent } = await res.json();
                    setTitle(docTitle || doc.name);
                    setTitleManuallyEdited(true);
                    setContent(textToDocument(docContent));
                    contentRef.current = JSON.stringify(textToDocument(docContent));
                    setSourceKind("document");
                    setIsDirty(true);
                    // Autosave imported content after delay
                    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
                    autosaveTimerRef.current = setTimeout(() => performSave(docTitle || doc.name), AUTOSAVE_DELAY);
                  }
                } catch (err) {
                  console.error("Failed to import:", err);
                }
              }
            })
            .build();
          picker.setVisible(true);
        },
      });
      tokenClient?.requestAccessToken();
    };

    // Ensure scripts are loaded
    if (!(window as { gapi?: unknown }).gapi) {
      const script = document.createElement("script");
      script.src = "https://apis.google.com/js/api.js";
      script.onload = () => {
        (window as { gapi: { load: (api: string, cb: () => void) => void } }).gapi.load("picker", loadAndOpenPicker);
      };
      document.body.appendChild(script);
      
      const gsiScript = document.createElement("script");
      gsiScript.src = "https://accounts.google.com/gsi/client";
      document.body.appendChild(gsiScript);
    } else {
      loadAndOpenPicker();
    }
  }, []);

  // Status badge — only show Draft and Saving (auto-save + Save button handle the rest)
  const getStatus = () => {
    if (isSaving) return { label: "Saving...", type: "saving" as const };
    if (isNew && !source?.lastSavedAt && !isDirty) return { label: "Draft", type: "draft" as const };
    return null;
  };

  const status = getStatus();

  // Cmd+S / Ctrl+S keyboard shortcut for manual save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        if (isDirty) handleSave();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isDirty, handleSave]);

  return (
    <div 
      ref={editorContainerRef}
      className="h-full flex flex-col relative overflow-hidden"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag-drop overlay */}
      {isDragOver && (
        <div 
          className="absolute inset-0 z-50 flex items-center justify-center"
          style={{
            backgroundColor: isDark ? "rgba(0,0,0,0.8)" : "rgba(255,255,255,0.9)",
            border: `2px dashed ${isDark ? "#525252" : "#a3a3a3"}`,
          }}
        >
          <div className="text-center">
            <svg 
              className="w-8 h-8 mx-auto mb-2" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24" 
              strokeWidth={1.5}
              style={{ color: isDark ? "#737373" : "#737373" }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            <p 
              className="text-sm font-medium"
              style={{ color: isDark ? "#a3a3a3" : "#525252" }}
            >
              Drop file to import
            </p>
            <p 
              className="text-xs mt-1"
              style={{ color: isDark ? "#525252" : "#a3a3a3" }}
            >
              .txt, .vtt, .srt
            </p>
          </div>
        </div>
      )}
      {/* Minimal header bar */}
      <div 
        className="px-8 py-2.5 flex items-center justify-between shrink-0"
        style={{ 
          borderBottom: `1px solid ${isDark ? "#262626" : "#e5e5e5"}`,
        }}
      >
        <div className="flex items-center gap-2">
          <span 
            className="text-[10px] font-medium tracking-wider uppercase"
            style={{ color: isDark ? "#d4d4d4" : "#525252" }}
          >
            Source
          </span>
          {status && (
            <>
              <span style={{ color: isDark ? "#333" : "#d4d4d4" }}>·</span>
              <span 
                className="text-[9px] px-1.5 py-0.5 rounded-sm font-medium"
                style={{ 
                  backgroundColor: status.type === "draft"
                    ? (isDark ? "rgba(252, 211, 77, 0.15)" : "rgba(180, 83, 9, 0.1)")
                    : "transparent",
                  color: status.type === "saving"
                    ? (isDark ? "#22c55e" : "#16a34a")
                    : (isDark ? "#fcd34d" : "#b45309"),
                }}
              >
                {status.label}
              </span>
            </>
          )}
        </div>
        
        {!readOnly && (
          <div className="flex items-center gap-1">
            {/* Auto-synthesize toggle - only show for new sources */}
            {isNew && (
              <button
                onClick={() => setAutoSynthesize(!autoSynthesize)}
                className="flex items-center gap-1.5 px-2 py-1 transition-colors"
                style={{ 
                  color: autoSynthesize 
                    ? (isDark ? "#a3a3a3" : "#525252") 
                    : (isDark ? "#525252" : "#a3a3a3"),
                }}
                title={autoSynthesize ? "Auto-synthesize is on" : "Auto-synthesize is off"}
              >
                {/* Toggle switch */}
                <div 
                  className="relative w-6 h-3.5 rounded-full transition-colors"
                  style={{ 
                    backgroundColor: autoSynthesize 
                      ? (isDark ? "#404040" : "#d4d4d4") 
                      : (isDark ? "#262626" : "#e5e5e5"),
                  }}
                >
                  <div 
                    className="absolute top-0.5 w-2.5 h-2.5 rounded-full transition-all"
                    style={{ 
                      left: autoSynthesize ? "12px" : "2px",
                      backgroundColor: autoSynthesize 
                        ? (isDark ? "#fafafa" : "#171717") 
                        : (isDark ? "#525252" : "#a3a3a3"),
                    }}
                  />
                </div>
                <span style={{ fontSize: "12.5px", fontWeight: 500 }}>Auto-synthesize</span>
              </button>
            )}
            {isNew && onDiscard && (
              <Button variant="tertiary" onClick={onDiscard}>
                Discard
              </Button>
            )}
            {!isNew && source && (
              <ExportDropdown 
                title={title || "Untitled Source"} 
                content={content}
                disabled={isNew}
              />
            )}
            {!isNew && onSynthesize && source && (
              <Button
                variant="secondary"
                onClick={() => onSynthesize(source.id)}
              >
                Synthesize
              </Button>
            )}
            {!isNew && onDelete && source && (
              hasDownstreamDependencies ? (
                isDeleteConfirm ? (
                  <button
                    onClick={() => onDelete(source.id)}
                    className="inline-flex items-center justify-center cursor-pointer"
                    style={{
                      fontSize: "12.5px",
                      fontWeight: 500,
                      padding: "5px 16px",
                      borderRadius: "6px",
                      backgroundColor: isDark ? "#7f1d1d" : "#dc2626",
                      color: "#ffffff",
                      border: `0.5px solid ${isDark ? "#991b1b" : "#b91c1c"}`,
                      transition: "all 150ms cubic-bezier(0.16, 1, 0.3, 1)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = isDark ? "#991b1b" : "#b91c1c";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = isDark ? "#7f1d1d" : "#dc2626";
                    }}
                  >
                    Confirm
                  </button>
                ) : (
                  <Button 
                    variant="secondary" 
                    onClick={() => setIsDeleteConfirm(true)}
                  >
                    Delete
                  </Button>
                )
              ) : (
                <Button 
                  variant="secondary" 
                  onClick={() => onDelete(source.id)}
                >
                  Delete
                </Button>
              )
            )}
            <div
              style={{
                maxWidth: isDirty ? "80px" : "0px",
                opacity: isDirty ? 1 : 0,
                transform: isDirty ? "translateX(0)" : "translateX(8px)",
                pointerEvents: isDirty ? "auto" : "none",
                overflow: "hidden",
                transition: "max-width 450ms cubic-bezier(0.16, 1, 0.3, 1), opacity 450ms cubic-bezier(0.16, 1, 0.3, 1), transform 450ms cubic-bezier(0.16, 1, 0.3, 1)",
              }}
            >
              <Button 
                variant="primary" 
                onClick={handleSave}
              >
                Save
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Continuous writing surface */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto min-h-0">
        <div className="px-8 py-6 max-w-2xl">
          {/* Title - denser, authoritative, wrapping */}
          <textarea
            value={title}
            onChange={(e) => { handleTitleChange(e.target.value); e.target.style.height = "auto"; e.target.style.height = e.target.scrollHeight + "px"; }}
            placeholder="Untitled"
            rows={1}
            className="w-full text-lg font-medium placeholder-neutral-500 border-none outline-none bg-transparent mb-3 resize-none overflow-hidden"
            style={{ 
              color: isDark ? "#e5e5e5" : "#171717",
              letterSpacing: "-0.01em",
            }}
            autoFocus={isNew}
            disabled={readOnly}
            ref={(el) => { if (el) { el.style.height = "auto"; el.style.height = el.scrollHeight + "px"; } }}
            onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }}
          />

          {/* Import buttons - small, inline */}
          <div className="flex flex-wrap gap-1.5 mb-5">
            <Button 
              variant="secondary" 
              onClick={() => fileInputRef.current?.click()}
            >
              Upload
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.vtt,.srt"
              onChange={handleFileUpload}
              className="hidden"
            />
            
            {isGoogleConfigured && (
              <Button variant="tertiary" onClick={handleGoogleDriveImport}>
                Google Drive
              </Button>
            )}
          </div>

          {/* Editor flows directly on surface */}
          <DocumentEditor
            key={source?.id || "new"}
            initialContent={content}
            onChange={readOnly ? undefined : handleContentChange}
            placeholder="Begin writing..."
            readOnly={readOnly}
          />
        </div>
      </div>
    </div>
  );
}

/**
 * Parse content into FieldbookDocument format
 */
function getInitialContent(source: SourceItem | null): FieldbookDocument {
  if (!source?.content) {
    return { type: "doc", content: [{ type: "paragraph", content: [] }] };
  }
  
  try {
    const parsed = JSON.parse(source.content);
    if (parsed.type === "doc") return parsed;
  } catch {
    // Plain text - convert to paragraphs
  }
  
  return textToDocument(source.content);
}

/**
 * Convert plain text to FieldbookDocument format
 */
function textToDocument(text: string): FieldbookDocument {
  if (!text) {
    return { type: "doc", content: [{ type: "paragraph", content: [] }] };
  }
  
  return {
    type: "doc",
    content: text.split("\n\n").map((para) => ({
      type: "paragraph" as const,
      content: para.trim() ? [{ type: "text" as const, text: para.trim() }] : [],
    })),
  };
}
