"use client";

/**
 * Slash Menu for the Document Editor
 * 
 * Triggered by typing "/" at the start of a line.
 * Provides quick access to block types:
 * - /heading (H1, H2, H3)
 * - /decision, /assumption, /question, /constraint, /risk
 * - /divider
 */

import { useEffect, useState, useCallback, forwardRef, useImperativeHandle } from "react";
import type { Editor } from "@tiptap/react";

export interface SlashMenuItem {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  command: (editor: Editor) => void;
  keywords: string[];
}

const menuItems: SlashMenuItem[] = [
  {
    id: "heading1",
    label: "Heading 1",
    description: "Large section heading",
    icon: <span className="font-bold text-base">H1</span>,
    keywords: ["heading", "h1", "title"],
    command: (editor) => editor.chain().focus().toggleHeading({ level: 1 }).run(),
  },
  {
    id: "heading2",
    label: "Heading 2",
    description: "Medium section heading",
    icon: <span className="font-bold text-sm">H2</span>,
    keywords: ["heading", "h2", "subtitle"],
    command: (editor) => editor.chain().focus().toggleHeading({ level: 2 }).run(),
  },
  {
    id: "heading3",
    label: "Heading 3",
    description: "Small section heading",
    icon: <span className="font-bold text-xs">H3</span>,
    keywords: ["heading", "h3"],
    command: (editor) => editor.chain().focus().toggleHeading({ level: 3 }).run(),
  },
  {
    id: "decision",
    label: "Decision",
    description: "Document a key decision",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    keywords: ["decision", "decided", "choice"],
    command: (editor) => editor.chain().focus().insertCallout({ variant: "decision" }).run(),
  },
  {
    id: "assumption",
    label: "Assumption",
    description: "Note an assumption being made",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    keywords: ["assumption", "assume", "assuming"],
    command: (editor) => editor.chain().focus().insertCallout({ variant: "assumption" }).run(),
  },
  {
    id: "question",
    label: "Question",
    description: "Flag an open question",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    keywords: ["question", "ask", "unclear", "tbd"],
    command: (editor) => editor.chain().focus().insertCallout({ variant: "question" }).run(),
  },
  {
    id: "constraint",
    label: "Constraint",
    description: "Define a constraint or limitation",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
    keywords: ["constraint", "limit", "limitation", "restriction"],
    command: (editor) => editor.chain().focus().insertCallout({ variant: "constraint" }).run(),
  },
  {
    id: "risk",
    label: "Risk",
    description: "Identify a potential risk",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    keywords: ["risk", "danger", "warning", "concern"],
    command: (editor) => editor.chain().focus().insertCallout({ variant: "risk" }).run(),
  },
  {
    id: "divider",
    label: "Divider",
    description: "Add a horizontal line",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
      </svg>
    ),
    keywords: ["divider", "line", "hr", "separator"],
    command: (editor) => editor.chain().focus().setHorizontalRule().run(),
  },
  {
    id: "quote",
    label: "Quote",
    description: "Add a blockquote",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
      </svg>
    ),
    keywords: ["quote", "blockquote", "citation"],
    command: (editor) => editor.chain().focus().toggleBlockquote().run(),
  },
  {
    id: "bulletList",
    label: "Bullet List",
    description: "Create a bullet list",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    ),
    keywords: ["bullet", "list", "ul", "unordered"],
    command: (editor) => editor.chain().focus().toggleBulletList().run(),
  },
  {
    id: "numberedList",
    label: "Numbered List",
    description: "Create a numbered list",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
      </svg>
    ),
    keywords: ["numbered", "list", "ol", "ordered"],
    command: (editor) => editor.chain().focus().toggleOrderedList().run(),
  },
];

interface SlashMenuProps {
  editor: Editor | null;
}

export interface SlashMenuHandle {
  isOpen: boolean;
  close: () => void;
}

export const SlashMenu = forwardRef<SlashMenuHandle, SlashMenuProps>(
  function SlashMenu({ editor }, ref) {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [position, setPosition] = useState({ top: 0, left: 0 });

    const filteredItems = menuItems.filter((item) => {
      if (!query) return true;
      const searchTerm = query.toLowerCase();
      return (
        item.label.toLowerCase().includes(searchTerm) ||
        item.keywords.some((k) => k.includes(searchTerm))
      );
    });

    const close = useCallback(() => {
      setIsOpen(false);
      setQuery("");
      setSelectedIndex(0);
    }, []);

    useImperativeHandle(ref, () => ({
      isOpen,
      close,
    }));

    const selectItem = useCallback(
      (item: SlashMenuItem) => {
        if (!editor) return;
        
        // Delete the slash and query
        const { from } = editor.state.selection;
        const textBefore = editor.state.doc.textBetween(
          Math.max(0, from - query.length - 1),
          from,
          ""
        );
        
        if (textBefore.startsWith("/")) {
          editor
            .chain()
            .focus()
            .deleteRange({ from: from - query.length - 1, to: from })
            .run();
        }
        
        item.command(editor);
        close();
      },
      [editor, query, close]
    );

    // Listen for "/" key to open menu
    useEffect(() => {
      if (!editor) return;

      const handleKeyDown = (event: KeyboardEvent) => {
        // Never intercept clipboard shortcuts
        if ((event.metaKey || event.ctrlKey) && ["v", "c", "x", "a", "z", "y"].includes(event.key.toLowerCase())) {
          return;
        }
        
        if (!isOpen) {
          if (event.key === "/" && !event.metaKey && !event.ctrlKey) {
            // Check if we're at the start of a line or after whitespace
            const { from } = editor.state.selection;
            const textBefore = editor.state.doc.textBetween(
              Math.max(0, from - 1),
              from,
              ""
            );
            
            if (from === 1 || textBefore === "" || textBefore === " " || textBefore === "\n") {
              // Get cursor position for menu placement
              const coords = editor.view.coordsAtPos(from);
              setPosition({
                top: coords.bottom + 8,
                left: coords.left,
              });
              setIsOpen(true);
              setQuery("");
              setSelectedIndex(0);
            }
          }
          return;
        }

        // Menu is open
        switch (event.key) {
          case "ArrowDown":
            event.preventDefault();
            setSelectedIndex((i) => (i + 1) % filteredItems.length);
            break;
          case "ArrowUp":
            event.preventDefault();
            setSelectedIndex((i) => (i - 1 + filteredItems.length) % filteredItems.length);
            break;
          case "Enter":
            event.preventDefault();
            if (filteredItems[selectedIndex]) {
              selectItem(filteredItems[selectedIndex]);
            }
            break;
          case "Escape":
            event.preventDefault();
            close();
            break;
          case "Backspace":
            if (query.length === 0) {
              close();
            } else {
              setQuery((q) => q.slice(0, -1));
              setSelectedIndex(0);
            }
            break;
          default:
            if (event.key.length === 1 && !event.metaKey && !event.ctrlKey) {
              setQuery((q) => q + event.key);
              setSelectedIndex(0);
            }
        }
      };

      // Use capture to intercept before editor
      document.addEventListener("keydown", handleKeyDown, true);
      return () => document.removeEventListener("keydown", handleKeyDown, true);
    }, [editor, isOpen, query, filteredItems, selectedIndex, selectItem, close]);

    // Close on click outside
    useEffect(() => {
      if (!isOpen) return;
      
      const handleClick = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        if (!target.closest("[data-slash-menu]")) {
          close();
        }
      };
      
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }, [isOpen, close]);

    if (!isOpen || filteredItems.length === 0) return null;

    return (
      <div
        data-slash-menu
        className="fixed z-50 w-64 bg-white border border-neutral-200 rounded-lg shadow-lg overflow-hidden"
        style={{ top: position.top, left: position.left }}
      >
        <div className="px-3 py-2 border-b border-neutral-100">
          <span className="text-xs text-neutral-500">
            {query ? `Searching: ${query}` : "Type to filter..."}
          </span>
        </div>
        <div className="max-h-72 overflow-y-auto py-1">
          {filteredItems.map((item, index) => (
            <button
              key={item.id}
              type="button"
              className={`
                w-full flex items-center gap-3 px-3 py-2 text-left transition-colors
                ${index === selectedIndex ? "bg-neutral-100" : "hover:bg-neutral-50"}
              `}
              onClick={() => selectItem(item)}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <div className="w-8 h-8 flex items-center justify-center rounded bg-neutral-100 text-neutral-600">
                {item.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-neutral-900">
                  {item.label}
                </div>
                <div className="text-xs text-neutral-500 truncate">
                  {item.description}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }
);
