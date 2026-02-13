"use client";

/**
 * ExportDropdown - Dropdown menu for exporting documents
 * 
 * Provides options to export to various formats:
 * - Markdown (.md)
 * - Plain Text (.txt)
 * - JSON (.json)
 */

import { useState, useRef, useEffect } from "react";
import { useTheme } from "./ThemeProvider";
import { exportDocument, type ExportFormat } from "../lib/export";
import type { FieldbookDocument } from "../lib/blocks";
import { Button } from "./Button";

interface ExportDropdownProps {
  title: string;
  content: FieldbookDocument | string;
  disabled?: boolean;
}

const EXPORT_OPTIONS: { format: ExportFormat; label: string; description: string; icon: React.ReactNode }[] = [
  { 
    format: "md", 
    label: "Markdown", 
    description: "Export with formatting preserved",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
      </svg>
    ),
  },
  { 
    format: "txt", 
    label: "Plain Text", 
    description: "Export without any formatting",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" />
      </svg>
    ),
  },
  { 
    format: "json", 
    label: "JSON", 
    description: "Raw structured content for agents & tools",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
      </svg>
    ),
  },
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
      <Button
        variant="secondary"
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled || isExporting}
      >
        {isExporting ? "Exporting..." : "Export"}
      </Button>
      
      {isOpen && (
        <div 
          className="absolute right-0 top-full mt-0.5 py-1 rounded-lg shadow-xl z-50 min-w-[220px]"
          style={{
            backgroundColor: isDark ? "#1c1c1c" : "#ffffff",
            border: `1px solid ${isDark ? "#333333" : "#e5e5e5"}`,
            transformOrigin: 'top right',
            animation: 'dropdownIn 150ms cubic-bezier(0.16, 1, 0.3, 1) forwards',
          }}
        >
          <style>{`
            @keyframes dropdownIn {
              from {
                opacity: 0;
                transform: scale(0.95) translateY(-4px);
              }
              to {
                opacity: 1;
                transform: scale(1) translateY(0);
              }
            }
          `}</style>
          {EXPORT_OPTIONS.map((option) => (
            <button
              key={option.format}
              onClick={() => handleExport(option.format)}
              className="w-full px-3 py-2 text-left flex items-start gap-3 transition-colors cursor-pointer rounded-md mx-1"
              style={{ width: 'calc(100% - 8px)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = isDark ? "rgba(255,255,255,0.05)" : "#f5f5f5";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
              }}
            >
              <div className="mt-0.5 shrink-0" style={{ color: isDark ? "#a3a3a3" : "#737373" }}>
                {option.icon}
              </div>
              <div>
                <div className="text-[12px] font-medium" style={{ color: isDark ? "#e5e5e5" : "#171717" }}>
                  {option.label}
                </div>
                <div className="text-[11px]" style={{ color: isDark ? "#737373" : "#a3a3a3", lineHeight: '1.3' }}>
                  {option.description}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
