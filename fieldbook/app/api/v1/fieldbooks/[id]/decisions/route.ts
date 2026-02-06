/**
 * POST /api/v1/fieldbooks/:id/decisions - Create a decision node
 * 
 * Convenience endpoint for creating decision-type artifacts.
 * Decisions are a specific type of artifact representing a choice that was made.
 */

import { NextRequest, NextResponse } from "next/server";
import { createNode, getFieldbook } from "@/app/lib/phase0/db";
import type { Node, ApiError } from "@/app/lib/phase0/types";

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface CreateDecisionRequest {
  title: string;
  content?: Record<string, unknown>;
  metadata?: {
    decision?: string;
    rationale?: string;
    alternatives?: string[];
    consequences?: string[];
    decisionDate?: string;
    decisionMaker?: string;
    [key: string]: unknown;
  };
}

export async function POST(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<Node | ApiError>> {
  try {
    const { id: fieldbookId } = await params;
    const body = await request.json() as CreateDecisionRequest;
    
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
    
    const node = await createNode(fieldbookId, {
      nodeType: "artifact",
      subtype: "decision-brief",
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
    
    console.error("[POST /api/v1/fieldbooks/:id/decisions] Error:", error);
    return NextResponse.json(
      { error: "Failed to create decision", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
