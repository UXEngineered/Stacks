/**
 * Single Source API
 * GET /api/db/fieldbooks/[id]/sources/[sourceId] - Get a source
 * PATCH /api/db/fieldbooks/[id]/sources/[sourceId] - Update a source
 * DELETE /api/db/fieldbooks/[id]/sources/[sourceId] - Delete a source
 */

import { NextResponse } from "next/server";
import { getSource, updateSource, deleteSource } from "../../../../../../lib/db";

interface RouteParams {
  params: Promise<{ id: string; sourceId: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id, sourceId } = await params;
    const source = await getSource(id, sourceId);
    
    if (!source) {
      return NextResponse.json({ error: "Source not found" }, { status: 404 });
    }
    
    return NextResponse.json(source);
  } catch (error) {
    console.error("Failed to get source:", error);
    return NextResponse.json({ error: "Failed to get source" }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { id, sourceId } = await params;
    const body = await request.json();
    
    const source = await updateSource(id, {
      id: sourceId,
      title: body.title,
      type: body.type,
      content: body.content,
    });
    
    if (!source) {
      return NextResponse.json({ error: "Source not found" }, { status: 404 });
    }
    
    return NextResponse.json(source);
  } catch (error) {
    console.error("Failed to update source:", error);
    return NextResponse.json({ error: "Failed to update source" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { id, sourceId } = await params;
    const deleted = await deleteSource(id, sourceId);
    
    if (!deleted) {
      return NextResponse.json({ error: "Source not found" }, { status: 404 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete source:", error);
    return NextResponse.json({ error: "Failed to delete source" }, { status: 500 });
  }
}
