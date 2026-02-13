/**
 * GET /api/v2/fieldbooks/:id/nodes/:nodeId
 *
 * Get a single node with full content.
 */

import { getFieldbook } from "@/app/lib/db";
import { ok, err } from "@/app/lib/api/envelope";

type RouteParams = { params: Promise<{ id: string; nodeId: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { id, nodeId } = await params;
    const fb = await getFieldbook(id);

    if (!fb) {
      return err("NOT_FOUND", `Fieldbook "${id}" not found`, 404);
    }

    // Search across all node types
    const source = fb.sources.find((s) => s.id === nodeId);
    if (source) {
      return ok({ ...source, nodeType: "source" });
    }

    const synthesis = fb.syntheses.find((s) => s.id === nodeId);
    if (synthesis) {
      return ok({ ...synthesis, nodeType: "synthesis" });
    }

    const artifact = fb.artifacts.find((a) => a.id === nodeId);
    if (artifact) {
      return ok({ ...artifact, nodeType: "artifact" });
    }

    return err("NOT_FOUND", `Node "${nodeId}" not found in fieldbook "${id}"`, 404);
  } catch (error) {
    console.error("[v2/nodes/:nodeId] GET error:", error);
    return err("INTERNAL_ERROR", "Failed to load node", 500);
  }
}
