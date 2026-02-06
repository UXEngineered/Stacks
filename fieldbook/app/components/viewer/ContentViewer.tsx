"use client";

/**
 * Unified content viewer overlay for viewing files and URLs inline
 * Supports images, PDFs, text files, and URL iframes with fallback handling
 * 
 * Internal-first: Google Docs/Sheets are embedded with editing capability
 * for Sparq employees who have access to internal documents.
 */

import { useState, useEffect, useCallback } from "react";
import { normalizeForEmbed, getServiceLabel, isGoogleService, isEditableGoogleDoc, getDomain } from "./urlUtils";

export type ContentType = "image" | "pdf" | "text" | "url";

export interface ViewerContent {
  type: ContentType;
  title: string;
  // For files
  previewUrl?: string;
  mimeType?: string;
  textContent?: string;
  // For URLs
  url?: string;
}

interface ContentViewerProps {
  content: ViewerContent;
  onClose: () => void;
}

export function ContentViewer({ content, onClose }: ContentViewerProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [iframeError, setIframeError] = useState(false);
  const [iframeLoading, setIframeLoading] = useState(true);
  const [useFallback, setUseFallback] = useState(false);

  // For URL content, normalize the URL for embedding
  const urlInfo = content.type === "url" && content.url 
    ? normalizeForEmbed(content.url) 
    : null;

  // Get the current embed URL (primary or fallback)
  const currentEmbedUrl = urlInfo 
    ? (useFallback ? urlInfo.fallbackUrl : urlInfo.embedUrl)
    : content.url;

  // Reset state when content changes
  useEffect(() => {
    setIframeError(false);
    setIframeLoading(true);
    setUseFallback(false);
  }, [content]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isFullscreen) {
          setIsFullscreen(false);
        } else {
          onClose();
        }
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreen, onClose]);

  const handleIframeLoad = useCallback(() => {
    setIframeLoading(false);
  }, []);

  const handleIframeError = useCallback(() => {
    // If primary embed fails, try fallback
    if (urlInfo && !useFallback && urlInfo.fallbackUrl !== urlInfo.embedUrl) {
      setUseFallback(true);
      setIframeLoading(true);
    } else {
      setIframeError(true);
      setIframeLoading(false);
    }
  }, [urlInfo, useFallback]);

  const openExternal = useCallback(() => {
    const url = content.type === "url" ? content.url : content.previewUrl;
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  }, [content]);

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen((prev) => !prev);
  }, []);

  // Get icon based on content type and service
  const getIcon = () => {
    if (content.type === "url" && urlInfo) {
      switch (urlInfo.service) {
        case "google-docs":
          return (
            <svg className="w-4 h-4 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 2l5 5h-5V4zM6 20V4h6v6h6v10H6z"/>
              <path d="M8 12h8v2H8zm0 4h8v2H8z"/>
            </svg>
          );
        case "google-sheets":
          return (
            <svg className="w-4 h-4 text-green-600" viewBox="0 0 24 24" fill="currentColor">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 2l5 5h-5V4zM6 20V4h6v6h6v10H6z"/>
              <path d="M8 12h3v2H8zm5 0h3v2h-3zm-5 4h3v2H8zm5 0h3v2h-3z"/>
            </svg>
          );
        case "google-slides":
          return (
            <svg className="w-4 h-4 text-yellow-600" viewBox="0 0 24 24" fill="currentColor">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 2l5 5h-5V4zM6 20V4h6v6h6v10H6z"/>
              <rect x="7" y="12" width="10" height="6" rx="1"/>
            </svg>
          );
        case "google-drive":
        case "google-forms":
          return (
            <svg className="w-4 h-4 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"/>
            </svg>
          );
      }
    }

    switch (content.type) {
      case "image":
        return (
          <svg className="w-4 h-4 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
          </svg>
        );
      case "pdf":
        return (
          <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
        );
      case "text":
        return (
          <svg className="w-4 h-4 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
          </svg>
        );
    }
  };

  // Get subtitle based on content type
  const getSubtitle = () => {
    if (content.type === "url" && urlInfo) {
      const label = getServiceLabel(urlInfo.service);
      if (urlInfo.allowsEditing && isEditableGoogleDoc(urlInfo.service)) {
        return `${label} • Editable`;
      }
      return label !== "Link" ? label : getDomain(urlInfo.originalUrl);
    }
    
    switch (content.type) {
      case "pdf": return "PDF Document";
      case "image": return "Image";
      case "text": return "Text File";
      default: return content.url ? getDomain(content.url) : "";
    }
  };

  // Render content based on type
  const renderContent = () => {
    switch (content.type) {
      case "image":
        return (
          <div className="w-full h-full flex items-center justify-center bg-neutral-900 p-4">
            {content.previewUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={content.previewUrl}
                alt={content.title}
                className="max-w-full max-h-full object-contain"
              />
            )}
          </div>
        );

      case "pdf":
        return (
          <div className="w-full h-full bg-neutral-100">
            {content.previewUrl && (
              <iframe
                src={content.previewUrl}
                title={content.title}
                className="w-full h-full border-0"
              />
            )}
          </div>
        );

      case "text":
        return (
          <div className="w-full h-full overflow-auto bg-white p-6">
            <pre className="text-sm text-neutral-800 font-mono whitespace-pre-wrap break-words">
              {content.textContent || "No content available"}
            </pre>
          </div>
        );

      case "url":
        if (iframeError) {
          return (
            <div className="w-full h-full flex items-center justify-center bg-neutral-100">
              <div className="text-center p-8 max-w-md">
                <div className="w-16 h-16 mx-auto mb-4 bg-neutral-200 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-neutral-900 mb-2">
                  Unable to embed this document
                </h3>
                <p className="text-sm text-neutral-500 mb-6">
                  {urlInfo && isGoogleService(urlInfo.service)
                    ? "This document may require additional permissions or isn't available for embedding. You can still access it externally."
                    : "This website doesn't allow embedding. You can still view it in a new browser tab."
                  }
                </p>
                <button
                  onClick={openExternal}
                  className="px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-md hover:bg-blue-600 transition-colors inline-flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                  </svg>
                  Open externally
                </button>
              </div>
            </div>
          );
        }

        // For Google Docs/Sheets, don't use sandbox to allow full editing functionality
        const isEditableGoogle = urlInfo && isEditableGoogleDoc(urlInfo.service);

        return (
          <div className="w-full h-full relative bg-white">
            {iframeLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-8 h-8 border-2 border-neutral-300 border-t-blue-500 rounded-full animate-spin" />
                  <span className="text-sm text-neutral-500">
                    {urlInfo && isGoogleService(urlInfo.service) 
                      ? `Loading ${getServiceLabel(urlInfo.service)}...`
                      : "Loading..."
                    }
                  </span>
                </div>
              </div>
            )}
            {isEditableGoogle ? (
              // Full permissions for editable Google docs
              // No sandbox to allow complete editing functionality
              <iframe
                src={currentEmbedUrl}
                title={content.title}
                className="w-full h-full border-0"
                onLoad={handleIframeLoad}
                onError={handleIframeError}
                allow="clipboard-read; clipboard-write; fullscreen"
                referrerPolicy="no-referrer-when-downgrade"
              />
            ) : (
              // Standard iframe with sandbox for other URLs
              <iframe
                src={currentEmbedUrl}
                title={content.title}
                className="w-full h-full border-0"
                onLoad={handleIframeLoad}
                onError={handleIframeError}
                sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-presentation"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              />
            )}
          </div>
        );
    }
  };

  const containerClass = isFullscreen
    ? "fixed inset-0 z-50"
    : "fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm";

  const panelClass = isFullscreen
    ? "w-full h-full bg-white flex flex-col"
    : "w-full max-w-6xl h-[90vh] bg-white rounded-lg shadow-2xl flex flex-col overflow-hidden";

  return (
    <div className={containerClass} onClick={isFullscreen ? undefined : (e) => e.target === e.currentTarget && onClose()}>
      <div className={panelClass}>
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-neutral-200 bg-neutral-50 flex-shrink-0">
          {/* Left: Back button + title */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <button
              onClick={onClose}
              className="p-1.5 text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 rounded-md transition-colors flex-shrink-0"
              title="Back to canvas"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
            </button>
            <div className="w-px h-5 bg-neutral-200" />
            <span className="flex-shrink-0">{getIcon()}</span>
            <div className="min-w-0 flex-1">
              <span className="text-sm font-medium text-neutral-900 truncate block">{content.title}</span>
              <span className="text-xs text-neutral-500 truncate block">{getSubtitle()}</span>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {/* Open externally button */}
            <button
              onClick={openExternal}
              className="p-1.5 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded-md transition-colors"
              title="Open in new tab"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
              </svg>
            </button>
            {/* Fullscreen toggle */}
            <button
              onClick={toggleFullscreen}
              className="p-1.5 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded-md transition-colors"
              title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                </svg>
              )}
            </button>
            {/* Close button */}
            <button
              onClick={onClose}
              className="p-1.5 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded-md transition-colors"
              title="Close (Esc)"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-hidden">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
