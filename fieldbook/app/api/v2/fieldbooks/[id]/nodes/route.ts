/**
 * GET  /api/v2/fieldbooks/:id/nodes — list all nodes
 * POST /api/v2/fieldbooks/:id/sources — create a source (governed)
 */

import { NextRequest } from "next/server";
import { getFieldbook } from "@/app/lib/db";
import { ok, err, parseActor } from "@/app/lib/api/envelope";
import { guardedCreateSource } from "@/app/lib/governance";

type RouteParams = { params: Promise<{ id: string }> };

// ── GET: list all nodes ──────────────────────────────────────────────
export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const fb = await getFieldbook(id);

    if (!fb) {
      return err("NOT_FOUND", `Fieldbook "${id}" not found`, 404);
    }

    // Flat list of all nodes with type discriminator
    const nodes = [
      ...fb.sources.map((s) => ({
        id: s.id,
        type: "source" as const,
        title: s.title,
        sourceType: s.type,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
      })),
      ...fb.syntheses.map((s) => ({
        id: s.id,
        type: "synthesis" as const,
        title: s.title,
        status: s.status,
        derivedFrom: s.derivedFrom,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
      })),
      ...fb.artifacts.map((a) => ({
        id: a.id,
        type: "artifact" as const,
        title: a.title,
        artifactType: a.type,
        status: a.status,
        informedBy: a.informedBy,
        createdAt: a.createdAt,
        updatedAt: a.updatedAt,
      })),
    ];

    return ok(nodes);
  } catch (error) {
    console.error("[v2/nodes] GET error:", error);
    return err("INTERNAL_ERROR", "Failed to load nodes", 500);
  }
}

// ── POST: create a source (governed) ─────────────────────────────────
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const actor = parseActor(request.headers.get("x-actor"));
    const body = await request.json();

    if (!body.title || !body.content) {
      return err("VALIDATION_ERROR", "title and content are required", 400);
    }

    const result = await guardedCreateSource(
      id,
      {
        title: body.title,
        content: body.content,
        type: body.type || "doc",
        url: body.url,
        note: body.note,
      },
      actor,
    );

    return ok(
      {
        source: {
          id: result.item.id,
          title: result.item.title,
          type: result.item.type,
          createdAt: result.item.createdAt,
        },
        movementEvent: {
          id: result.event.id,
          type: result.event.type,
          title: result.event.title,
        },
      },
      201,
    );
  } catch (error) {
    console.error("[v2/nodes] POST error:", error);
    const msg = error instanceof Error ? error.message : "Failed to create source";
    return err("INTERNAL_ERROR", msg, 500);
  }
}
