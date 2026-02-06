/**
 * Single Capture API
 * GET /api/db/fieldbooks/[id]/captures/[captureId] - Get a capture
 * PATCH /api/db/fieldbooks/[id]/captures/[captureId] - Update a capture
 * DELETE /api/db/fieldbooks/[id]/captures/[captureId] - Delete a capture
 */

import { NextResponse } from "next/server";
import { getCapture, updateCapture, deleteCapture } from "../../../../../../lib/db";

interface RouteParams {
  params: Promise<{ id: string; captureId: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id, captureId } = await params;
    const capture = await getCapture(id, captureId);
    
    if (!capture) {
      return NextResponse.json({ error: "Capture not found" }, { status: 404 });
    }
    
    return NextResponse.json(capture);
  } catch (error) {
    console.error("Failed to get capture:", error);
    return NextResponse.json({ error: "Failed to get capture" }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { id, captureId } = await params;
    const body = await request.json();
    
    const capture = await updateCapture(id, {
      id: captureId,
      ...body,
    });
    
    if (!capture) {
      return NextResponse.json({ error: "Capture not found" }, { status: 404 });
    }
    
    return NextResponse.json(capture);
  } catch (error) {
    console.error("Failed to update capture:", error);
    return NextResponse.json({ error: "Failed to update capture" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { id, captureId } = await params;
    const deleted = await deleteCapture(id, captureId);
    
    if (!deleted) {
      return NextResponse.json({ error: "Capture not found" }, { status: 404 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete capture:", error);
    return NextResponse.json({ error: "Failed to delete capture" }, { status: 500 });
  }
}
