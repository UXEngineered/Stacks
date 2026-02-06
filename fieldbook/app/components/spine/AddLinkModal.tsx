"use client";

/**
 * AddLinkModal - Lightweight modal for adding external link sources
 * 
 * Creates a Source node with type = 'external_link'.
 * Stores only: url, title (optional), note (optional), capturedAt, domain.
 * Does NOT open an editor after creation.
 */

import { useState, useCallback, useEffect, useRef } from "react";
import { useTheme } from "../ThemeProvider";

interface AddLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    url: string;
    title?: string;
    note?: string;
  }) => void;
}

export function AddLinkModal({ isOpen, onClose, onSubmit }: AddLinkModalProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [urlError, setUrlError] = useState<string | null>(null);
  
  const urlInputRef = useRef<HTMLInputElement>(null);
  
  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setUrl("");
      setTitle("");
      setNote("");
      setUrlError(null);
      // Focus URL input after a brief delay for animation
      setTimeout(() => urlInputRef.current?.focus(), 100);
    }
  }, [isOpen]);
  
  // Close on escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);
  
  const validateUrl = useCallback((value: string): boolean => {
    if (!value.trim()) {
      setUrlError("URL is required");
      return false;
    }
    try {
      new URL(value);
      setUrlError(null);
      return true;
    } catch {
      setUrlError("Please enter a valid URL");
      return false;
    }
  }, []);
  
  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateUrl(url)) return;
    
    onSubmit({
      url: url.trim(),
      title: title.trim() || undefined,
      note: note.trim() || undefined,
    });
    
    onClose();
  }, [url, title, note, validateUrl, onSubmit, onClose]);
  
  if (!isOpen) return null;
  
  const borderColor = isDark ? "#404040" : "#e5e5e5";
  const bgColor = isDark ? "#171717" : "#ffffff";
  const inputBg = isDark ? "#262626" : "#fafafa";
  const textColor = isDark ? "#f5f5f5" : "#171717";
  const mutedColor = isDark ? "#a3a3a3" : "#737373";
  
  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className="w-full max-w-md rounded-lg shadow-xl"
        style={{ 
          backgroundColor: bgColor,
          border: `1px solid ${borderColor}`,
        }}
      >
        {/* Header */}
        <div 
          className="px-6 py-4 flex items-center justify-between"
          style={{ borderBottom: `1px solid ${borderColor}` }}
        >
          <div className="flex items-center gap-3">
            <div 
              className="w-8 h-8 rounded flex items-center justify-center"
              style={{ backgroundColor: isDark ? "#1e3a5f" : "#dbeafe" }}
            >
              <svg 
                className="w-4 h-4" 
                fill="none" 
                stroke={isDark ? "#93c5fd" : "#2563eb"} 
                viewBox="0 0 24 24" 
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-medium" style={{ color: textColor }}>
                Add Link Reference
              </h2>
              <p className="text-xs" style={{ color: mutedColor }}>
                Declare an external resource as an influence
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke={mutedColor} viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* URL input */}
          <div>
            <label 
              className="block text-xs font-medium mb-1.5"
              style={{ color: mutedColor }}
            >
              URL <span className="text-red-500">*</span>
            </label>
            <input
              ref={urlInputRef}
              type="text"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                if (urlError) validateUrl(e.target.value);
              }}
              onBlur={() => url && validateUrl(url)}
              placeholder="https://..."
              className="w-full px-3 py-2 text-sm rounded"
              style={{
                backgroundColor: inputBg,
                border: `1px solid ${urlError ? "#ef4444" : borderColor}`,
                color: textColor,
                outline: "none",
              }}
            />
            {urlError && (
              <p className="mt-1 text-xs text-red-500">{urlError}</p>
            )}
          </div>
          
          {/* Title input */}
          <div>
            <label 
              className="block text-xs font-medium mb-1.5"
              style={{ color: mutedColor }}
            >
              Title <span style={{ color: mutedColor }}>(optional)</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Give this link a descriptive title"
              className="w-full px-3 py-2 text-sm rounded"
              style={{
                backgroundColor: inputBg,
                border: `1px solid ${borderColor}`,
                color: textColor,
                outline: "none",
              }}
            />
            <p className="mt-1 text-xs" style={{ color: mutedColor }}>
              If empty, the domain will be used as the title
            </p>
          </div>
          
          {/* Note input */}
          <div>
            <label 
              className="block text-xs font-medium mb-1.5"
              style={{ color: mutedColor }}
            >
              Why this matters <span style={{ color: mutedColor }}>(optional)</span>
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Brief note about why this link is relevant..."
              rows={2}
              maxLength={200}
              className="w-full px-3 py-2 text-sm rounded resize-none"
              style={{
                backgroundColor: inputBg,
                border: `1px solid ${borderColor}`,
                color: textColor,
                outline: "none",
              }}
            />
            <p className="mt-1 text-xs text-right" style={{ color: mutedColor }}>
              {note.length}/200
            </p>
          </div>
          
          {/* Info notice */}
          <div 
            className="p-3 rounded text-xs"
            style={{ 
              backgroundColor: isDark ? "#1c1917" : "#fef3c7",
              color: isDark ? "#fbbf24" : "#92400e",
              border: `1px solid ${isDark ? "#422006" : "#fcd34d"}`,
            }}
          >
            <div className="flex items-start gap-2">
              <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>
                Links are saved as <strong>references</strong>—declared influences that can 
                participate in lineage. The system will not crawl, parse, or summarize the URL.
              </span>
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium rounded transition-colors"
              style={{
                color: mutedColor,
                border: `1px solid ${borderColor}`,
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium rounded text-white transition-colors"
              style={{
                backgroundColor: "#2563eb",
              }}
            >
              Add Reference
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
