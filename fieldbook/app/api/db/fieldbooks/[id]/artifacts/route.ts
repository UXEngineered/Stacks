/**
 * Artifacts API
 * GET /api/db/fieldbooks/[id]/artifacts - List all artifacts
 * POST /api/db/fieldbooks/[id]/artifacts - Create a new artifact
 */

import { NextResponse } from "next/server";
import { getArtifacts, createArtifact } from "../../../../../lib/db";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const artifacts = await getArtifacts(id);
    return NextResponse.json(artifacts);
  } catch (error) {
    console.error("Failed to get artifacts:", error);
    return NextResponse.json({ error: "Failed to get artifacts" }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    if (!body.title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }
    
    const artifact = await createArtifact(id, {
      type: body.type || "decision-brief",
      title: body.title,
      content: body.content || "",
      informedBy: body.informedBy || [],
      status: body.status || "draft",
    });
    
    if (!artifact) {
      return NextResponse.json({ error: "Fieldbook not found" }, { status: 404 });
    }
    
    return NextResponse.json(artifact, { status: 201 });
  } catch (error) {
    console.error("Failed to create artifact:", error);
    return NextResponse.json({ error: "Failed to create artifact" }, { status: 500 });
  }
}
