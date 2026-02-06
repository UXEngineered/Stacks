/**
 * POST /api/v1/fieldbooks/:id/artifacts - Create an artifact node
 * 
 * Convenience endpoint for creating artifact-type nodes.
 * Artifacts are outputs: decision briefs, opportunity maps, design rationale, etc.
 */

import { NextRequest, NextResponse } from "next/server";
import { createNode, getFieldbook } from "@/app/lib/phase0/db";
import type { Node, NodeMetadata, ApiError, ArtifactSubtype } from "@/app/lib/phase0/types";

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface CreateArtifactRequest {
  title: string;
  subtype?: ArtifactSubtype;
  content?: Record<string, unknown>;
  metadata?: NodeMetadata;
}

export async function POST(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<Node | ApiError>> {
  try {
    const { id: fieldbookId } = await params;
    const body = await request.json() as CreateArtifactRequest;
    
    // Validate fieldbook exists
    const fieldbook = await getFieldbook(fieldbookId);
    if (!fieldbook) {
      return NextResponse.json(
        { error: "Fieldbook not found", code: "NOT_FOUND" },
        { status: 404 }
      );
    }
    
    // Validate required fields
    if (!body.title || typeof body.title !== "string" || body.title.trim().length === 0) {
      return NextResponse.json(
        { error: "title is required", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }
    
    // Validate subtype if provided
    const validSubtypes: ArtifactSubtype[] = [
      "decision-brief",
      "opportunity-map",
      "design-rationale",
      "research-warrant",
      "alignment-map",
      "evidence-inventory",
      "transition-playbook",
      "custom",
    ];
    
    if (body.subtype && !validSubtypes.includes(body.subtype)) {
      return NextResponse.json(
        { 
          error: `Invalid subtype. Must be one of: ${validSubtypes.join(", ")}`, 
          code: "VALIDATION_ERROR" 
        },
        { status: 400 }
      );
    }
    
    const node = await createNode(fieldbookId, {
      nodeType: "artifact",
      subtype: body.subtype || "custom",
      title: body.title.trim(),
      content: body.content,
      metadata: body.metadata,
    });
    
    return NextResponse.json(node, { status: 201 });
  } catch (error) {
    const err = error as { code?: string; message?: string };
    
    if (err.code === "NOT_FOUND") {
      return NextResponse.json(
        { error: err.message || "Not found", code: "NOT_FOUND" },
        { status: 404 }
      );
    }
    
    console.error("[POST /api/v1/fieldbooks/:id/artifacts] Error:", error);
    return NextResponse.json(
      { error: "Failed to create artifact", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
