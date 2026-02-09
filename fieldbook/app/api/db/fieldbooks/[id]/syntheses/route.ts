/**
 * Syntheses API
 * GET /api/db/fieldbooks/[id]/syntheses - List all syntheses
 * POST /api/db/fieldbooks/[id]/syntheses - Create a new synthesis
 */

import { NextResponse } from "next/server";
import { getSyntheses, createSynthesis } from "../../../../../lib/db";

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
      content: body.content || "",
      derivedFrom: body.derivedFrom || [],
      status: body.status,
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
