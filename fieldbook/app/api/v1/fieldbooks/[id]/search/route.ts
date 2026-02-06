/**
 * GET /api/v1/fieldbooks/:id/search?q=<query> - Search nodes within a fieldbook
 * 
 * Searches node titles and content for matching text.
 * Optional filters: type (nodeType), limit
 */

import { NextRequest, NextResponse } from "next/server";
import { search, getFieldbook } from "@/app/lib/phase0/db";
import type { SearchResponse, NodeType, ApiError } from "@/app/lib/phase0/types";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<SearchResponse | ApiError>> {
  try {
    const { id: fieldbookId } = await params;
    const { searchParams } = new URL(request.url);
    
    // Validate fieldbook exists
    const fieldbook = await getFieldbook(fieldbookId);
    if (!fieldbook) {
      return NextResponse.json(
        { error: "Fieldbook not found", code: "NOT_FOUND" },
        { status: 404 }
      );
    }
    
    // Get query parameter
    const query = searchParams.get("q");
    if (!query || query.trim().length === 0) {
      return NextResponse.json(
        { error: "Query parameter 'q' is required", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }
    
    // Optional filters
    const nodeType = searchParams.get("type") as NodeType | null;
    const limitParam = searchParams.get("limit");
    const limit = limitParam ? Math.min(parseInt(limitParam, 10), 100) : 20;
    
    // Validate nodeType if provided
    const validNodeTypes: NodeType[] = ["source", "synthesis", "artifact"];
    if (nodeType && !validNodeTypes.includes(nodeType)) {
      return NextResponse.json(
        { 
          error: `Invalid type. Must be one of: ${validNodeTypes.join(", ")}`, 
          code: "INVALID_NODE_TYPE" 
        },
        { status: 400 }
      );
    }
    
    const results = await search(fieldbookId, query.trim(), nodeType || undefined, limit);
    
    return NextResponse.json(results);
  } catch (error) {
    console.error("[GET /api/v1/fieldbooks/:id/search] Error:", error);
    return NextResponse.json(
      { error: "Failed to search", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
