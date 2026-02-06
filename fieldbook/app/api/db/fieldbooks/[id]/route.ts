/**
 * Single Fieldbook API
 * GET /api/db/fieldbooks/[id] - Get a fieldbook
 * PATCH /api/db/fieldbooks/[id] - Update a fieldbook
 * DELETE /api/db/fieldbooks/[id] - Delete a fieldbook
 */

import { NextResponse } from "next/server";
import { getFieldbook, updateFieldbook, deleteFieldbook } from "../../../../lib/db";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const fieldbook = await getFieldbook(id);
    
    if (!fieldbook) {
      return NextResponse.json({ error: "Fieldbook not found" }, { status: 404 });
    }
    
    return NextResponse.json(fieldbook);
  } catch (error) {
    console.error("Failed to get fieldbook:", error);
    return NextResponse.json({ error: "Failed to get fieldbook" }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    const fieldbook = await updateFieldbook({
      id,
      name: body.name,
      description: body.description,
    });
    
    if (!fieldbook) {
      return NextResponse.json({ error: "Fieldbook not found" }, { status: 404 });
    }
    
    return NextResponse.json(fieldbook);
  } catch (error) {
    console.error("Failed to update fieldbook:", error);
    return NextResponse.json({ error: "Failed to update fieldbook" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const deleted = await deleteFieldbook(id);
    
    if (!deleted) {
      return NextResponse.json({ error: "Fieldbook not found" }, { status: 404 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete fieldbook:", error);
    return NextResponse.json({ error: "Failed to delete fieldbook" }, { status: 500 });
  }
}
