/**
 * GET /api/v2/fieldbooks/:id/movements?type=<filter>&limit=<n>&since=<ISO>
 *
 * Returns the movement event history for a fieldbook.
 * Movement events track significant shifts — source additions, synthesis
 * recalibrations, artifact updates, and all governed agent actions.
 */

import { type NextRequest } from "next/server";
import { ok, err } from "@/app/lib/api/envelope";
import { getMovementEvents } from "@/app/lib/governance";
import type { MovementFilter, MovementEventType } from "@/app/lib/movement/types";

// Map filter categories to event types
const FILTER_MAP: Record<Exclude<MovementFilter, "all">, MovementEventType[]> = {
  upstream: ["source_added", "source_replaced"],
  synthesis: ["synthesis_recalibrated"],
  artifacts: ["artifact_checkpoint", "artifact_major_update"],
  structural: ["lineage_changed", "node_created", "node_archived"],
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: fieldbookId } = await params;
    const { searchParams } = request.nextUrl;

    // Parse filters
    const filterParam = (searchParams.get("type") ?? "all") as MovementFilter;
    const validFilters: MovementFilter[] = ["all", "upstream", "synthesis", "artifacts", "structural"];
    if (!validFilters.includes(filterParam)) {
      return err("BAD_REQUEST", `Invalid type — must be one of: ${validFilters.join(", ")}`, 400);
    }

    const limitParam = searchParams.get("limit");
    const limit = limitParam ? parseInt(limitParam, 10) : 50;
    if (isNaN(limit) || limit < 1 || limit > 500) {
      return err("BAD_REQUEST", "Limit must be a number between 1 and 500", 400);
    }

    const sinceParam = searchParams.get("since");
    const sinceDate = sinceParam ? new Date(sinceParam) : null;
    if (sinceParam && isNaN(sinceDate!.getTime())) {
      return err("BAD_REQUEST", "Invalid 'since' parameter — must be an ISO date string", 400);
    }

    // Fetch and filter
    let events = await getMovementEvents(fieldbookId);

    if (!events.length) {
      return ok({
        fieldbookId,
        filter: filterParam,
        totalEvents: 0,
        events: [],
      });
    }

    // Filter by type category
    if (filterParam !== "all") {
      const allowedTypes = FILTER_MAP[filterParam];
      events = events.filter((e) => allowedTypes.includes(e.type));
    }

    // Filter by since date
    if (sinceDate) {
      events = events.filter((e) => new Date(e.createdAt) >= sinceDate);
    }

    // Sort newest first
    events.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Apply limit
    const total = events.length;
    events = events.slice(0, limit);

    return ok({
      fieldbookId,
      filter: filterParam,
      totalEvents: total,
      returnedEvents: events.length,
      events,
    });
  } catch (error) {
    console.error("[v2/movements] GET error:", error);
    return err("INTERNAL_ERROR", "Failed to load movement events", 500);
  }
}
