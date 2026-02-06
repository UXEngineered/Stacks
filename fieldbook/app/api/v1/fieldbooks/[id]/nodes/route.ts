/**
 * POST /api/v1/fieldbooks/:id/nodes - Create a node (source, synthesis, or artifact)
 * GET /api/v1/fieldbooks/:id/nodes - List nodes in a fieldbook
 */

import { NextRequest, NextResponse } from "next/server";
import { createNode, getNodesForFieldbook, getFieldbook } from "@/app/lib/phase0/db";
import type { CreateNodeRequest, Node, NodeType, ApiError } from "@/app/lib/phase0/types";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<Node | ApiError>> {
  try {
    const { id: fieldbookId } = await params;
    const body = await request.json() as CreateNodeRequest;
    
    // Validate fieldbook exists
    const fieldbook = await getFieldbook(fieldbookId);
    if (!fieldbook) {
      return NextResponse.json(
        { error: "Fieldbook not found", code: "NOT_FOUND" },
        { status: 404 }
      );
    }
    
    // Validate required fields
    if (!body.nodeType) {
      return NextResponse.json(
        { error: "nodeType is required", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }
    
    const validNodeTypes: NodeType[] = ["source", "synthesis", "artifact"];
    if (!validNodeTypes.includes(body.nodeType)) {
      return NextResponse.json(
        { 
          error: `Invalid nodeType. Must be one of: ${validNodeTypes.join(", ")}`, 
          code: "INVALID_NODE_TYPE" 
        },
        { status: 400 }
      );
    }
    
    if (!body.title || typeof body.title !== "string" || body.title.trim().length === 0) {
      return NextResponse.json(
        { error: "title is required", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }
    
    const node = await createNode(fieldbookId, {
      nodeType: body.nodeType,
      subtype: body.subtype,
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
    
    if (err.code === "INVALID_NODE_TYPE") {
      return NextResponse.json(
        { error: err.message || "Invalid node type", code: "INVALID_NODE_TYPE" },
        { status: 400 }
      );
    }
    
    console.error("[POST /api/v1/fieldbooks/:id/nodes] Error:", error);
    return NextResponse.json(
      { error: "Failed to create node", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<Node[] | ApiError>> {
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
    
    // Optional filter by nodeType
    const { searchParams } = new URL(request.url);
    const nodeTypeParam = searchParams.get("type") as NodeType | null;
    
    const nodes = await getNodesForFieldbook(fieldbookId, nodeTypeParam || undefined);
    
    return NextResponse.json(nodes);
  } catch (error) {
    console.error("[GET /api/v1/fieldbooks/:id/nodes] Error:", error);
    return NextResponse.json(
      { error: "Failed to list nodes", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
