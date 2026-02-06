"use client";

/**
 * Modal for creating a derived document from selected source nodes
 * 
 * Features:
 * - Prompt textarea (required)
 * - Optional title input
 * - Shows selected source nodes
 * - Generate button
 */

import { useState } from "react";
import type { Node } from "reactflow";
import type { CanvasNodeData } from "./ProjectCanvas";

interface CreateDerivedDocModalProps {
  selectedNodes: Node<CanvasNodeData>[];
  onGenerate: (prompt: string, title?: string) => void;
  onClose: () => void;
}

export function CreateDerivedDocModal({
  selectedNodes,
  onGenerate,
  onClose,
}: CreateDerivedDocModalProps) {
  const [prompt, setPrompt] = useState("");
  const [title, setTitle] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    onGenerate(prompt.trim(), title.trim() || undefined);
  };

  // Get display label for a node
  const getNodeLabel = (node: Node<CanvasNodeData>) => {
    return node.data.label || "Untitled";
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-neutral-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
              </div>
              <div>
                <h2 className="text-base font-semibold text-neutral-900">Create Derived Document</h2>
                <p className="text-xs text-neutral-500">Generate a new document from selected sources</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded-md transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-5">
          {/* Selected sources */}
          <div className="mb-4">
            <label className="block text-xs font-medium text-neutral-500 mb-2">
              Source Documents ({selectedNodes.length})
            </label>
            <div className="flex flex-wrap gap-1.5">
              {selectedNodes.map((node) => (
                <span
                  key={node.id}
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-neutral-100 text-neutral-700 rounded-md"
                >
                  <svg className="w-3 h-3 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                  {getNodeLabel(node)}
                </span>
              ))}
            </div>
          </div>

          {/* Prompt */}
          <div className="mb-4">
            <label htmlFor="prompt" className="block text-xs font-medium text-neutral-500 mb-2">
              What do you want to generate? <span className="text-red-500">*</span>
            </label>
            <textarea
              id="prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g., Create a PRD that synthesizes the requirements from these documents..."
              className="w-full px-3 py-2.5 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition-shadow"
              rows={4}
              autoFocus
            />
          </div>

          {/* Title (optional) */}
          <div className="mb-6">
            <label htmlFor="title" className="block text-xs font-medium text-neutral-500 mb-2">
              Title <span className="text-neutral-400">(optional)</span>
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Product Requirements Document"
              className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!prompt.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-amber-500 hover:bg-amber-600 disabled:bg-neutral-200 disabled:text-neutral-400 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
              Generate
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
