/**
 * GET /api/documents/:id/versions
 *
 * Returns the version history for a document.
 * Versions are returned in reverse chronological order (newest first).
 */

import { NextRequest, NextResponse } from "next/server";
import { getVersionHistory, getDocument } from "@/app/lib/document";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: documentId } = await params;

  // Check document exists
  const document = getDocument(documentId);
  if (!document) {
    return NextResponse.json(
      { error: "Document not found", documentId },
      { status: 404 }
    );
  }

  // Get version history
  const history = getVersionHistory(documentId);
  if (!history) {
    return NextResponse.json(
      { error: "No version history found", documentId },
      { status: 404 }
    );
  }

  return NextResponse.json(history);
}
