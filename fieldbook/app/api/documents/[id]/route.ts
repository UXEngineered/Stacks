/**
 * Document API Routes
 * 
 * PUT /api/documents/[id] - Save document with conflict detection
 * GET /api/documents/[id] - Get document
 * DELETE /api/documents/[id] - Delete document
 * 
 * Save Contract:
 * - Request includes baseVersion (optimistic concurrency control)
 * - If server version > baseVersion, returns 409 Conflict with server state
 * - Otherwise, saves and returns new version number
 */

import { NextRequest, NextResponse } from "next/server";

// =============================================================================
// TYPE DEFINITIONS (mirrors client types)
// =============================================================================

interface SaveDocumentRequestBody {
  document: unknown;  // Document type
  baseVersion: number;
  clientId: string;
}

interface SaveDocumentResponse {
  success: boolean;
  version: number;
  savedAt: string;
  conflict?: {
    serverVersion: number;
    serverSavedAt: string;
    serverSavedBy?: string;
    serverDocument: unknown;
  };
}

// =============================================================================
// IN-MEMORY STORE (for demo - would be database in production)
// =============================================================================

// Note: In production, this would be a database. 
// This in-memory store is for API contract demonstration only.
// The actual implementation currently uses localStorage on client.

interface StoredDocument {
  document: unknown;
  version: number;
  savedAt: string;
  savedBy?: string;
}

const documentStore = new Map<string, StoredDocument>();

// =============================================================================
// ROUTE HANDLERS
// =============================================================================

/**
 * GET /api/documents/[id]
 * Retrieve a document by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  const stored = documentStore.get(id);
  
  if (!stored) {
    return NextResponse.json(
      { error: "Document not found" },
      { status: 404 }
    );
  }
  
  return NextResponse.json({
    document: stored.document,
    version: stored.version,
  });
}

/**
 * PUT /api/documents/[id]
 * Save document with optimistic concurrency control
 * 
 * Request body:
 * {
 *   document: Document,
 *   baseVersion: number,  // Version client thinks is current
 *   clientId: string      // For idempotency
 * }
 * 
 * Success response (200):
 * {
 *   success: true,
 *   version: number,
 *   savedAt: string
 * }
 * 
 * Conflict response (409):
 * {
 *   success: false,
 *   version: number,
 *   savedAt: string,
 *   conflict: {
 *     serverVersion: number,
 *     serverSavedAt: string,
 *     serverSavedBy?: string,
 *     serverDocument: Document
 *   }
 * }
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  let body: SaveDocumentRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }
  
  const { document, baseVersion, clientId } = body;
  
  if (!document || baseVersion === undefined) {
    return NextResponse.json(
      { error: "Missing required fields: document, baseVersion" },
      { status: 400 }
    );
  }
  
  // Get current server state
  const current = documentStore.get(id);
  const serverVersion = current?.version ?? 0;
  
  // Check for version conflict
  if (serverVersion > baseVersion) {
    const response: SaveDocumentResponse = {
      success: false,
      version: serverVersion,
      savedAt: current?.savedAt ?? new Date().toISOString(),
      conflict: {
        serverVersion,
        serverSavedAt: current?.savedAt ?? new Date().toISOString(),
        serverSavedBy: current?.savedBy,
        serverDocument: current?.document ?? document,
      },
    };
    
    return NextResponse.json(response, { status: 409 });
  }
  
  // No conflict - save the document
  const newVersion = serverVersion + 1;
  const savedAt = new Date().toISOString();
  
  // TODO: Get user from auth
  const savedBy = request.headers.get("x-user-id") ?? "anonymous";
  
  documentStore.set(id, {
    document,
    version: newVersion,
    savedAt,
    savedBy,
  });
  
  const response: SaveDocumentResponse = {
    success: true,
    version: newVersion,
    savedAt,
  };
  
  return NextResponse.json(response);
}

/**
 * DELETE /api/documents/[id]
 * Delete a document
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  if (!documentStore.has(id)) {
    return NextResponse.json(
      { error: "Document not found" },
      { status: 404 }
    );
  }
  
  documentStore.delete(id);
  
  return NextResponse.json({ success: true });
}
