/**
 * POST /api/documents/:id/restore/:versionId
 *
 * Restores a document to a previous version.
 * This creates a NEW version with the content from the target version.
 * History is preserved - this does not delete any versions.
 */

import { NextRequest, NextResponse } from "next/server";
import { restoreVersion, getDocument, getVersion } from "@/app/lib/document";
import type { UserRef } from "@/app/lib/document/version";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; versionId: string }> }
) {
  const { id: documentId, versionId } = await params;

  // Check document exists
  const document = getDocument(documentId);
  if (!document) {
    return NextResponse.json(
      { error: "Document not found", documentId },
      { status: 404 }
    );
  }

  // Check version exists
  const version = getVersion(versionId);
  if (!version) {
    return NextResponse.json(
      { error: "Version not found", versionId },
      { status: 404 }
    );
  }

  // Verify version belongs to this document
  if (version.documentId !== documentId) {
    return NextResponse.json(
      {
        error: "Version does not belong to this document",
        documentId,
        versionId,
      },
      { status: 400 }
    );
  }

  // In production, get author from session/auth
  // For prototype, use a mock user
  const author: UserRef = {
    id: "user-jw-001",
    name: "James Williams",
    email: "james@fieldbook.dev",
  };

  try {
    const newVersion = restoreVersion(documentId, versionId, author);

    return NextResponse.json({
      success: true,
      message: `Document restored to version ${version.versionNumber}`,
      newVersion: {
        versionId: newVersion.versionId,
        versionNumber: newVersion.versionNumber,
        createdAt: newVersion.createdAt,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to restore version", details: message },
      { status: 500 }
    );
  }
}
