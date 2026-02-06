"use client";

/**
 * Top navigation bar for the canvas/project view
 * 
 * Features:
 * - Left: Back arrow navigation
 * - Center: Add button with popover menu
 * - Right: Share, Avatar, Settings
 */

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { ArrowLeftIcon, ShareIcon, SettingsIcon, PlusIcon, HistoryIcon } from "./icons";
import { Avatar } from "./Avatar";

interface CanvasTopNavProps {
  projectName?: string;
  onAddUrl?: () => void;
  onUploadFile?: () => void;
  onCreateDocument?: () => void;
  onToggleHistory?: () => void;
  isHistoryOpen?: boolean;
}

export function CanvasTopNav({ 
  projectName = "Untitled",
  onAddUrl,
  onUploadFile,
  onCreateDocument,
  onToggleHistory,
  isHistoryOpen = false,
}: CanvasTopNavProps) {
  const [showAddMenu, setShowAddMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as globalThis.Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as globalThis.Node)
      ) {
        setShowAddMenu(false);
      }
    };

    if (showAddMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showAddMenu]);

  // Close menu on Escape
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setShowAddMenu(false);
      }
    };

    if (showAddMenu) {
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [showAddMenu]);

  const handleAddUrl = () => {
    setShowAddMenu(false);
    onAddUrl?.();
  };

  const handleUploadFile = () => {
    setShowAddMenu(false);
    onUploadFile?.();
  };

  const handleCreateDocument = () => {
    setShowAddMenu(false);
    onCreateDocument?.();
  };

  return (
    <header className="h-14 flex items-center justify-between px-4 relative z-10">
      {/* Left: Back navigation */}
      <div className="flex items-center gap-3">
        <Link
          href="/projects"
          className="p-2 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 rounded-md transition-colors"
          title="Back to Projects"
        >
          <ArrowLeftIcon className="w-5 h-5" />
        </Link>
        <span className="text-sm font-medium text-neutral-900">
          {projectName}
        </span>
      </div>

      {/* Center: Add button and controls */}
      <div className="flex items-center gap-1">
        {/* Add button with popover */}
        <div className="relative">
          <button
            ref={buttonRef}
            onClick={() => setShowAddMenu(!showAddMenu)}
            className={`
              flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors
              ${showAddMenu
                ? "bg-blue-50 text-blue-600"
                : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100"
              }
            `}
          >
            <PlusIcon className="w-4 h-4" />
            Add
          </button>

          {/* Popover menu */}
          {showAddMenu && (
            <div
              ref={menuRef}
              className="absolute top-full left-1/2 -translate-x-1/2 mt-1 w-44 bg-white rounded-lg shadow-lg border border-neutral-200 py-1 z-50"
            >
              <button
                onClick={handleAddUrl}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors text-left"
              >
                <svg className="w-4 h-4 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
                </svg>
                Add URL
              </button>
              <button
                onClick={handleUploadFile}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors text-left"
              >
                <svg className="w-4 h-4 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
                Upload File
              </button>
              <div className="my-1 border-t border-neutral-100" />
              <button
                onClick={handleCreateDocument}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors text-left"
              >
                <svg className="w-4 h-4 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
                </svg>
                Create Document
              </button>
            </div>
          )}
        </div>

        <div className="w-px h-4 bg-neutral-200/50 mx-1" />
        
        {/* Placeholder controls */}
        <button className="px-3 py-1.5 text-xs text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 rounded-md transition-colors">
          100%
        </button>
        <button className="px-3 py-1.5 text-xs text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 rounded-md transition-colors">
          Fit
        </button>
        <button className="px-3 py-1.5 text-xs text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 rounded-md transition-colors">
          Grid
        </button>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={onToggleHistory}
          className={`
            flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors
            ${isHistoryOpen
              ? "bg-blue-50 text-blue-600"
              : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100"
            }
          `}
          title="Version History"
        >
          <HistoryIcon className="w-4 h-4" />
          <span className="hidden sm:inline">History</span>
        </button>
        <button
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-md transition-colors"
          title="Share"
        >
          <ShareIcon className="w-4 h-4" />
          <span className="hidden sm:inline">Share</span>
        </button>
        <div className="w-px h-6 bg-neutral-200/50 mx-1" />
        <Avatar />
        <button
          className="p-2 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 rounded-md transition-colors"
          title="Settings"
        >
          <SettingsIcon className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
}
