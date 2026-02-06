"use client";

/**
 * ExportDropdown - Dropdown menu for exporting documents
 * 
 * Provides options to export to various formats:
 * - Word Document (.doc)
 * - Plain Text (.txt)
 * - Markdown (.md)
 * - HTML (.html)
 */

import { useState, useRef, useEffect } from "react";
import { useTheme } from "./ThemeProvider";
import { exportDocument, type ExportFormat } from "../lib/export";
import type { FieldbookDocument } from "../lib/blocks";

interface ExportDropdownProps {
  title: string;
  content: FieldbookDocument | string;
  disabled?: boolean;
}

const EXPORT_OPTIONS: { format: ExportFormat; label: string; description: string }[] = [
  { format: "docx", label: "Word Document", description: ".doc" },
  { format: "html", label: "HTML", description: ".html" },
  { format: "md", label: "Markdown", description: ".md" },
  { format: "txt", label: "Plain Text", description: ".txt" },
];

export function ExportDropdown({ title, content, disabled }: ExportDropdownProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  
  const handleExport = async (format: ExportFormat) => {
    setIsExporting(true);
    try {
      await exportDocument({ title: title || "Untitled", content, format });
    } catch (error) {
      console.error("Export failed:", error);
    } finally {
      setIsExporting(false);
      setIsOpen(false);
    }
  };
  
  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled || isExporting}
        className="px-2.5 py-1 text-[11px] font-medium transition-colors flex items-center gap-1"
        style={{ 
          color: disabled ? (isDark ? "#525252" : "#a3a3a3") : (isDark ? "#737373" : "#737373"),
          opacity: disabled ? 0.5 : 1,
        }}
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
        </svg>
        {isExporting ? "Exporting..." : "Export"}
        <svg className="w-2.5 h-2.5 ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      {isOpen && (
        <div 
          className="absolute right-0 top-full mt-1 py-1 rounded shadow-lg z-50 min-w-[160px]"
          style={{
            backgroundColor: isDark ? "#262626" : "#ffffff",
            border: `1px solid ${isDark ? "#404040" : "#e5e5e5"}`,
          }}
        >
          {EXPORT_OPTIONS.map((option) => (
            <button
              key={option.format}
              onClick={() => handleExport(option.format)}
              className="w-full px-3 py-1.5 text-left flex items-center justify-between gap-4 transition-colors"
              style={{
                color: isDark ? "#d4d4d4" : "#404040",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = isDark ? "#404040" : "#f5f5f5";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
              }}
            >
              <span className="text-[11px] font-medium">{option.label}</span>
              <span 
                className="text-[10px]"
                style={{ color: isDark ? "#737373" : "#a3a3a3" }}
              >
                {option.description}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
