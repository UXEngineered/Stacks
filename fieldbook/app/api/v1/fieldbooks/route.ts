/**
 * POST /api/v1/fieldbooks - Create a new fieldbook
 * GET /api/v1/fieldbooks - List all fieldbooks
 */

import { NextRequest, NextResponse } from "next/server";
import { createFieldbook, listFieldbooks } from "@/app/lib/phase0/db";
import type { CreateFieldbookRequest, Fieldbook, ApiError } from "@/app/lib/phase0/types";

export async function POST(request: NextRequest): Promise<NextResponse<Fieldbook | ApiError>> {
  try {
    const body = await request.json() as CreateFieldbookRequest;
    
    // Validate required fields
    if (!body.name || typeof body.name !== "string" || body.name.trim().length === 0) {
      return NextResponse.json(
        { error: "Name is required", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }
    
    const fieldbook = await createFieldbook({
      name: body.name.trim(),
      description: body.description?.trim(),
    });
    
    return NextResponse.json(fieldbook, { status: 201 });
  } catch (error) {
    console.error("[POST /api/v1/fieldbooks] Error:", error);
    return NextResponse.json(
      { error: "Failed to create fieldbook", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

export async function GET(): Promise<NextResponse<Fieldbook[] | ApiError>> {
  try {
    const fieldbooks = await listFieldbooks();
    return NextResponse.json(fieldbooks);
  } catch (error) {
    console.error("[GET /api/v1/fieldbooks] Error:", error);
    return NextResponse.json(
      { error: "Failed to list fieldbooks", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
