/**
 * POST /api/v2/fieldbooks/:id/nodes/:nodeId/versions
 *
 * Create a new version of a node (governed).
 * For agent actors: creates a new item, never overwrites canonical.
 * For user actors: edits in place (but still records movement).
 */

import { NextRequest } from "next/server";
import { getFieldbook } from "@/app/lib/db";
import { ok, err, parseActor } from "@/app/lib/api/envelope";
import {
  guardedUpdateSource,
  guardedUpdateSynthesis,
  guardedUpdateArtifact,
} from "@/app/lib/governance";

type RouteParams = { params: Promise<{ id: string; nodeId: string }> };

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id, nodeId } = await params;
    const actor = parseActor(request.headers.get("x-actor"));
    const body = await request.json();

    // Find the node to determine its type
    const fb = await getFieldbook(id);
    if (!fb) {
      return err("NOT_FOUND", `Fieldbook "${id}" not found`, 404);
    }

    const isSource = fb.sources.some((s) => s.id === nodeId);
    const isSynthesis = fb.syntheses.some((s) => s.id === nodeId);
    const isArtifact = fb.artifacts.some((a) => a.id === nodeId);

    if (!isSource && !isSynthesis && !isArtifact) {
      return err("NOT_FOUND", `Node "${nodeId}" not found in fieldbook "${id}"`, 404);
    }

    const updates: Record<string, string> = {};
    if (body.title) updates.title = body.title;
    if (body.content) updates.content = body.content;

    if (Object.keys(updates).length === 0) {
      return err("VALIDATION_ERROR", "At least one of title or content is required", 400);
    }

    let result;

    if (isSource) {
      result = await guardedUpdateSource(id, nodeId, updates, actor);
    } else if (isSynthesis) {
      result = await guardedUpdateSynthesis(id, nodeId, updates, actor);
    } else {
      result = await guardedUpdateArtifact(id, nodeId, updates, actor);
    }

    return ok(
      {
        isNewVersion: result.isNewVersion,
        node: {
          id: result.item.id,
          title: result.item.title,
        },
        originalNodeId: nodeId,
        movementEvent: {
          id: result.event.id,
          type: result.event.type,
          title: result.event.title,
        },
      },
      result.isNewVersion ? 201 : 200,
    );
  } catch (error) {
    console.error("[v2/versions] POST error:", error);
    const msg = error instanceof Error ? error.message : "Failed to create version";
    return err("INTERNAL_ERROR", msg, 500);
  }
}
