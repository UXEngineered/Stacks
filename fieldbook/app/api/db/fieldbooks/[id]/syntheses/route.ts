/**
 * Syntheses API
 * GET /api/db/fieldbooks/[id]/syntheses - List all syntheses
 * POST /api/db/fieldbooks/[id]/syntheses - Create a new synthesis
 */

import { NextResponse } from "next/server";
import { getSyntheses, createSynthesis } from "../../../../../lib/db";
import type { SynthesisType, NodeStatus, Visibility } from "../../../../../lib/db/types";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const syntheses = await getSyntheses(id);
    return NextResponse.json(syntheses);
  } catch (error) {
    console.error("Failed to get syntheses:", error);
    return NextResponse.json({ error: "Failed to get syntheses" }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    if (!body.title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }
    
    const synthesis = await createSynthesis(id, {
      title: body.title,
      type: (body.type || "pattern") as SynthesisType,
      content: body.content || "",
      derivedFrom: body.derivedFrom || [],
      status: (body.status || "draft") as NodeStatus,
      visibility: (body.visibility || "internal") as Visibility,
      tags: body.tags || [],
      owner: body.owner,
      needsReview: body.needsReview,
    });
    
    if (!synthesis) {
      return NextResponse.json({ error: "Fieldbook not found" }, { status: 404 });
    }
    
    return NextResponse.json(synthesis, { status: 201 });
  } catch (error) {
    console.error("Failed to create synthesis:", error);
    return NextResponse.json({ error: "Failed to create synthesis" }, { status: 500 });
  }
}
