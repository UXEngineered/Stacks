"use client";

/**
 * DocumentEditor Component
 * 
 * A rich text editor built on TipTap that stores content
 * in Fieldbook's structured block JSON format.
 * 
 * Features:
 * - Semantic headings (H1, H2, H3)
 * - Lists (bullet, ordered)
 * - Blockquote and Callouts (decision, assumption, question, constraint, risk)
 * - Inline formatting (bold, italic, underline, code)
 * - Links
 * - Horizontal rules
 * - Slash menu for quick block insertion
 * 
 * Keyboard shortcuts:
 * - Cmd/Ctrl+B: Bold
 * - Cmd/Ctrl+I: Italic
 * - Cmd/Ctrl+U: Underline
 * - Cmd/Ctrl+K: Link
 * - Cmd/Ctrl+Z: Undo
 * - Cmd/Ctrl+Shift+Z: Redo
 * 
 * Style constraints enforced:
 * - No custom fonts (uses system font stack)
 * - Limited colors (brand-safe neutral palette)
 * - Clean, minimal UI
 */

import { useEditor, EditorContent, type JSONContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";
import { Fragment, Slice } from "@tiptap/pm/model";
import { useCallback, useEffect, useRef, useState } from "react";

import { useTheme } from "../ThemeProvider";
import { Callout } from "./CalloutExtension";
import { DocumentRef, mentionPluginKey } from "./DocumentRefExtension";
import { MentionAutocomplete } from "./MentionAutocomplete";
import { EditorToolbar } from "./EditorToolbar";
import { SlashMenu, type SlashMenuHandle } from "./SlashMenu";
import type { FieldbookDocument } from "../../lib/blocks";
import { tiptapToFieldbook, fieldbookToTiptap } from "../../lib/blocks";
import type { DocumentSearchResult } from "@/app/api/documents/search/route";

interface DocumentEditorProps {
  /** Initial content in Fieldbook block format */
  initialContent?: FieldbookDocument;
  /** Callback when content changes, receives Fieldbook block format */
  onChange?: (content: FieldbookDocument) => void;
  /** Placeholder text when empty */
  placeholder?: string;
  /** Whether the editor is read-only */
  readOnly?: boolean;
  /** Optional className for the container */
  className?: string;
  /** Current document ID (to exclude from @mention search) */
  documentId?: string;
  /** Callback when a document reference is clicked */
  onDocumentRefClick?: (docId: string, displayName: string) => void;
}

export function DocumentEditor({
  initialContent,
  onChange,
  placeholder = "Start writing, or type / for commands...",
  readOnly = false,
  className = "",
  documentId,
  onDocumentRefClick,
}: DocumentEditorProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  
  const slashMenuRef = useRef<SlashMenuHandle>(null);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  
  // Mention autocomplete state
  const [mentionActive, setMentionActive] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionPosition, setMentionPosition] = useState<{ top: number; left: number } | null>(null);
  const [mentionRange, setMentionRange] = useState<{ from: number; to: number } | null>(null);

  // Calculate cursor position for mention popup
  const updateMentionPosition = useCallback(() => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      setMentionPosition({ top: rect.top, left: rect.left });
    }
  }, []);

  const editor = useEditor({
    immediatelyRender: false, // Required for SSR/Next.js to avoid hydration mismatches
    shouldRerenderOnTransaction: false, // Improve performance
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-blue-600 underline hover:text-blue-800",
        },
      }),
      Underline,
      Placeholder.configure({
        placeholder,
      }),
      Callout,
      DocumentRef.configure({
        onDocumentClick: (docId, displayName) => {
          onDocumentRefClick?.(docId, displayName);
        },
        onMentionStart: (query, range) => {
          setMentionActive(true);
          setMentionQuery(query);
          setMentionRange(range);
          updateMentionPosition();
        },
        onMentionUpdate: (query, range) => {
          setMentionQuery(query);
          setMentionRange(range);
          updateMentionPosition();
        },
        onMentionEnd: () => {
          setMentionActive(false);
          setMentionQuery("");
          setMentionRange(null);
          setMentionPosition(null);
        },
      }),
    ],
    content: initialContent ? fieldbookToTiptap(initialContent) : undefined,
    editable: !readOnly,
    autofocus: !readOnly ? "start" : false,
    onUpdate: ({ editor }) => {
      if (onChange) {
        const json = editor.getJSON();
        const fieldbook = tiptapToFieldbook(json as JSONContent);
        onChange(fieldbook);
      }
    },
    editorProps: {
      attributes: {
        class: "fieldbook-editor focus:outline-none",
      },
      handlePaste: (view, event) => {
        // Get plain text from clipboard
        const text = event.clipboardData?.getData("text/plain");
        
        if (text) {
          const { from, to } = view.state.selection;
          const schema = view.state.schema;
          
          // Split text by newlines and create appropriate content
          const lines = text.split(/\r?\n/);
          
          // If single line, just insert as text within current paragraph
          if (lines.length === 1) {
            const tr = view.state.tr.insertText(text, from, to);
            view.dispatch(tr);
            return true;
          }
          
          // Multiple lines: create paragraphs
          const nodes = lines.map((line) => {
            if (line === "") {
              return schema.nodes.paragraph.create();
            }
            return schema.nodes.paragraph.create(null, schema.text(line));
          });
          
          // Create a slice and insert it
          const fragment = Fragment.from(nodes);
          const slice = new Slice(fragment, 0, 0);
          
          const tr = view.state.tr.replaceSelection(slice);
          view.dispatch(tr);
          return true;
        }
        
        return false; // Let default handling proceed
      },
      handleKeyDown: (_view, event) => {
        // Let slash menu handle keys when open
        if (slashMenuRef.current?.isOpen) {
          return false;
        }
        
        // Always allow paste, copy, cut (Cmd/Ctrl+V/C/X)
        if ((event.metaKey || event.ctrlKey) && ["v", "c", "x", "a", "z", "y"].includes(event.key.toLowerCase())) {
          return false; // Let browser/ProseMirror handle it
        }
        
        // Add link shortcut (Cmd/Ctrl+K)
        if ((event.metaKey || event.ctrlKey) && event.key === "k") {
          event.preventDefault();
          const url = window.prompt("Enter URL:");
          if (url && editor) {
            editor.chain().focus().setLink({ href: url }).run();
          }
          return true;
        }
        
        return false;
      },
    },
  });

  // Handle document selection from autocomplete
  const handleDocumentSelect = useCallback((doc: DocumentSearchResult) => {
    if (!editor || !mentionRange) return;

    // Insert the document reference
    editor
      .chain()
      .focus()
      .deleteRange(mentionRange)
      .insertContent({
        type: "documentRef",
        attrs: {
          docId: doc.id,
          displayName: doc.title,
        },
      })
      .run();

    // Close mention popup
    setMentionActive(false);
    setMentionQuery("");
    setMentionRange(null);
    setMentionPosition(null);
    
    // Clear the mention plugin state
    const tr = editor.state.tr;
    tr.setMeta(mentionPluginKey, {
      active: false,
      query: "",
      range: null,
    });
    editor.view.dispatch(tr);
  }, [editor, mentionRange]);

  // Handle mention dismiss
  const handleMentionDismiss = useCallback(() => {
    setMentionActive(false);
    setMentionQuery("");
    setMentionRange(null);
    setMentionPosition(null);
    
    if (editor) {
      const tr = editor.state.tr;
      tr.setMeta(mentionPluginKey, {
        active: false,
        query: "",
        range: null,
      });
      editor.view.dispatch(tr);
    }
  }, [editor]);

  // Update content when initialContent changes externally
  useEffect(() => {
    if (editor && initialContent) {
      const currentJson = JSON.stringify(editor.getJSON());
      const newJson = JSON.stringify(fieldbookToTiptap(initialContent));
      if (currentJson !== newJson) {
        editor.commands.setContent(fieldbookToTiptap(initialContent));
      }
    }
  }, [editor, initialContent]);

  // Export methods for external use
  const getContent = useCallback((): FieldbookDocument => {
    if (!editor) {
      return { type: "doc", content: [] };
    }
    return tiptapToFieldbook(editor.getJSON() as JSONContent);
  }, [editor]);

  const setContent = useCallback((content: FieldbookDocument) => {
    if (editor) {
      editor.commands.setContent(fieldbookToTiptap(content));
    }
  }, [editor]);

  return (
    <div 
      ref={editorContainerRef} 
      className={`overflow-hidden ${className}`}
      style={{ backgroundColor: "transparent" }}
    >
      <EditorContent editor={editor} />
      {!readOnly && <SlashMenu ref={slashMenuRef} editor={editor} />}
      
      {/* Document mention autocomplete */}
      {!readOnly && (
        <MentionAutocomplete
          isActive={mentionActive}
          query={mentionQuery}
          position={mentionPosition}
          onSelect={handleDocumentSelect}
          onDismiss={handleMentionDismiss}
          excludeIds={documentId ? [documentId] : []}
        />
      )}
      
      {/* Editor styles - dense, focused, IDE-like */}
      <style jsx global>{`
        /* Base editor styles - denser, editorial */
        .fieldbook-editor {
          min-height: 200px;
          font-size: 0.875rem;
          line-height: 1.7;
          color: ${isDark ? "#d4d4d4" : "#404040"};
          letter-spacing: 0.01em;
        }
        
        .fieldbook-editor:focus {
          outline: none;
        }
        
        /* Placeholder - subdued */
        .fieldbook-editor p.is-editor-empty:first-child::before {
          color: ${isDark ? "#525252" : "#a3a3a3"};
          content: attr(data-placeholder);
          float: left;
          height: 0;
          pointer-events: none;
          font-style: italic;
        }
        
        /* Headings - weight over size, calm authority */
        .fieldbook-editor h1 {
          font-size: 1.25rem;
          font-weight: 600;
          line-height: 1.4;
          margin-top: 2rem;
          margin-bottom: 0.5rem;
          color: ${isDark ? "#f5f5f5" : "#171717"};
          letter-spacing: -0.01em;
        }
        
        .fieldbook-editor h1:first-child {
          margin-top: 0;
        }
        
        .fieldbook-editor h2 {
          font-size: 1rem;
          font-weight: 600;
          line-height: 1.5;
          margin-top: 1.75rem;
          margin-bottom: 0.375rem;
          color: ${isDark ? "#e5e5e5" : "#262626"};
          letter-spacing: -0.005em;
        }
        
        .fieldbook-editor h3 {
          font-size: 0.875rem;
          font-weight: 600;
          line-height: 1.5;
          margin-top: 1.5rem;
          margin-bottom: 0.25rem;
          color: ${isDark ? "#d4d4d4" : "#404040"};
          text-transform: uppercase;
          letter-spacing: 0.05em;
          font-size: 0.75rem;
        }
        
        /* Paragraphs - tighter */
        .fieldbook-editor p {
          margin-bottom: 0.625rem;
        }
        
        .fieldbook-editor p:last-child {
          margin-bottom: 0;
        }
        
        /* Lists - compact */
        .fieldbook-editor ul,
        .fieldbook-editor ol {
          padding-left: 1.25rem;
          margin-bottom: 0.625rem;
        }
        
        .fieldbook-editor ul {
          list-style-type: disc;
        }
        
        .fieldbook-editor ol {
          list-style-type: decimal;
        }
        
        .fieldbook-editor li {
          margin-bottom: 0.125rem;
        }
        
        .fieldbook-editor li p {
          margin-bottom: 0;
        }
        
        /* Blockquote - understated */
        .fieldbook-editor blockquote {
          border-left: 2px solid ${isDark ? "#404040" : "#d4d4d4"};
          padding-left: 0.875rem;
          margin: 0.875rem 0;
          color: ${isDark ? "#737373" : "#737373"};
          font-style: normal;
        }
        
        /* Callout styles - minimal, understated semantic markers */
        .fieldbook-editor div[data-type="callout"] {
          padding: 0.625rem 0.875rem;
          margin: 0.875rem 0;
          border-radius: 0.25rem;
          border-left: 2px solid;
          background-color: ${isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)"};
        }
        
        .fieldbook-editor div[data-type="callout"] p:last-child {
          margin-bottom: 0;
        }
        
        /* Callout label - small, quiet */
        .fieldbook-editor div[data-type="callout"]::before {
          display: block;
          font-size: 0.625rem;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          margin-bottom: 0.25rem;
          opacity: 0.7;
        }
        
        /* Info */
        .fieldbook-editor div[data-type="callout"][data-variant="info"] {
          border-left-color: ${isDark ? "#3b82f6" : "#60a5fa"};
        }
        .fieldbook-editor div[data-type="callout"][data-variant="info"]::before {
          content: "Info";
          color: ${isDark ? "#60a5fa" : "#3b82f6"};
        }
        
        /* Decision */
        .fieldbook-editor div[data-type="callout"][data-variant="decision"] {
          border-left-color: ${isDark ? "#10b981" : "#34d399"};
        }
        .fieldbook-editor div[data-type="callout"][data-variant="decision"]::before {
          content: "Decision";
          color: ${isDark ? "#34d399" : "#10b981"};
        }
        
        /* Assumption */
        .fieldbook-editor div[data-type="callout"][data-variant="assumption"] {
          border-left-color: ${isDark ? "#8b5cf6" : "#a78bfa"};
        }
        .fieldbook-editor div[data-type="callout"][data-variant="assumption"]::before {
          content: "Assumption";
          color: ${isDark ? "#a78bfa" : "#8b5cf6"};
        }
        
        /* Question */
        .fieldbook-editor div[data-type="callout"][data-variant="question"] {
          border-left-color: ${isDark ? "#d97706" : "#fbbf24"};
        }
        .fieldbook-editor div[data-type="callout"][data-variant="question"]::before {
          content: "Question";
          color: ${isDark ? "#fbbf24" : "#d97706"};
        }
        
        /* Constraint */
        .fieldbook-editor div[data-type="callout"][data-variant="constraint"] {
          border-left-color: ${isDark ? "#64748b" : "#94a3b8"};
        }
        .fieldbook-editor div[data-type="callout"][data-variant="constraint"]::before {
          content: "Constraint";
          color: ${isDark ? "#94a3b8" : "#64748b"};
        }
        
        /* Risk */
        .fieldbook-editor div[data-type="callout"][data-variant="risk"] {
          border-left-color: ${isDark ? "#ef4444" : "#f87171"};
        }
        .fieldbook-editor div[data-type="callout"][data-variant="risk"]::before {
          content: "Risk";
          color: ${isDark ? "#f87171" : "#ef4444"};
        }
        
        /* Legacy variants */
        .fieldbook-editor div[data-type="callout"][data-variant="warning"] {
          border-left-color: ${isDark ? "#d97706" : "#fbbf24"};
        }
        .fieldbook-editor div[data-type="callout"][data-variant="warning"]::before {
          content: "Warning";
          color: ${isDark ? "#fbbf24" : "#d97706"};
        }
        
        .fieldbook-editor div[data-type="callout"][data-variant="success"] {
          border-left-color: ${isDark ? "#10b981" : "#34d399"};
        }
        .fieldbook-editor div[data-type="callout"][data-variant="success"]::before {
          content: "Success";
          color: ${isDark ? "#34d399" : "#10b981"};
        }
        
        .fieldbook-editor div[data-type="callout"][data-variant="error"] {
          border-left-color: ${isDark ? "#ef4444" : "#f87171"};
        }
        .fieldbook-editor div[data-type="callout"][data-variant="error"]::before {
          content: "Error";
          color: ${isDark ? "#f87171" : "#ef4444"};
        }
        
        /* Inline code - subtle */
        .fieldbook-editor code {
          background-color: ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)"};
          padding: 0.1rem 0.3rem;
          border-radius: 0.1875rem;
          font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
          font-size: 0.8125em;
          color: ${isDark ? "#a3a3a3" : "#525252"};
        }
        
        /* Code block - IDE-like */
        .fieldbook-editor pre {
          background-color: ${isDark ? "rgba(0,0,0,0.3)" : "#1a1a1a"};
          color: #d4d4d4;
          padding: 0.75rem 1rem;
          border-radius: 0.25rem;
          overflow-x: auto;
          margin: 0.875rem 0;
          font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
          font-size: 0.8125rem;
          line-height: 1.5;
        }
        
        .fieldbook-editor pre code {
          background: none;
          padding: 0;
          color: inherit;
        }
        
        /* Horizontal rule - minimal */
        .fieldbook-editor hr {
          border: none;
          border-top: 1px solid ${isDark ? "#333333" : "#e5e5e5"};
          margin: 1.25rem 0;
          opacity: 0.5;
        }
        
        /* Links - understated */
        .fieldbook-editor a {
          color: ${isDark ? "#60a5fa" : "#2563eb"};
          text-decoration: none;
          border-bottom: 1px solid ${isDark ? "rgba(96,165,250,0.3)" : "rgba(37,99,235,0.3)"};
        }
        
        .fieldbook-editor a:hover {
          color: ${isDark ? "#93c5fd" : "#1d4ed8"};
          border-bottom-color: currentColor;
        }
        
        /* Selection */
        .fieldbook-editor ::selection {
          background-color: ${isDark ? "rgba(59,130,246,0.3)" : "rgba(59,130,246,0.2)"};
        }
        
        /* Underline mark */
        .fieldbook-editor u {
          text-decoration: underline;
          text-underline-offset: 2px;
          text-decoration-thickness: 1px;
        }
        
        /* Document references - subtle inline tag */
        .fieldbook-editor .document-ref {
          display: inline-flex;
          align-items: center;
          background-color: ${isDark ? "rgba(59,130,246,0.15)" : "rgba(59,130,246,0.1)"};
          color: ${isDark ? "#60a5fa" : "#2563eb"};
          padding: 0.0625rem 0.3rem;
          border-radius: 0.1875rem;
          font-weight: 500;
          font-size: 0.875em;
          cursor: pointer;
          transition: background-color 0.1s ease;
          text-decoration: none;
          white-space: nowrap;
        }
        
        .fieldbook-editor .document-ref:hover {
          background-color: ${isDark ? "rgba(59,130,246,0.25)" : "rgba(59,130,246,0.15)"};
        }
        
        .fieldbook-editor .document-ref:active {
          background-color: ${isDark ? "rgba(59,130,246,0.35)" : "rgba(59,130,246,0.2)"};
        }
      `}</style>
    </div>
  );
}

export type { DocumentEditorProps };
