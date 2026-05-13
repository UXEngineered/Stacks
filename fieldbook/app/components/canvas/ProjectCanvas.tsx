"use client";

/**
 * React Flow canvas for the project view
 * 
 * Features:
 * - Starts blank with empty state hint
 * - Supports adding URL and File nodes
 * - Persists nodes/edges to localStorage per project
 * - Inspector panel for selected node
 * - In-app content viewer for files and URLs
 */

import { useCallback, useState, useEffect, useRef } from "react";
import ReactFlow, {
  Background,
  Controls,
  type Node,
  type Edge,
  type Connection,
  type OnNodesChange,
  type OnEdgesChange,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  useReactFlow,
  ReactFlowProvider,
} from "reactflow";
import "reactflow/dist/style.css";

import { UrlNode, type UrlNodeData } from "./nodes/UrlNode";
import { FileNode, type FileNodeData } from "./nodes/FileNode";
import { GoogleDocNode, type GoogleDocNodeData } from "./nodes/GoogleDocNode";
import { DerivedDocNode, type DerivedDocNodeData } from "./nodes/DerivedDocNode";
import { FieldbookDocNode, type FieldbookDocNodeData } from "./nodes/FieldbookDocNode";
import { Inspector } from "./Inspector";
import { AddUrlModal } from "./AddUrlModal";
import { CreateDerivedDocModal } from "./CreateDerivedDocModal";
import { DerivedDocEditor } from "./DerivedDocEditor";
import { FieldbookDocEditor } from "./FieldbookDocEditor";
import { ContentViewer, type ViewerContent } from "../viewer/ContentViewer";
import { createDocument, getDocument, saveDocument } from "../../lib/document";
import type { Document } from "../../lib/document/types";
import type { UserRef } from "../../lib/document/version";

// Union type for all node data types
export type CanvasNodeData = UrlNodeData | FileNodeData | GoogleDocNodeData | DerivedDocNodeData | FieldbookDocNodeData;

// Register custom node types
const nodeTypes = {
  url: UrlNode,
  file: FileNode,
  "google-doc": GoogleDocNode,
  derived_doc: DerivedDocNode,
  "fieldbook-doc": FieldbookDocNode,
};

// Detect Google Doc/Sheets/Slides URL
function detectGoogleDocType(url: string): "docs" | "sheets" | "slides" | null {
  const urlLower = url.toLowerCase();
  if (urlLower.includes("docs.google.com/document")) return "docs";
  if (urlLower.includes("docs.google.com/spreadsheets")) return "sheets";
  if (urlLower.includes("docs.google.com/presentation")) return "slides";
  return null;
}

// localStorage key prefix
const STORAGE_KEY_PREFIX = "fieldbook_canvas_";

// Check if file is text-based
function isTextFile(mimeType: string): boolean {
  return mimeType.startsWith("text/") || 
         mimeType === "application/json" ||
         mimeType === "application/xml" ||
         mimeType === "application/javascript";
}

// Check if file is an image
function isImageFile(mimeType: string): boolean {
  return mimeType.startsWith("image/");
}

// Check if file is a PDF
function isPdfFile(mimeType: string): boolean {
  return mimeType === "application/pdf";
}

interface ProjectCanvasInnerProps {
  projectId: string;
  showAddUrlModal: boolean;
  onCloseAddUrlModal: () => void;
}

function ProjectCanvasInner({ 
  projectId, 
  showAddUrlModal, 
  onCloseAddUrlModal,
}: ProjectCanvasInnerProps) {
  const [nodes, setNodes] = useState<Node<CanvasNodeData>[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [selectedNode, setSelectedNode] = useState<Node<CanvasNodeData> | null>(null);
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]); // Multi-select
  const [isLoaded, setIsLoaded] = useState(false);
  const [viewerContent, setViewerContent] = useState<ViewerContent | null>(null);
  const [showCreateDerivedModal, setShowCreateDerivedModal] = useState(false);
  const [editingDerivedDoc, setEditingDerivedDoc] = useState<Node<DerivedDocNodeData> | null>(null);
  const [editingFieldbookDoc, setEditingFieldbookDoc] = useState<Node<FieldbookDocNodeData> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { getViewport, screenToFlowPosition, setCenter } = useReactFlow();

  // Load from localStorage on mount
  useEffect(() => {
    const storageKey = `${STORAGE_KEY_PREFIX}${projectId}`;
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const { nodes: savedNodes, edges: savedEdges } = JSON.parse(saved);
        setNodes(savedNodes || []);
        setEdges(savedEdges || []);
      }
    } catch (error) {
      console.error("Failed to load canvas from localStorage:", error);
    }
    setIsLoaded(true);
  }, [projectId]);

  // Save to localStorage when nodes/edges change
  useEffect(() => {
    if (!isLoaded) return;
    const storageKey = `${STORAGE_KEY_PREFIX}${projectId}`;
    try {
      localStorage.setItem(storageKey, JSON.stringify({ nodes, edges }));
    } catch (error) {
      console.error("Failed to save canvas to localStorage:", error);
    }
  }, [nodes, edges, projectId, isLoaded]);

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );

  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  // Handle new edge connections (drag from handle to handle)
  const onConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return;

      // Create the new edge
      const newEdge: Edge = {
        id: `edge-${connection.source}-${connection.target}-${Date.now()}`,
        source: connection.source,
        target: connection.target,
        type: "default",
        style: { stroke: "#d97706", strokeWidth: 1.5, strokeDasharray: "4 2" },
        animated: false,
      };

      setEdges((eds) => addEdge(newEdge, eds));

      // Check if target is a derived doc - if so, trigger recalibration
      const targetNode = nodes.find((n) => n.id === connection.target);
      if (targetNode && targetNode.data.type === "derived_doc") {
        const derivedData = targetNode.data as DerivedDocNodeData;
        
        // Check if source is not already in sourceNodeIds
        if (!derivedData.sourceNodeIds.includes(connection.source)) {
          // Update the derived doc to add the new source and start recalibrating
          setNodes((nds) =>
            nds.map((n) => {
              if (n.id === connection.target && n.data.type === "derived_doc") {
                return {
                  ...n,
                  data: {
                    ...n.data,
                    sourceNodeIds: [...(n.data as DerivedDocNodeData).sourceNodeIds, connection.source],
                    isRecalibrating: true,
                  } as DerivedDocNodeData,
                };
              }
              return n;
            })
          );

          // Simulate recalibration completing after a delay
          setTimeout(() => {
            setNodes((nds) =>
              nds.map((n) => {
                if (n.id === connection.target && n.data.type === "derived_doc") {
                  const sourceNode = nodes.find((sn) => sn.id === connection.source);
                  const sourceLabel = sourceNode?.data.label || "new source";
                  const currentData = n.data as DerivedDocNodeData;
                  
                  return {
                    ...n,
                    data: {
                      ...currentData,
                      isRecalibrating: false,
                      // Update content to reflect the new source
                      content: currentData.content + `\n\n---\n\n## Updated with ${sourceLabel}\n\n*Content recalibrated to incorporate new source material.*\n\n- Additional insights from ${sourceLabel}\n- Cross-referenced with existing analysis\n- Updated conclusions based on expanded context`,
                    } as DerivedDocNodeData,
                  };
                }
                return n;
              })
            );
          }, 3000); // 3 second recalibration
        }
      }
    },
    [nodes]
  );

  const onNodeClick = useCallback(
    (event: React.MouseEvent, node: Node<CanvasNodeData>) => {
      // Shift-click for multi-select
      if (event.shiftKey) {
        setSelectedNodeIds((prev) => {
          if (prev.includes(node.id)) {
            // Deselect if already selected
            return prev.filter((id) => id !== node.id);
          } else {
            // Add to selection
            return [...prev, node.id];
          }
        });
        // Keep inspector showing the clicked node
        setSelectedNode(node);
      } else {
        // Regular click - single select
        setSelectedNode(node);
        setSelectedNodeIds([node.id]);
      }
    },
    []
  );

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
    setSelectedNodeIds([]);
  }, []);

  const closeInspector = useCallback(() => {
    setSelectedNode(null);
  }, []);

  // Delete a node by ID
  const handleDeleteNode = useCallback((nodeId: string) => {
    setNodes((nds) => nds.filter((n) => n.id !== nodeId));
    // Also remove any edges connected to this node
    setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
    setSelectedNode(null);
    setSelectedNodeIds((prev) => prev.filter((id) => id !== nodeId));
  }, []);

  // Generate stub content for derived doc
  const generateStubContent = useCallback((prompt: string, sourceNodes: Node<CanvasNodeData>[]) => {
    const sourceTitles = sourceNodes.map((n) => n.data.label).join(", ");
    return `# Draft Document

Generated from: ${sourceTitles}

## Overview
This document synthesizes information from the selected source materials.

## Key Points
- Point 1 from source analysis
- Point 2 from source analysis
- Point 3 from source analysis

## Details
${prompt}

---
*This is placeholder content. AI integration pending.*
`;
  }, []);

  // Handle creating derived doc
  const handleCreateDerivedDoc = useCallback((prompt: string, title?: string) => {
    const sourceNodes = nodes.filter((n) => selectedNodeIds.includes(n.id));
    if (sourceNodes.length < 2) return;

    // Calculate centroid of selected nodes
    const centroid = sourceNodes.reduce(
      (acc, node) => ({
        x: acc.x + node.position.x / sourceNodes.length,
        y: acc.y + node.position.y / sourceNodes.length,
      }),
      { x: 0, y: 0 }
    );

    // Position new node below centroid
    const position = {
      x: centroid.x,
      y: centroid.y + 200,
    };

    const newNodeId = `derived-${Date.now()}`;
    const newNode: Node<DerivedDocNodeData> = {
      id: newNodeId,
      type: "derived_doc",
      position,
      data: {
        label: title || "Derived Document",
        type: "derived_doc",
        title: title || "Derived Document",
        prompt,
        content: "", // Start empty - AI will generate
        sourceNodeIds: selectedNodeIds,
        shouldAutoGenerate: true, // Flag to trigger AI generation when editor opens
      },
    };

    // Create edges from each source to the derived doc
    const newEdges: Edge[] = selectedNodeIds.map((sourceId) => ({
      id: `edge-${sourceId}-${newNodeId}`,
      source: sourceId,
      target: newNodeId,
      type: "default",
      style: { stroke: "#d97706", strokeWidth: 1.5, strokeDasharray: "4 2" },
      animated: false,
    }));

    setNodes((nds) => [...nds, newNode]);
    setEdges((eds) => [...eds, ...newEdges]);
    
    // Open the editor immediately so user can see AI generation
    setEditingDerivedDoc(newNode);
    
    // Clear selection
    setSelectedNode(null);
    setSelectedNodeIds([]);
    setShowCreateDerivedModal(false);
  }, [nodes, selectedNodeIds]);

  // Handle updating derived doc
  const handleUpdateDerivedDoc = useCallback((nodeId: string, updates: Partial<DerivedDocNodeData>) => {
    setNodes((nds) => 
      nds.map((n) => {
        if (n.id === nodeId && n.data.type === "derived_doc") {
          return {
            ...n,
            data: {
              ...n.data,
              ...updates,
              label: updates.title || n.data.label,
            } as DerivedDocNodeData,
          };
        }
        return n;
      })
    );
  }, []);

  // Focus on a specific node
  const handleFocusNode = useCallback((nodeId: string) => {
    const node = nodes.find((n) => n.id === nodeId);
    if (node) {
      setCenter(node.position.x + 80, node.position.y + 60, { zoom: 1, duration: 500 });
      setSelectedNode(node);
      setSelectedNodeIds([nodeId]);
    }
  }, [nodes, setCenter]);

  // Open derived doc editor
  const handleOpenDerivedDocEditor = useCallback((node: Node<DerivedDocNodeData>) => {
    setEditingDerivedDoc(node);
  }, []);

  // Open Fieldbook doc editor
  const handleOpenFieldbookDocEditor = useCallback((node: Node<FieldbookDocNodeData>) => {
    setEditingFieldbookDoc(node);
  }, []);

  // Update Fieldbook doc node when edited
  const handleUpdateFieldbookDoc = useCallback((documentId: string, title: string, previewText: string) => {
    setNodes((nds) => {
      // Find the node first
      const targetNode = nds.find(
        (n) => n.data.type === "fieldbook-doc" && (n.data as FieldbookDocNodeData).documentId === documentId
      );
      
      if (!targetNode) {
        console.warn(`Could not find fieldbook-doc node with documentId: ${documentId}`);
        return nds; // Return unchanged
      }
      
      return nds.map((n) => {
        if (n.id === targetNode.id) {
          return {
            ...n,
            data: {
              ...n.data,
              label: title || n.data.label, // Keep old label if new one is empty
              previewText: previewText ?? (n.data as FieldbookDocNodeData).previewText,
              updatedAt: new Date().toISOString(),
            } as FieldbookDocNodeData,
          };
        }
        return n;
      });
    });
  }, []);

  // Handle title change from canvas node (inline editing)
  const handleFieldbookDocTitleChange = useCallback((documentId: string, newTitle: string) => {
    // Update the node
    setNodes((nds) =>
      nds.map((n) => {
        if (n.data.type === "fieldbook-doc" && (n.data as FieldbookDocNodeData).documentId === documentId) {
          return {
            ...n,
            data: {
              ...n.data,
              label: newTitle,
              updatedAt: new Date().toISOString(),
            } as FieldbookDocNodeData,
          };
        }
        return n;
      })
    );

    // Also update the document store
    const doc = getDocument(documentId);
    if (doc) {
      const author: UserRef = { id: "user-1", name: "Current User" };
      saveDocument({
        ...doc,
        meta: {
          ...doc.meta,
          title: newTitle,
          updatedAt: new Date().toISOString(),
        },
      }, author);
    }
  }, []);

  // Handle keyboard shortcuts for deletion
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle delete if a node is selected and we're not in an input field
      if (selectedNodeIds.length === 0) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        // Delete all selected nodes
        selectedNodeIds.forEach((id) => handleDeleteNode(id));
      }
      
      // Escape to clear selection
      if (e.key === "Escape") {
        setSelectedNode(null);
        setSelectedNodeIds([]);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [selectedNodeIds, handleDeleteNode]);

  // Get position near center of viewport
  const getCenterPosition = useCallback(() => {
    const viewport = getViewport();
    // Convert screen center to flow position
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    const flowPos = screenToFlowPosition({ x: centerX, y: centerY });
    // Add some randomness to avoid stacking
    return {
      x: flowPos.x + (Math.random() - 0.5) * 100,
      y: flowPos.y + (Math.random() - 0.5) * 100,
    };
  }, [getViewport, screenToFlowPosition]);

  // Create a new Fieldbook document
  const handleCreateFieldbookDoc = useCallback(() => {
    const position = getCenterPosition();
    
    // Generate unique document ID
    const docId = `doc-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const now = new Date().toISOString();
    
    // Create the document in the store
    const newDoc: Document = {
      schemaVersion: "1.0",
      meta: {
        id: docId,
        title: "Untitled Document",
        createdAt: now,
        updatedAt: now,
        createdBy: "user-jw-001",
      },
      blocks: [
        {
          id: "block-1",
          type: "paragraph",
          content: [{ text: "" }],
        },
      ],
    };

    const author: UserRef = {
      id: "user-jw-001",
      name: "James Williams",
      email: "james@fieldbook.dev",
    };

    try {
      createDocument(newDoc, author);
    } catch (err) {
      console.error("Failed to create document:", err);
      return;
    }

    // Create canvas node
    const newNode: Node<FieldbookDocNodeData> = {
      id: `fieldbook-doc-${Date.now()}`,
      type: "fieldbook-doc",
      position,
      data: {
        label: "Untitled Document",
        type: "fieldbook-doc",
        documentId: docId,
        updatedAt: now,
      },
    };
    
    setNodes((nds) => [...nds, newNode]);
    
    // Open editor immediately
    setEditingFieldbookDoc(newNode);
  }, [getCenterPosition]);

  // Derive label from URL
  const getLabelFromUrl = (url: string): string => {
    try {
      const urlObj = new URL(url);
      const path = urlObj.pathname !== "/" ? urlObj.pathname : "";
      return `${urlObj.hostname}${path}`.slice(0, 40);
    } catch {
      return url.slice(0, 40);
    }
  };

  // Handle adding a URL node
  const handleAddUrl = useCallback((url: string, title?: string) => {
    const position = getCenterPosition();
    const googleDocType = detectGoogleDocType(url);
    
    // Create Google Doc node for Google Docs/Sheets/Slides
    if (googleDocType) {
      const newNode: Node<GoogleDocNodeData> = {
        id: `google-doc-${Date.now()}`,
        type: "google-doc",
        position,
        data: {
          label: title || "Untitled Document",
          type: "google-doc",
          url,
          docType: googleDocType,
        },
      };
      setNodes((nds) => [...nds, newNode]);
    } else {
      // Create regular URL node for other URLs
      const newNode: Node<UrlNodeData> = {
        id: `url-${Date.now()}`,
        type: "url",
        position,
        data: {
          label: title || getLabelFromUrl(url),
          type: "url",
          url,
        },
      };
      setNodes((nds) => [...nds, newNode]);
    }
    
    onCloseAddUrlModal();
  }, [getCenterPosition, onCloseAddUrlModal]);

  // Handle file upload
  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const position = getCenterPosition();
    const previewUrl = URL.createObjectURL(file);
    
    // Read text content for text-based files
    let textContent: string | undefined;
    if (isTextFile(file.type)) {
      try {
        textContent = await file.text();
      } catch (error) {
        console.error("Failed to read text file:", error);
      }
    }
    
    const newNode: Node<FileNodeData> = {
      id: `file-${Date.now()}`,
      type: "file",
      position,
      data: {
        label: file.name,
        type: "file",
        fileName: file.name,
        fileType: file.type || "application/octet-stream",
        fileSize: file.size,
        previewUrl,
        textContent,
      },
    };
    setNodes((nds) => [...nds, newNode]);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [getCenterPosition]);

  // Handle opening content viewer for URL
  const handleOpenUrlViewer = useCallback((url: string, title: string) => {
    setViewerContent({
      type: "url",
      title,
      url,
    });
  }, []);

  // Handle opening content viewer for file
  const handleOpenFileViewer = useCallback((data: FileNodeData) => {
    if (isImageFile(data.fileType)) {
      setViewerContent({
        type: "image",
        title: data.fileName,
        previewUrl: data.previewUrl,
        mimeType: data.fileType,
      });
    } else if (isPdfFile(data.fileType)) {
      setViewerContent({
        type: "pdf",
        title: data.fileName,
        previewUrl: data.previewUrl,
        mimeType: data.fileType,
      });
    } else if (isTextFile(data.fileType)) {
      setViewerContent({
        type: "text",
        title: data.fileName,
        textContent: data.textContent,
        mimeType: data.fileType,
      });
    } else {
      // For other file types, just open the preview URL
      setViewerContent({
        type: "url",
        title: data.fileName,
        url: data.previewUrl,
      });
    }
  }, []);

  const handleCloseViewer = useCallback(() => {
    setViewerContent(null);
  }, []);

  // Expose file upload trigger
  useEffect(() => {
    const triggerFileUpload = () => {
      fileInputRef.current?.click();
    };
    
    (window as unknown as Record<string, unknown>).__fieldbookTriggerFileUpload = triggerFileUpload;
    
    return () => {
      delete (window as unknown as Record<string, unknown>).__fieldbookTriggerFileUpload;
    };
  }, []);

  // Expose create document trigger
  useEffect(() => {
    (window as unknown as Record<string, unknown>).__fieldbookCreateDocument = handleCreateFieldbookDoc;
    
    return () => {
      delete (window as unknown as Record<string, unknown>).__fieldbookCreateDocument;
    };
  }, [handleCreateFieldbookDoc]);

  // Keep selected node in sync with nodes array
  useEffect(() => {
    if (selectedNode) {
      const updated = nodes.find((n) => n.id === selectedNode.id);
      if (updated) {
        setSelectedNode(updated);
      } else {
        setSelectedNode(null);
      }
    }
  }, [nodes, selectedNode]);

  // Keep editing derived doc in sync
  useEffect(() => {
    if (editingDerivedDoc) {
      const updated = nodes.find((n) => n.id === editingDerivedDoc.id);
      if (updated && updated.data.type === "derived_doc") {
        setEditingDerivedDoc(updated as Node<DerivedDocNodeData>);
      }
    }
  }, [nodes, editingDerivedDoc]);

  // Keep editing Fieldbook doc in sync
  useEffect(() => {
    if (editingFieldbookDoc) {
      const updated = nodes.find((n) => n.id === editingFieldbookDoc.id);
      if (updated && updated.data.type === "fieldbook-doc") {
        setEditingFieldbookDoc(updated as Node<FieldbookDocNodeData>);
      }
    }
  }, [nodes, editingFieldbookDoc]);

  // Get selected nodes for multi-select display
  const selectedNodes = nodes.filter((n) => selectedNodeIds.includes(n.id));

  // Apply selection styling to nodes and inject callbacks
  const styledNodes = nodes.map((node) => {
    const baseNode = {
      ...node,
      selected: selectedNodeIds.includes(node.id),
    };
    
    // Inject onTitleChange callback for fieldbook-doc nodes
    if (node.data.type === "fieldbook-doc") {
      return {
        ...baseNode,
        data: {
          ...node.data,
          onTitleChange: handleFieldbookDocTitleChange,
        },
      };
    }
    
    return baseNode;
  });

  return (
    <div className="flex h-full">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Canvas area */}
      <div className="flex-1 relative">
        <ReactFlow
          nodes={styledNodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          nodeTypes={nodeTypes}
          fitView={nodes.length > 0}
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.25}
          maxZoom={2}
          proOptions={{ hideAttribution: true }}
        >
          <Background color="#e5e7eb" gap={24} size={1} />
          <Controls 
            showInteractive={false}
            className="!bg-white !border !border-neutral-200 !shadow-sm !rounded-lg"
          />
          
          {/* Empty state hint */}
          {nodes.length === 0 && isLoaded && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-neutral-600">Drop a file or add a URL</p>
                  <p className="text-xs text-neutral-400 mt-1">Use the Add button in the toolbar to get started</p>
                </div>
              </div>
            </div>
          )}
        </ReactFlow>

        {/* Floating toolbar for multi-select */}
        {selectedNodeIds.length >= 2 && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20">
            <div className="flex items-center gap-2 px-4 py-2.5 bg-white rounded-xl shadow-lg shadow-neutral-900/10">
              <span className="text-xs text-neutral-500">
                {selectedNodeIds.length} selected
              </span>
              <div className="w-px h-4 bg-neutral-200" />
              <button
                onClick={() => setShowCreateDerivedModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-amber-500 hover:bg-amber-600 rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
                Create
              </button>
              <button
                onClick={() => {
                  setSelectedNode(null);
                  setSelectedNodeIds([]);
                }}
                className="p-1.5 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded-md transition-colors"
                title="Clear selection (Esc)"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Inspector panel */}
      {selectedNode && (
        <Inspector 
          node={selectedNode} 
          onClose={closeInspector}
          onOpenViewer={handleOpenUrlViewer}
          onOpenFileViewer={handleOpenFileViewer}
          onDeleteNode={handleDeleteNode}
          onOpenDerivedDocEditor={handleOpenDerivedDocEditor}
          onOpenFieldbookDocEditor={handleOpenFieldbookDocEditor}
        />
      )}

      {/* Add URL Modal */}
      {showAddUrlModal && (
        <AddUrlModal onSubmit={handleAddUrl} onClose={onCloseAddUrlModal} />
      )}

      {/* Create Derived Doc Modal */}
      {showCreateDerivedModal && (
        <CreateDerivedDocModal
          selectedNodes={selectedNodes}
          onGenerate={handleCreateDerivedDoc}
          onClose={() => setShowCreateDerivedModal(false)}
        />
      )}

      {/* Derived Doc Editor */}
      {editingDerivedDoc && (
        <DerivedDocEditor
          node={editingDerivedDoc}
          allNodes={nodes}
          onClose={() => setEditingDerivedDoc(null)}
          onUpdate={handleUpdateDerivedDoc}
          onFocusNode={handleFocusNode}
        />
      )}

      {/* Fieldbook Doc Editor */}
      {editingFieldbookDoc && (
        <FieldbookDocEditor
          documentId={editingFieldbookDoc.data.documentId}
          onClose={() => setEditingFieldbookDoc(null)}
          onUpdate={handleUpdateFieldbookDoc}
        />
      )}

      {/* Content Viewer */}
      {viewerContent && (
        <ContentViewer
          content={viewerContent}
          onClose={handleCloseViewer}
        />
      )}
    </div>
  );
}

interface ProjectCanvasProps {
  projectId: string;
  showAddUrlModal: boolean;
  onCloseAddUrlModal: () => void;
}

export function ProjectCanvas(props: ProjectCanvasProps) {
  return (
    <ReactFlowProvider>
      <ProjectCanvasInner {...props} />
    </ReactFlowProvider>
  );
}
