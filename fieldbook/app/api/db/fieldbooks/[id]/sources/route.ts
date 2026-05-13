/**
 * Sources API
 * GET /api/db/fieldbooks/[id]/sources - List all sources
 * POST /api/db/fieldbooks/[id]/sources - Create a new source
 */

import { NextResponse } from "next/server";
import { getSources, createSource } from "../../../../../lib/db";
import type { SourceType, NodeStatus, Visibility } from "../../../../../lib/db/types";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const sources = await getSources(id);
    return NextResponse.json(sources);
  } catch (error) {
    console.error("Failed to get sources:", error);
    return NextResponse.json({ error: "Failed to get sources" }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    if (!body.title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }
    
    // Build source data, including external_link fields if present
    const sourceData: {
      title: string;
      type: SourceType;
      content: string;
      status: NodeStatus;
      visibility: Visibility;
      tags: string[];
      owner?: string;
      url?: string;
      domain?: string;
      note?: string;
      capturedAt?: string;
    } = {
      title: body.title,
      type: (body.type || "note") as SourceType,
      content: body.content || "",
      status: (body.status || "draft") as NodeStatus,
      visibility: (body.visibility || "internal") as Visibility,
      tags: body.tags || [],
      owner: body.owner,
    };
    
    // Add external link fields for external_link type sources
    if (body.type === "external_link") {
      sourceData.url = body.url;
      sourceData.domain = body.domain;
      sourceData.note = body.note;
      sourceData.capturedAt = body.capturedAt;
    }
    
    const source = await createSource(id, sourceData);
    
    if (!source) {
      return NextResponse.json({ error: "Fieldbook not found" }, { status: 404 });
    }
    
    return NextResponse.json(source, { status: 201 });
  } catch (error) {
    console.error("Failed to create source:", error);
    return NextResponse.json({ error: "Failed to create source" }, { status: 500 });
  }
}
