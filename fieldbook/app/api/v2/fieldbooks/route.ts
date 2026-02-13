/**
 * GET /api/v2/fieldbooks
 *
 * List all fieldbooks with summary metadata.
 */

import { getAllFieldbooks } from "@/app/lib/db";
import { ok, err } from "@/app/lib/api/envelope";

export async function GET() {
  try {
    const fieldbooks = await getAllFieldbooks();

    const summary = fieldbooks.map((fb) => ({
      id: fb.id,
      name: fb.name,
      description: fb.description,
      createdAt: fb.createdAt,
      updatedAt: fb.updatedAt,
      counts: {
        sources: fb.sources.length,
        syntheses: fb.syntheses.length,
        artifacts: fb.artifacts.length,
      },
    }));

    return ok(summary);
  } catch (error) {
    console.error("[v2/fieldbooks] GET error:", error);
    return err("INTERNAL_ERROR", "Failed to load fieldbooks", 500);
  }
}
