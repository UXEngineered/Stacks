/**
 * GET /api/v1/fieldbooks/:id - Get fieldbook details
 */

import { NextRequest, NextResponse } from "next/server";
import { getFieldbook, getFieldbookStats } from "@/app/lib/phase0/db";
import type { FieldbookDetailResponse, ApiError } from "@/app/lib/phase0/types";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(
  _request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<FieldbookDetailResponse | ApiError>> {
  try {
    const { id } = await params;
    
    const fieldbook = await getFieldbook(id);
    
    if (!fieldbook) {
      return NextResponse.json(
        { error: "Fieldbook not found", code: "NOT_FOUND" },
        { status: 404 }
      );
    }
    
    const stats = await getFieldbookStats(id);
    
    // Get parent if this is a fork
    let parent;
    if (fieldbook.parentId) {
      parent = await getFieldbook(fieldbook.parentId) ?? undefined;
    }
    
    const response: FieldbookDetailResponse = {
      fieldbook,
      nodeCount: stats.nodeCount,
      edgeCount: stats.edgeCount,
      parent,
    };
    
    return NextResponse.json(response);
  } catch (error) {
    console.error("[GET /api/v1/fieldbooks/:id] Error:", error);
    return NextResponse.json(
      { error: "Failed to get fieldbook", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
