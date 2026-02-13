/**
 * GET /api/v2/fieldbooks/:id
 *
 * Get a single fieldbook with full metadata and node summaries.
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

    return ok({
      id: fb.id,
      name: fb.name,
      description: fb.description,
      createdAt: fb.createdAt,
      updatedAt: fb.updatedAt,
      sources: fb.sources.map((s) => ({
        id: s.id,
        title: s.title,
        type: s.type,
        createdAt: s.createdAt,
      })),
      syntheses: fb.syntheses.map((s) => ({
        id: s.id,
        title: s.title,
        status: s.status,
        derivedFrom: s.derivedFrom,
        createdAt: s.createdAt,
      })),
      artifacts: fb.artifacts.map((a) => ({
        id: a.id,
        title: a.title,
        type: a.type,
        status: a.status,
        informedBy: a.informedBy,
        createdAt: a.createdAt,
      })),
    });
  } catch (error) {
    console.error("[v2/fieldbooks/:id] GET error:", error);
    return err("INTERNAL_ERROR", "Failed to load fieldbook", 500);
  }
}
