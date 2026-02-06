"use client";

/**
 * Enhanced toolbar for the document editor
 * 
 * Features:
 * - Undo/Redo
 * - Text formatting (bold, italic, underline)
 * - Link
 * - Headings (H1, H2, H3)
 * - Lists (bullet, ordered)
 * - Quote and Callout
 * - Divider
 * 
 * Keyboard shortcuts:
 * - Cmd/Ctrl+B: Bold
 * - Cmd/Ctrl+I: Italic
 * - Cmd/Ctrl+U: Underline
 * - Cmd/Ctrl+K: Link
 * - Cmd/Ctrl+Z: Undo
 * - Cmd/Ctrl+Shift+Z: Redo
 */

import { useState } from "react";
import type { Editor } from "@tiptap/react";
import type { CalloutVariant } from "./CalloutExtension";
import { useTheme } from "../ThemeProvider";

interface EditorToolbarProps {
  editor: Editor | null;
}

interface ToolbarButtonProps {
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
  isDark?: boolean;
}

function ToolbarButton({ onClick, isActive, disabled, title, children, isDark }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="p-1.5 text-sm transition-colors"
      style={{
        backgroundColor: isActive ? (isDark ? "#404040" : "#e5e5e5") : "transparent",
        color: isActive 
          ? (isDark ? "#f5f5f5" : "#171717")
          : (isDark ? "#a3a3a3" : "#525252"),
        opacity: disabled ? 0.4 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      {children}
    </button>
  );
}

function Divider({ isDark }: { isDark?: boolean }) {
  return <div className="w-px h-5 mx-1" style={{ backgroundColor: isDark ? "#404040" : "#e5e5e5" }} />;
}

interface DropdownProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  isDark?: boolean;
}

function Dropdown({ trigger, children, isOpen, onToggle, isDark }: DropdownProps) {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={onToggle}
        className="flex items-center gap-1 px-2 py-1.5 text-sm transition-colors"
        style={{ color: isDark ? "#a3a3a3" : "#525252" }}
      >
        {trigger}
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && (
        <div 
          className="absolute top-full left-0 mt-1 shadow-sm py-1 z-50 min-w-[160px]"
          style={{ 
            backgroundColor: isDark ? "#262626" : "#ffffff",
            borderColor: isDark ? "#404040" : "#e5e5e5",
            borderWidth: 1,
            borderStyle: "solid"
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}

interface DropdownItemProps {
  onClick: () => void;
  isActive?: boolean;
  children: React.ReactNode;
  isDark?: boolean;
}

function DropdownItem({ onClick, isActive, children, isDark }: DropdownItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full px-3 py-1.5 text-sm text-left transition-colors flex items-center gap-2"
      style={{
        backgroundColor: isActive ? (isDark ? "#404040" : "#f5f5f5") : "transparent",
        color: isActive 
          ? (isDark ? "#f5f5f5" : "#171717")
          : (isDark ? "#d4d4d4" : "#404040"),
      }}
    >
      {children}
    </button>
  );
}

const calloutOptions: { variant: CalloutVariant; label: string; icon: string }[] = [
  { variant: "info", label: "Info", icon: "ℹ️" },
  { variant: "decision", label: "Decision", icon: "✓" },
  { variant: "assumption", label: "Assumption", icon: "?" },
  { variant: "question", label: "Question", icon: "❓" },
  { variant: "constraint", label: "Constraint", icon: "🔒" },
  { variant: "risk", label: "Risk", icon: "⚠️" },
];

export function EditorToolbar({ editor }: EditorToolbarProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  
  const [headingOpen, setHeadingOpen] = useState(false);
  const [calloutOpen, setCalloutOpen] = useState(false);

  if (!editor) return null;

  const closeDropdowns = () => {
    setHeadingOpen(false);
    setCalloutOpen(false);
  };

  return (
    <div 
      className="flex items-center gap-0.5 px-2 py-1.5 flex-wrap"
      style={{ 
        borderBottom: `1px solid ${isDark ? "#404040" : "#e5e5e5"}`,
        backgroundColor: isDark ? "#1f1f1f" : "#fafafa"
      }}
      onClick={(e) => {
        // Close dropdowns when clicking toolbar background
        if (e.target === e.currentTarget) closeDropdowns();
      }}
    >
      {/* Undo/Redo */}
      <ToolbarButton
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        title="Undo (⌘Z)"
        isDark={isDark}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
        </svg>
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        title="Redo (⌘⇧Z)"
        isDark={isDark}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
        </svg>
      </ToolbarButton>

      <Divider isDark={isDark} />

      {/* Heading dropdown */}
      <Dropdown
        trigger={
          <span className="font-medium text-xs">
            {editor.isActive("heading", { level: 1 })
              ? "H1"
              : editor.isActive("heading", { level: 2 })
              ? "H2"
              : editor.isActive("heading", { level: 3 })
              ? "H3"
              : "¶"}
          </span>
        }
        isOpen={headingOpen}
        onToggle={() => {
          setHeadingOpen(!headingOpen);
          setCalloutOpen(false);
        }}
        isDark={isDark}
      >
        <DropdownItem
          onClick={() => {
            editor.chain().focus().setParagraph().run();
            setHeadingOpen(false);
          }}
          isActive={editor.isActive("paragraph") && !editor.isActive("heading")}
          isDark={isDark}
        >
          <span className="text-sm">¶</span> Paragraph
        </DropdownItem>
        <DropdownItem
          onClick={() => {
            editor.chain().focus().toggleHeading({ level: 1 }).run();
            setHeadingOpen(false);
          }}
          isActive={editor.isActive("heading", { level: 1 })}
          isDark={isDark}
        >
          <span className="font-bold text-lg">H1</span> Heading 1
        </DropdownItem>
        <DropdownItem
          onClick={() => {
            editor.chain().focus().toggleHeading({ level: 2 }).run();
            setHeadingOpen(false);
          }}
          isActive={editor.isActive("heading", { level: 2 })}
          isDark={isDark}
        >
          <span className="font-semibold text-base">H2</span> Heading 2
        </DropdownItem>
        <DropdownItem
          onClick={() => {
            editor.chain().focus().toggleHeading({ level: 3 }).run();
            setHeadingOpen(false);
          }}
          isActive={editor.isActive("heading", { level: 3 })}
          isDark={isDark}
        >
          <span className="font-semibold text-sm">H3</span> Heading 3
        </DropdownItem>
      </Dropdown>

      <Divider isDark={isDark} />

      {/* Text formatting */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        isActive={editor.isActive("bold")}
        title="Bold (⌘B)"
        isDark={isDark}
      >
        <span className="font-bold w-4 inline-block">B</span>
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        isActive={editor.isActive("italic")}
        title="Italic (⌘I)"
        isDark={isDark}
      >
        <span className="italic w-4 inline-block">I</span>
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        isActive={editor.isActive("underline")}
        title="Underline (⌘U)"
        isDark={isDark}
      >
        <span className="underline w-4 inline-block">U</span>
      </ToolbarButton>

      <Divider isDark={isDark} />

      {/* Link */}
      <ToolbarButton
        onClick={() => {
          if (editor.isActive("link")) {
            editor.chain().focus().unsetLink().run();
          } else {
            const url = window.prompt("Enter URL:");
            if (url) {
              editor.chain().focus().setLink({ href: url }).run();
            }
          }
        }}
        isActive={editor.isActive("link")}
        title="Link (⌘K)"
        isDark={isDark}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
      </ToolbarButton>

      <Divider isDark={isDark} />

      {/* Lists */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        isActive={editor.isActive("bulletList")}
        title="Bullet list"
        isDark={isDark}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        isActive={editor.isActive("orderedList")}
        title="Numbered list"
        isDark={isDark}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
        </svg>
      </ToolbarButton>

      <Divider isDark={isDark} />

      {/* Quote */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        isActive={editor.isActive("blockquote")}
        title="Quote"
        isDark={isDark}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
      </ToolbarButton>

      {/* Callout dropdown */}
      <Dropdown
        trigger={
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        }
        isOpen={calloutOpen}
        onToggle={() => {
          setCalloutOpen(!calloutOpen);
          setHeadingOpen(false);
        }}
        isDark={isDark}
      >
        {calloutOptions.map((opt) => (
          <DropdownItem
            key={opt.variant}
            onClick={() => {
              editor.chain().focus().insertCallout({ variant: opt.variant }).run();
              setCalloutOpen(false);
            }}
            isDark={isDark}
          >
            <span>{opt.icon}</span> {opt.label}
          </DropdownItem>
        ))}
      </Dropdown>

      <Divider isDark={isDark} />

      {/* Divider */}
      <ToolbarButton
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        title="Divider"
        isDark={isDark}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
        </svg>
      </ToolbarButton>
    </div>
  );
}
