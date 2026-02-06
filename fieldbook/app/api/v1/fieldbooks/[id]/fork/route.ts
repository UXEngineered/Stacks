/**
 * POST /api/v1/fieldbooks/:id/fork - Fork a fieldbook
 * 
 * Creates a new fieldbook with a parent reference.
 * Optionally copies selected anchor nodes (sparse inheritance).
 */

import { NextRequest, NextResponse } from "next/server";
import { forkFieldbook, getFieldbook } from "@/app/lib/phase0/db";
import type { ForkFieldbookRequest, Fieldbook, Node, ApiError, ErrorCodes } from "@/app/lib/phase0/types";

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface ForkResponse {
  fieldbook: Fieldbook;
  anchorNodes: Node[];
}

export async function POST(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<ForkResponse | ApiError>> {
  try {
    const { id: parentId } = await params;
    const body = await request.json() as ForkFieldbookRequest;
    
    // Validate required fields
    if (!body.name || typeof body.name !== "string" || body.name.trim().length === 0) {
      return NextResponse.json(
        { error: "Name is required for forked fieldbook", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }
    
    // Verify parent exists
    const parent = await getFieldbook(parentId);
    if (!parent) {
      return NextResponse.json(
        { error: "Parent fieldbook not found", code: "NOT_FOUND" },
        { status: 404 }
      );
    }
    
    const result = await forkFieldbook(parentId, {
      name: body.name.trim(),
      description: body.description?.trim(),
      forkContext: body.forkContext?.trim(),
      anchorNodeIds: body.anchorNodeIds,
    });
    
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const err = error as { code?: string; message?: string };
    
    if (err.code === "NOT_FOUND") {
      return NextResponse.json(
        { error: err.message || "Not found", code: "NOT_FOUND" },
        { status: 404 }
      );
    }
    
    console.error("[POST /api/v1/fieldbooks/:id/fork] Error:", error);
    return NextResponse.json(
      { error: "Failed to fork fieldbook", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
