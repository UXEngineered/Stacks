/**
 * POST /api/v2/fieldbooks/:id/artifacts — create an artifact (governed)
 */

import { NextRequest } from "next/server";
import { ok, err, parseActor } from "@/app/lib/api/envelope";
import { guardedCreateArtifact } from "@/app/lib/governance";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const actor = parseActor(request.headers.get("x-actor"));
    const body = await request.json();

    if (!body.title || !body.content) {
      return err("VALIDATION_ERROR", "title and content are required", 400);
    }

    const result = await guardedCreateArtifact(
      id,
      {
        title: body.title,
        content: body.content,
        type: body.type || "plan",
        informedBy: body.informedBy || [],
        status: body.status || "draft",
        visibility: body.visibility || "internal",
        tags: body.tags || [],
        owner: body.owner,
      },
      actor,
    );

    return ok(
      {
        artifact: {
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
    console.error("[v2/artifacts] POST error:", error);
    const msg = error instanceof Error ? error.message : "Failed to create artifact";
    return err("INTERNAL_ERROR", msg, 500);
  }
}
