/**
 * POST /api/v1/fieldbooks/:id/sources - Create a source node
 * 
 * Convenience endpoint for creating source-type nodes.
 * Sources are inputs: links, notes, files, interviews, transcripts, documents.
 */

import { NextRequest, NextResponse } from "next/server";
import { createNode, getFieldbook } from "@/app/lib/phase0/db";
import type { Node, NodeMetadata, ApiError, SourceSubtype } from "@/app/lib/phase0/types";

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface CreateSourceRequest {
  title: string;
  subtype?: SourceSubtype;
  content?: Record<string, unknown>;
  metadata?: NodeMetadata;
}

export async function POST(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<Node | ApiError>> {
  try {
    const { id: fieldbookId } = await params;
    const body = await request.json() as CreateSourceRequest;
    
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
    const validSubtypes: SourceSubtype[] = [
      "link", "note", "file", "interview", "transcript", "document"
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
      nodeType: "source",
      subtype: body.subtype || "note",
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
    
    console.error("[POST /api/v1/fieldbooks/:id/sources] Error:", error);
    return NextResponse.json(
      { error: "Failed to create source", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
