/**
 * Captures API
 * GET /api/db/fieldbooks/[id]/captures - List all captures in a fieldbook
 * POST /api/db/fieldbooks/[id]/captures - Create a new capture
 */

import { NextResponse } from "next/server";
import { getCaptures, createCapture } from "../../../../../lib/db";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const captures = await getCaptures(id);
    return NextResponse.json(captures);
  } catch (error) {
    console.error("Failed to get captures:", error);
    return NextResponse.json({ error: "Failed to get captures" }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    // Validate required fields based on type
    if (!body.type) {
      return NextResponse.json({ error: "Type is required" }, { status: 400 });
    }
    
    if (!body.capturedAt) {
      return NextResponse.json({ error: "capturedAt is required" }, { status: 400 });
    }
    
    if (body.type === "external_link") {
      if (!body.url) {
        return NextResponse.json({ error: "URL is required for external_link" }, { status: 400 });
      }
    } else if (body.type === "note") {
      if (!body.text) {
        return NextResponse.json({ error: "Text is required for note" }, { status: 400 });
      }
    } else if (body.type === "file") {
      if (!body.filename || !body.mimeType || !body.storageKey) {
        return NextResponse.json({ error: "filename, mimeType, and storageKey are required for file" }, { status: 400 });
      }
    } else {
      return NextResponse.json({ error: "Invalid capture type" }, { status: 400 });
    }
    
    const capture = await createCapture(id, body);
    
    if (!capture) {
      return NextResponse.json({ error: "Fieldbook not found" }, { status: 404 });
    }
    
    return NextResponse.json(capture, { status: 201 });
  } catch (error) {
    console.error("Failed to create capture:", error);
    return NextResponse.json({ error: "Failed to create capture" }, { status: 500 });
  }
}
