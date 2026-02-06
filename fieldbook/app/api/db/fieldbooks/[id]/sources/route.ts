/**
 * Sources API
 * GET /api/db/fieldbooks/[id]/sources - List all sources
 * POST /api/db/fieldbooks/[id]/sources - Create a new source
 */

import { NextResponse } from "next/server";
import { getSources, createSource } from "../../../../../lib/db";

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
    
    const source = await createSource(id, {
      title: body.title,
      type: body.type || "note",
      content: body.content || "",
    });
    
    if (!source) {
      return NextResponse.json({ error: "Fieldbook not found" }, { status: 404 });
    }
    
    return NextResponse.json(source, { status: 201 });
  } catch (error) {
    console.error("Failed to create source:", error);
    return NextResponse.json({ error: "Failed to create source" }, { status: 500 });
  }
}
