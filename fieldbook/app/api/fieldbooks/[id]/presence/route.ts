/**
 * Presence API
 * 
 * GET /api/fieldbooks/[id]/presence - Get all active edit sessions
 * POST /api/fieldbooks/[id]/presence - Start or heartbeat an edit session
 * DELETE /api/fieldbooks/[id]/presence - End an edit session
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  isMember,
  getEditSession,
  startEditSession,
  heartbeat,
  endEditSession,
  getFieldBookEditSessions,
} from "@/app/lib/auth";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET - Get all active edit sessions for documents
export async function GET(request: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: fieldBookId } = await params;

  if (!isMember(fieldBookId, session.user.id)) {
    return NextResponse.json({ error: "Not a member" }, { status: 403 });
  }

  // Get document IDs from query params
  const { searchParams } = new URL(request.url);
  const documentIds = searchParams.get("documentIds")?.split(",") || [];

  const sessions = getFieldBookEditSessions(fieldBookId, documentIds);

  return NextResponse.json({ sessions });
}

// POST - Start editing or heartbeat
export async function POST(request: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: fieldBookId } = await params;

  if (!isMember(fieldBookId, session.user.id)) {
    return NextResponse.json({ error: "Not a member" }, { status: 403 });
  }

  const body = await request.json();
  const { documentId, documentType, action } = body;

  if (!documentId || !documentType) {
    return NextResponse.json(
      { error: "documentId and documentType are required" },
      { status: 400 }
    );
  }

  if (!["source", "synthesis", "artifact"].includes(documentType)) {
    return NextResponse.json(
      { error: "Invalid documentType" },
      { status: 400 }
    );
  }

  // Check if someone else is editing
  const existingSession = getEditSession(documentId);
  if (existingSession && existingSession.userId !== session.user.id) {
    return NextResponse.json({
      success: false,
      error: "Document is being edited by another user",
      currentEditor: existingSession.user,
    });
  }

  let editSession;

  if (action === "heartbeat") {
    // Just update heartbeat for existing session
    editSession = heartbeat(documentId, session.user.id);
    if (!editSession) {
      // Session expired, start a new one
      editSession = startEditSession(documentId, documentType, session.user.id);
    }
  } else {
    // Start or refresh edit session
    editSession = startEditSession(documentId, documentType, session.user.id);
  }

  if (!editSession) {
    return NextResponse.json(
      { success: false, error: "Could not start edit session" },
      { status: 409 }
    );
  }

  return NextResponse.json({ success: true, session: editSession });
}

// DELETE - End edit session
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: fieldBookId } = await params;
  const { searchParams } = new URL(request.url);
  const documentId = searchParams.get("documentId");

  if (!documentId) {
    return NextResponse.json({ error: "documentId is required" }, { status: 400 });
  }

  const ended = endEditSession(documentId, session.user.id);

  return NextResponse.json({ success: ended });
}
