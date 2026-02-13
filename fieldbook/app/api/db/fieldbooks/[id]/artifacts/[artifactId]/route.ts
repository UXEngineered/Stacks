/**
 * Single Artifact API
 * GET /api/db/fieldbooks/[id]/artifacts/[artifactId] - Get an artifact
 * PATCH /api/db/fieldbooks/[id]/artifacts/[artifactId] - Update an artifact
 * DELETE /api/db/fieldbooks/[id]/artifacts/[artifactId] - Delete an artifact
 */

import { NextResponse } from "next/server";
import { getArtifact, updateArtifact, deleteArtifact } from "../../../../../../lib/db";

interface RouteParams {
  params: Promise<{ id: string; artifactId: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id, artifactId } = await params;
    const artifact = await getArtifact(id, artifactId);
    
    if (!artifact) {
      return NextResponse.json({ error: "Artifact not found" }, { status: 404 });
    }
    
    return NextResponse.json(artifact);
  } catch (error) {
    console.error("Failed to get artifact:", error);
    return NextResponse.json({ error: "Failed to get artifact" }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { id, artifactId } = await params;
    const body = await request.json();
    
    // Only include fields that are actually provided to avoid overwriting with undefined
    const updateData: Record<string, unknown> = {
      id: artifactId,
    };
    if (body.type !== undefined) updateData.type = body.type;
    if (body.title !== undefined) updateData.title = body.title;
    if (body.content !== undefined) updateData.content = body.content;
    if (body.informedBy !== undefined) updateData.informedBy = body.informedBy;
    if (body.status !== undefined) updateData.status = body.status;
    // Semantic fields
    if (body.visibility !== undefined) updateData.visibility = body.visibility;
    if (body.tags !== undefined) updateData.tags = body.tags;
    if (body.owner !== undefined) updateData.owner = body.owner;
    
    const artifact = await updateArtifact(id, updateData as Parameters<typeof updateArtifact>[1]);
    
    if (!artifact) {
      return NextResponse.json({ error: "Artifact not found" }, { status: 404 });
    }
    
    return NextResponse.json(artifact);
  } catch (error) {
    console.error("Failed to update artifact:", error);
    return NextResponse.json({ error: "Failed to update artifact" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { id, artifactId } = await params;
    const deleted = await deleteArtifact(id, artifactId);
    
    if (!deleted) {
      return NextResponse.json({ error: "Artifact not found" }, { status: 404 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete artifact:", error);
    return NextResponse.json({ error: "Failed to delete artifact" }, { status: 500 });
  }
}
