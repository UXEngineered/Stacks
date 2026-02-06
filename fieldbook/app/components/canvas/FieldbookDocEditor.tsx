"use client";

/**
 * Editor modal for native Fieldbook documents
 * 
 * Uses the full DocumentEditor with all features:
 * - Rich text editing
 * - Slash commands
 * - Callouts (decisions, assumptions, questions, etc.)
 * - Document references (@mentions)
 * - Autosave with conflict detection
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { DocumentEditor } from "../editor/DocumentEditor";
import type { FieldbookDocument } from "../../lib/blocks";
import { createEmptyDocument } from "../../lib/blocks";
import { getDocument, saveDocument } from "../../lib/document";
import type { UserRef } from "../../lib/document/version";

// Autosave delay
const AUTOSAVE_DELAY_MS = 1500;

interface FieldbookDocEditorProps {
  /** Document ID to edit */
  documentId: string;
  /** Callback when editor is closed */
  onClose: () => void;
  /** Callback when document is updated (for refreshing node preview) */
  onUpdate?: (documentId: string, title: string, previewText: string) => void;
}

export function FieldbookDocEditor({
  documentId,
  onClose,
  onUpdate,
}: FieldbookDocEditorProps) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState<FieldbookDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Track if there are unsaved changes
  const hasChangesRef = useRef(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const contentRef = useRef<FieldbookDocument | null>(null);
  const titleRef = useRef<string>("");

  // Load document on mount
  useEffect(() => {
    const doc = getDocument(documentId);
    if (doc) {
      setTitle(doc.meta.title);
      titleRef.current = doc.meta.title;
      
      // Convert document blocks to FieldbookDocument format for editor
      // The document store uses a different format, so we need to handle this
      const editorContent: FieldbookDocument = {
        type: "doc",
        content: doc.blocks.map((block) => {
          // Simple conversion - in production this would be more sophisticated
          if (block.type === "heading") {
            return {
              type: "heading" as const,
              attrs: { level: block.level as 1 | 2 | 3 },
              content: block.content.map((span) => ({
                type: "text" as const,
                text: span.text,
                marks: span.marks?.map((m) => ({ type: m as "bold" | "italic" | "underline" | "code" | "link" })),
              })),
            };
          }
          if (block.type === "paragraph") {
            return {
              type: "paragraph" as const,
              content: block.content.map((span) => ({
                type: "text" as const,
                text: span.text,
                marks: span.marks?.map((m) => ({ type: m as "bold" | "italic" | "underline" | "code" | "link" })),
              })),
            };
          }
          // Default fallback
          return {
            type: "paragraph" as const,
            content: [{ type: "text" as const, text: "" }],
          };
        }),
      };
      
      setContent(editorContent);
      contentRef.current = editorContent;
    } else {
      // Document not found - create empty
      const emptyDoc = createEmptyDocument();
      setContent(emptyDoc);
      contentRef.current = emptyDoc;
      setTitle("Untitled Document");
      titleRef.current = "Untitled Document";
    }
    setLoading(false);
  }, [documentId]);

  // Perform save
  const performSave = useCallback(async () => {
    if (!contentRef.current || !contentRef.current.content) {
      console.warn("No content to save");
      return;
    }
    
    setSaving(true);
    setError(null);
    
    try {
      const doc = getDocument(documentId);
      if (!doc) {
        throw new Error("Document not found");
      }

      // Convert editor content back to document format
      const blocks = contentRef.current.content.map((block, idx) => {
        const baseBlock = { id: `block-${idx}`, type: block.type };
        
        if (block.type === "heading" && "attrs" in block) {
          return {
            ...baseBlock,
            type: "heading" as const,
            level: block.attrs.level,
            content: block.content?.map((inline) => {
              if (inline.type === "text") {
                return {
                  text: inline.text,
                  marks: inline.marks?.map((m) => m.type),
                };
              }
              return { text: "" };
            }) || [],
          };
        }
        
        if (block.type === "paragraph") {
          return {
            ...baseBlock,
            type: "paragraph" as const,
            content: block.content?.map((inline) => {
              if (inline.type === "text") {
                return {
                  text: inline.text,
                  marks: inline.marks?.map((m) => m.type),
                };
              }
              if (inline.type === "documentRef") {
                return {
                  text: `@${inline.attrs.displayName}`,
                };
              }
              return { text: "" };
            }) || [],
          };
        }
        
        return {
          ...baseBlock,
          type: "paragraph" as const,
          content: [{ text: "" }],
        };
      });

      const updatedDoc = {
        ...doc,
        meta: {
          ...doc.meta,
          title: titleRef.current || doc.meta.title, // Keep old title if new is empty
          updatedAt: new Date().toISOString(),
        },
        blocks: blocks.length > 0 ? blocks : doc.blocks, // Keep old blocks if conversion failed
      };

      // Mock user for now
      const author: UserRef = {
        id: "user-jw-001",
        name: "James Williams",
        email: "james@fieldbook.dev",
      };

      saveDocument(updatedDoc as Parameters<typeof saveDocument>[0], author);
      
      setLastSaved(new Date());
      hasChangesRef.current = false;
      
      // Update parent with preview
      const previewText = contentRef.current?.content
        ? contentRef.current.content
            .slice(0, 3)
            .map((block) => {
              if ("content" in block && block.content) {
                return block.content
                  .map((inline) => ("text" in inline ? inline.text : ""))
                  .join("");
              }
              return "";
            })
            .join("\n")
        : "";
      
      onUpdate?.(documentId, titleRef.current || "Untitled Document", previewText);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }, [documentId, onUpdate]);

  // Schedule debounced save
  const scheduleSave = useCallback(() => {
    hasChangesRef.current = true;
    
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    debounceTimerRef.current = setTimeout(() => {
      performSave();
    }, AUTOSAVE_DELAY_MS);
  }, [performSave]);

  // Handle content change
  const handleContentChange = useCallback((newContent: FieldbookDocument) => {
    contentRef.current = newContent;
    setContent(newContent);
    scheduleSave();
  }, [scheduleSave]);

  // Handle title change
  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    titleRef.current = newTitle;
    setTitle(newTitle);
    scheduleSave();
  }, [scheduleSave]);

  // Handle document reference click - navigate to that document
  const handleDocumentRefClick = useCallback((docId: string, displayName: string) => {
    // For now, just log it - in a full implementation this would open the document
    console.log(`Navigate to document: ${docId} (${displayName})`);
    // Could open in a new tab, side panel, or replace current editor
  }, []);

  // Save on close if there are changes
  const handleClose = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    if (hasChangesRef.current) {
      performSave();
    }
    onClose();
  }, [onClose, performSave]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        <div className="bg-white rounded-xl p-8">
          <div className="animate-pulse text-neutral-500">Loading document...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={handleClose} />

      {/* Editor panel */}
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] mx-4 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-neutral-100 shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={handleClose}
              className="p-1.5 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded-md transition-colors"
              title="Close"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
            </button>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-md bg-blue-100 flex items-center justify-center">
                <svg className="w-4 h-4 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
                </svg>
              </div>
              <span className="text-xs text-neutral-400">Fieldbook Document</span>
            </div>
          </div>
          
          {/* Save status */}
          <div className="flex items-center gap-2 text-xs">
            {saving && (
              <span className="text-neutral-400 flex items-center gap-1">
                <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Saving...
              </span>
            )}
            {!saving && lastSaved && (
              <span className="text-green-600 flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Saved
              </span>
            )}
            {error && (
              <span className="text-red-600 flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                {error}
              </span>
            )}
          </div>
        </div>

        {/* Title input */}
        <div className="px-5 pt-4">
          <input
            type="text"
            value={title}
            onChange={handleTitleChange}
            placeholder="Untitled Document"
            className="w-full text-2xl font-semibold text-neutral-900 placeholder:text-neutral-300 border-0 focus:outline-none focus:ring-0"
          />
        </div>

        {/* Editor */}
        <div className="flex-1 overflow-y-auto px-5 pb-5">
          {content && (
            <DocumentEditor
              initialContent={content}
              onChange={handleContentChange}
              documentId={documentId}
              onDocumentRefClick={handleDocumentRefClick}
              placeholder="Start writing, or type / for commands, @ to link documents..."
            />
          )}
        </div>

        {/* Footer with tips */}
        <div className="px-5 py-2 border-t border-neutral-100 bg-neutral-50 text-xs text-neutral-400">
          <span className="mr-4">
            <kbd className="px-1 py-0.5 bg-white border border-neutral-200 rounded text-[10px]">/</kbd>
            {" "}commands
          </span>
          <span className="mr-4">
            <kbd className="px-1 py-0.5 bg-white border border-neutral-200 rounded text-[10px]">@</kbd>
            {" "}link document
          </span>
          <span>
            <kbd className="px-1 py-0.5 bg-white border border-neutral-200 rounded text-[10px]">Cmd+K</kbd>
            {" "}add link
          </span>
        </div>
      </div>
    </div>
  );
}
