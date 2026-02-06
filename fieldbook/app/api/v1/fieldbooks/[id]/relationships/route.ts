/**
 * POST /api/v1/fieldbooks/:id/relationships - Create an edge between nodes
 * GET /api/v1/fieldbooks/:id/relationships - List edges in a fieldbook
 * 
 * Validates:
 * - Both nodes belong to the same fieldbook
 * - No self-loops
 * - No duplicate edges
 */

import { NextRequest, NextResponse } from "next/server";
import { createEdge, getEdgesForFieldbook, getFieldbook } from "@/app/lib/phase0/db";
import type { CreateRelationshipRequest, Edge, RelationshipType, ApiError } from "@/app/lib/phase0/types";
import { ErrorCodes } from "@/app/lib/phase0/types";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<Edge | ApiError>> {
  try {
    const { id: fieldbookId } = await params;
    const body = await request.json() as CreateRelationshipRequest;
    
    // Validate fieldbook exists
    const fieldbook = await getFieldbook(fieldbookId);
    if (!fieldbook) {
      return NextResponse.json(
        { error: "Fieldbook not found", code: "NOT_FOUND" },
        { status: 404 }
      );
    }
    
    // Validate required fields
    if (!body.sourceNodeId) {
      return NextResponse.json(
        { error: "sourceNodeId is required", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }
    
    if (!body.targetNodeId) {
      return NextResponse.json(
        { error: "targetNodeId is required", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }
    
    if (!body.relationship) {
      return NextResponse.json(
        { error: "relationship is required", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }
    
    const validRelationships: RelationshipType[] = [
      "derived_from", "informed_by", "superseded", "related_to"
    ];
    if (!validRelationships.includes(body.relationship)) {
      return NextResponse.json(
        { 
          error: `Invalid relationship. Must be one of: ${validRelationships.join(", ")}`, 
          code: "INVALID_RELATIONSHIP" 
        },
        { status: 400 }
      );
    }
    
    const edge = await createEdge(fieldbookId, {
      sourceNodeId: body.sourceNodeId,
      targetNodeId: body.targetNodeId,
      relationship: body.relationship,
    });
    
    return NextResponse.json(edge, { status: 201 });
  } catch (error) {
    const err = error as { code?: string; message?: string };
    
    // Handle known error codes
    const errorMap: Record<string, { status: number }> = {
      [ErrorCodes.NOT_FOUND]: { status: 404 },
      [ErrorCodes.CROSS_FIELDBOOK_EDGE]: { status: 400 },
      [ErrorCodes.SELF_LOOP_EDGE]: { status: 400 },
      [ErrorCodes.DUPLICATE_EDGE]: { status: 409 },
      [ErrorCodes.INVALID_RELATIONSHIP]: { status: 400 },
    };
    
    if (err.code && errorMap[err.code]) {
      return NextResponse.json(
        { error: err.message || "Validation error", code: err.code },
        { status: errorMap[err.code].status }
      );
    }
    
    console.error("[POST /api/v1/fieldbooks/:id/relationships] Error:", error);
    return NextResponse.json(
      { error: "Failed to create relationship", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

export async function GET(
  _request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<Edge[] | ApiError>> {
  try {
    const { id: fieldbookId } = await params;
    
    // Validate fieldbook exists
    const fieldbook = await getFieldbook(fieldbookId);
    if (!fieldbook) {
      return NextResponse.json(
        { error: "Fieldbook not found", code: "NOT_FOUND" },
        { status: 404 }
      );
    }
    
    const edges = await getEdgesForFieldbook(fieldbookId);
    
    return NextResponse.json(edges);
  } catch (error) {
    console.error("[GET /api/v1/fieldbooks/:id/relationships] Error:", error);
    return NextResponse.json(
      { error: "Failed to list relationships", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
