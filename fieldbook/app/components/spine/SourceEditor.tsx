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

import { useState, useCallback, useRef, useEffect } from "react";
import type { SourceItem, SourceKind } from "./types";
import { DocumentEditor } from "../editor/DocumentEditor";
import type { FieldbookDocument } from "../../lib/blocks";
import { useTheme } from "../ThemeProvider";
import { parseTranscript } from "../../lib/transcript-parser";
import { ExportDropdown } from "../ExportDropdown";

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
  /** Called when save is triggered */
  onSave: (source: SourceItem) => void;
  /** Called when discarding a new unsaved source */
  onDiscard?: () => void;
  /** Called when deleting an existing source */
  onDelete?: (id: string) => void;
  /** Called when user wants to synthesize this source */
  onSynthesize?: (sourceId: string) => void;
}

export function SourceEditor({
  source,
  isNew = false,
  onSave,
  onDiscard,
  onDelete,
  onSynthesize,
}: SourceEditorProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  
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

  // Perform save
  const performSave = useCallback((finalTitle?: string) => {
    const titleToUse = finalTitle || title || inferTitleFromContent(content) || "Untitled";
    
    // Don't save if no meaningful content
    const hasContent = content.content?.some(
      (block) => block.content && block.content.length > 0
    );
    if (!hasContent && !titleToUse.trim()) return;

    setIsSaving(true);
    const now = new Date().toISOString();
    const serializedContent = JSON.stringify(content);
    
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
    if (!title && titleToUse !== "Untitled") {
      setTitle(titleToUse);
    }
    
    setIsDirty(false);
    onSave(savedSource);
    
    setTimeout(() => setIsSaving(false), 500);
  }, [source, title, content, sourceKind, onSave, inferTitleFromContent]);

  // Handle manual save
  const handleSave = useCallback(() => {
    // Clear any pending autosave
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }
    performSave();
  }, [performSave]);

  // Schedule autosave
  const scheduleAutosave = useCallback(() => {
    // Clear existing timer
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }
    
    // Schedule new autosave
    autosaveTimerRef.current = setTimeout(() => {
      if (isDirty) {
        performSave();
      }
    }, AUTOSAVE_DELAY);
  }, [isDirty, performSave]);

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

  // Scroll to top when switching between sources
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
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

  // Status text
  const getStatusText = () => {
    if (isSaving) return "Saving...";
    if (isNew && !source?.lastSavedAt && !isDirty) return "Draft";
    if (isDirty) return "Unsaved";
    return "Saved";
  };

  const statusText = getStatusText();

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
            className="text-[9px] font-medium tracking-widest uppercase"
            style={{ color: isDark ? "#525252" : "#a3a3a3" }}
          >
            Source
          </span>
          <span style={{ color: isDark ? "#333" : "#d4d4d4" }}>·</span>
          <span 
            className="text-[9px]"
            style={{ 
              color: isSaving 
                ? (isDark ? "#22c55e" : "#16a34a")
                : isDirty 
                  ? (isDark ? "#fbbf24" : "#d97706") 
                  : (isDark ? "#525252" : "#a3a3a3") 
            }}
          >
            {statusText}
          </span>
          {source?.version && source.version > 0 && (
            <>
              <span style={{ color: isDark ? "#333" : "#d4d4d4" }}>·</span>
              <span className="text-[9px]" style={{ color: isDark ? "#525252" : "#a3a3a3" }}>
                v{source.version}
              </span>
            </>
          )}
        </div>
        
        <div className="flex items-center gap-1">
          {isNew && onDiscard && (
            <button
              onClick={onDiscard}
              className="px-2.5 py-1 text-[11px] font-medium transition-colors"
              style={{ color: isDark ? "#737373" : "#737373" }}
            >
              Discard
            </button>
          )}
          {!isNew && source && (
            <ExportDropdown 
              title={title || "Untitled Source"} 
              content={content}
              disabled={isNew}
            />
          )}
          {!isNew && onSynthesize && source && (
            <button
              onClick={() => onSynthesize(source.id)}
              className="px-2.5 py-1 text-[11px] font-medium transition-colors flex items-center gap-1"
              style={{ 
                color: isDark ? "#a78bfa" : "#7c3aed",
              }}
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
              </svg>
              Synthesize
            </button>
          )}
          {!isNew && onDelete && source && (
            <button
              onClick={() => onDelete(source.id)}
              className="px-2.5 py-1 text-[11px] font-medium transition-colors hover:text-red-500"
              style={{ color: isDark ? "#737373" : "#737373" }}
            >
              Delete
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={!isDirty}
            className="px-3 py-1 text-[11px] font-medium transition-colors"
            style={{
              backgroundColor: isDirty 
                ? (isDark ? "#404040" : "#171717")
                : "transparent",
              color: isDirty
                ? "#ffffff"
                : (isDark ? "#525252" : "#a3a3a3"),
              cursor: isDirty ? "pointer" : "not-allowed",
              borderRadius: "0.125rem",
            }}
          >
            Save
          </button>
        </div>
      </div>

      {/* Continuous writing surface */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto min-h-0">
        <div className="px-8 py-6 max-w-2xl">
          {/* Title - denser, authoritative */}
          <input
            type="text"
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="Untitled"
            className="w-full text-lg font-medium placeholder-neutral-500 border-none outline-none bg-transparent mb-3"
            style={{ 
              color: isDark ? "#e5e5e5" : "#171717",
              letterSpacing: "-0.01em",
            }}
            autoFocus={isNew}
          />

          {/* Import buttons - small, inline */}
          <div className="flex gap-1.5 mb-5">
            <label
              className="px-2 py-1 text-[11px] transition-colors cursor-pointer flex items-center gap-1"
              style={{
                backgroundColor: "transparent",
                color: isDark ? "#737373" : "#737373",
                border: `1px solid ${isDark ? "#333" : "#d4d4d4"}`,
                borderRadius: "0.125rem",
              }}
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
              Upload
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.vtt,.srt"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
            
            {isGoogleConfigured && (
              <button
                onClick={handleGoogleDriveImport}
                className="px-2 py-1 text-[11px] transition-colors flex items-center gap-1"
                style={{
                  backgroundColor: "transparent",
                  color: isDark ? "#737373" : "#737373",
                  border: `1px solid ${isDark ? "#333" : "#d4d4d4"}`,
                  borderRadius: "0.125rem",
                }}
              >
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12.01 1.485c-2.082 0-3.754.02-3.743.047.01.02 1.708 3.001 3.774 6.62l3.76 6.574h3.76c2.081 0 3.753-.02 3.742-.047-.01-.02-1.708-3.001-3.774-6.62l-3.76-6.574h-3.76zm-5.26 6.574c-2.082 0-3.754.02-3.743.047.01.027 1.708 3.001 3.774 6.62l3.76 6.574h3.76c2.081 0 3.753-.02 3.742-.047-.01-.027-1.708-3.001-3.774-6.62l-3.76-6.574h-3.76z" />
                </svg>
                Google Drive
              </button>
            )}
          </div>

          {/* Editor flows directly on surface */}
          <DocumentEditor
            key={source?.id || "new"}
            initialContent={content}
            onChange={handleContentChange}
            placeholder="Begin writing..."
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
