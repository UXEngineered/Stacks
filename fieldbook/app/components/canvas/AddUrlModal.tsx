"use client";

/**
 * Modal for adding a URL reference to the canvas
 */

import { useState, useRef, useEffect } from "react";

interface AddUrlModalProps {
  onSubmit: (url: string, title?: string) => void;
  onClose: () => void;
}

export function AddUrlModal({ onSubmit, onClose }: AddUrlModalProps) {
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [error, setError] = useState("");
  const urlInputRef = useRef<HTMLInputElement>(null);

  // Focus URL input on mount
  useEffect(() => {
    urlInputRef.current?.focus();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validate URL
    const trimmedUrl = url.trim();
    if (!trimmedUrl) {
      setError("URL is required");
      return;
    }

    // Add protocol if missing
    let finalUrl = trimmedUrl;
    if (!trimmedUrl.startsWith("http://") && !trimmedUrl.startsWith("https://")) {
      finalUrl = "https://" + trimmedUrl;
    }

    // Try to parse URL
    try {
      new URL(finalUrl);
    } catch {
      setError("Please enter a valid URL");
      return;
    }

    onSubmit(finalUrl, title.trim() || undefined);
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div className="w-full max-w-md bg-white rounded-lg shadow-xl mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-200">
          <h2 className="text-lg font-semibold text-neutral-900">Add URL</h2>
          <button
            onClick={onClose}
            className="p-1 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="p-5 space-y-4">
            {/* URL field */}
            <div>
              <label htmlFor="url" className="block text-sm font-medium text-neutral-700 mb-1.5">
                URL <span className="text-red-500">*</span>
              </label>
              <input
                ref={urlInputRef}
                type="text"
                id="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com"
                className={`
                  w-full px-3 py-2 text-sm border rounded-md outline-none transition-colors
                  ${error 
                    ? "border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-100" 
                    : "border-neutral-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  }
                `}
              />
              {error && (
                <p className="mt-1.5 text-xs text-red-500">{error}</p>
              )}
            </div>

            {/* Title field */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-neutral-700 mb-1.5">
                Title <span className="text-neutral-400">(optional)</span>
              </label>
              <input
                type="text"
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="My Reference"
                className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-md outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-colors"
              />
              <p className="mt-1.5 text-xs text-neutral-400">
                If not provided, the domain name will be used as the title.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-neutral-200 bg-neutral-50 rounded-b-lg">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-md transition-colors"
            >
              Add URL
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
