/**
 * GET /api/v2/search?q=<query>&type=<source|synthesis|artifact|all>&limit=<n>
 *
 * Full-text search across all fieldbooks.
 * Returns matching nodes with snippets and fieldbook context.
 */

import { type NextRequest } from "next/server";
import { ok, err } from "@/app/lib/api/envelope";
import { searchStacks } from "@/app/lib/search";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;

    const query = searchParams.get("q");
    if (!query || query.trim().length === 0) {
      return err("BAD_REQUEST", "Query parameter 'q' is required", 400);
    }

    const type = (searchParams.get("type") ?? "all") as
      | "source"
      | "synthesis"
      | "artifact"
      | "all";
    if (!["source", "synthesis", "artifact", "all"].includes(type)) {
      return err("BAD_REQUEST", "Invalid type — must be source, synthesis, artifact, or all", 400);
    }

    const limitParam = searchParams.get("limit");
    const limit = limitParam ? parseInt(limitParam, 10) : 20;
    if (isNaN(limit) || limit < 1 || limit > 100) {
      return err("BAD_REQUEST", "Limit must be a number between 1 and 100", 400);
    }

    const results = await searchStacks({ query: query.trim(), type, limit });

    return ok({
      query: query.trim(),
      type,
      resultCount: results.length,
      results,
    });
  } catch (error) {
    console.error("[v2/search] GET error:", error);
    return err("INTERNAL_ERROR", "Search failed", 500);
  }
}
