/**
 * GET /api/v2/fieldbooks/:id/lineage
 *
 * Full lineage graph for the entire fieldbook.
 */

import { getFieldbook } from "@/app/lib/db";
import { ok, err } from "@/app/lib/api/envelope";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const fb = await getFieldbook(id);

    if (!fb) {
      return err("NOT_FOUND", `Fieldbook "${id}" not found`, 404);
    }

    // Build nodes list
    const nodes = [
      ...fb.sources.map((s) => ({ id: s.id, type: "source" as const, title: s.title })),
      ...fb.syntheses.map((s) => ({ id: s.id, type: "synthesis" as const, title: s.title, derivedFrom: s.derivedFrom })),
      ...fb.artifacts.map((a) => ({ id: a.id, type: "artifact" as const, title: a.title, informedBy: a.informedBy })),
    ];

    // Build edges from derivedFrom / informedBy relationships
    const edges: Array<{ from: string; to: string; rel: string }> = [];

    for (const syn of fb.syntheses) {
      for (const srcId of syn.derivedFrom) {
        edges.push({ from: syn.id, to: srcId, rel: "derived_from" });
      }
    }

    for (const art of fb.artifacts) {
      for (const refId of art.informedBy) {
        edges.push({ from: art.id, to: refId, rel: "informed_by" });
      }
    }

    return ok({
      fieldbookId: fb.id,
      fieldbookName: fb.name,
      nodes,
      edges,
      summary: {
        totalNodes: nodes.length,
        totalEdges: edges.length,
        sources: fb.sources.length,
        syntheses: fb.syntheses.length,
        artifacts: fb.artifacts.length,
      },
    });
  } catch (error) {
    console.error("[v2/lineage] GET error:", error);
    return err("INTERNAL_ERROR", "Failed to load lineage", 500);
  }
}
