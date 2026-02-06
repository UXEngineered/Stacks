/**
 * GET /api/v1/fieldbooks/:id/timeline - Get ordered stream of nodes with their relationships
 * 
 * Returns nodes in reverse chronological order (newest first),
 * each enriched with their incoming and outgoing edges.
 */

import { NextRequest, NextResponse } from "next/server";
import { getTimeline, getFieldbook } from "@/app/lib/phase0/db";
import type { TimelineResponse, ApiError } from "@/app/lib/phase0/types";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(
  _request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<TimelineResponse | ApiError>> {
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
    
    const timeline = await getTimeline(fieldbookId);
    
    return NextResponse.json(timeline);
  } catch (error) {
    console.error("[GET /api/v1/fieldbooks/:id/timeline] Error:", error);
    return NextResponse.json(
      { error: "Failed to get timeline", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
