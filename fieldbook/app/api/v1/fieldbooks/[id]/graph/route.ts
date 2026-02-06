/**
 * GET /api/v1/fieldbooks/:id/graph - Get full node/edge graph for visualization
 * 
 * Returns all nodes and edges in a fieldbook for graph rendering.
 * Suitable for visualization libraries like D3, Cytoscape, or React Flow.
 */

import { NextRequest, NextResponse } from "next/server";
import { getGraph, getFieldbook } from "@/app/lib/phase0/db";
import type { GraphResponse, ApiError } from "@/app/lib/phase0/types";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(
  _request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<GraphResponse | ApiError>> {
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
    
    const graph = await getGraph(fieldbookId);
    
    return NextResponse.json(graph);
  } catch (error) {
    console.error("[GET /api/v1/fieldbooks/:id/graph] Error:", error);
    return NextResponse.json(
      { error: "Failed to get graph", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
