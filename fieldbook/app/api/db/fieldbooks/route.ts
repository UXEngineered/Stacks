/**
 * Fieldbooks API
 * GET /api/db/fieldbooks - List all fieldbooks
 * POST /api/db/fieldbooks - Create a new fieldbook
 */

import { NextResponse } from "next/server";
import { getAllFieldbooks, createFieldbook } from "../../../lib/db";

export async function GET() {
  try {
    const fieldbooks = await getAllFieldbooks();
    return NextResponse.json(fieldbooks);
  } catch (error) {
    console.error("Failed to get fieldbooks:", error);
    return NextResponse.json({ error: "Failed to get fieldbooks" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    if (!body.name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    
    const fieldbook = await createFieldbook({
      name: body.name,
      description: body.description,
    });
    
    return NextResponse.json(fieldbook, { status: 201 });
  } catch (error) {
    console.error("Failed to create fieldbook:", error);
    return NextResponse.json({ error: "Failed to create fieldbook" }, { status: 500 });
  }
}
