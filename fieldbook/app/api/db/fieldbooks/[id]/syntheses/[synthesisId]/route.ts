/**
 * Single Synthesis API
 * GET /api/db/fieldbooks/[id]/syntheses/[synthesisId] - Get a synthesis
 * PATCH /api/db/fieldbooks/[id]/syntheses/[synthesisId] - Update a synthesis
 * DELETE /api/db/fieldbooks/[id]/syntheses/[synthesisId] - Delete a synthesis
 */

import { NextResponse } from "next/server";
import { getSynthesis, updateSynthesis, deleteSynthesis } from "../../../../../../lib/db";

interface RouteParams {
  params: Promise<{ id: string; synthesisId: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id, synthesisId } = await params;
    const synthesis = await getSynthesis(id, synthesisId);
    
    if (!synthesis) {
      return NextResponse.json({ error: "Synthesis not found" }, { status: 404 });
    }
    
    return NextResponse.json(synthesis);
  } catch (error) {
    console.error("Failed to get synthesis:", error);
    return NextResponse.json({ error: "Failed to get synthesis" }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { id, synthesisId } = await params;
    const body = await request.json();
    
    // Only include fields that are actually provided to avoid overwriting with undefined
    const updateData: Record<string, unknown> = {
      id: synthesisId,
    };
    if (body.title !== undefined) updateData.title = body.title;
    if (body.content !== undefined) updateData.content = body.content;
    if (body.derivedFrom !== undefined) updateData.derivedFrom = body.derivedFrom;
    if (body.status !== undefined) updateData.status = body.status;
    // Semantic fields
    if (body.type !== undefined) updateData.type = body.type;
    if (body.visibility !== undefined) updateData.visibility = body.visibility;
    if (body.tags !== undefined) updateData.tags = body.tags;
    if (body.owner !== undefined) updateData.owner = body.owner;
    
    const synthesis = await updateSynthesis(id, updateData as Parameters<typeof updateSynthesis>[1]);
    
    if (!synthesis) {
      return NextResponse.json({ error: "Synthesis not found" }, { status: 404 });
    }
    
    return NextResponse.json(synthesis);
  } catch (error) {
    console.error("Failed to update synthesis:", error);
    return NextResponse.json({ error: "Failed to update synthesis" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { id, synthesisId } = await params;
    const deleted = await deleteSynthesis(id, synthesisId);
    
    if (!deleted) {
      return NextResponse.json({ error: "Synthesis not found" }, { status: 404 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete synthesis:", error);
    return NextResponse.json({ error: "Failed to delete synthesis" }, { status: 500 });
  }
}
