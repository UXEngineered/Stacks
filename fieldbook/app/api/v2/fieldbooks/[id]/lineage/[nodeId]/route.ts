/**
 * GET /api/v2/fieldbooks/:id/lineage/:nodeId?depth=1|full
 *
 * Lineage subgraph for a specific node.
 */

import { NextRequest } from "next/server";
import { getFieldbook } from "@/app/lib/db";
import { ok, err } from "@/app/lib/api/envelope";
import { walkLineage } from "@/app/lib/lineage/walker";
import type { LineageNode } from "@/app/lib/lineage/walker";

type RouteParams = { params: Promise<{ id: string; nodeId: string }> };

function fieldbookToNodes(fb: NonNullable<Awaited<ReturnType<typeof getFieldbook>>>): LineageNode[] {
  return [
    ...fb.sources.map((s) => ({
      id: s.id,
      type: "source" as const,
      title: s.title,
      content: s.content,
      createdAt: s.createdAt,
    })),
    ...fb.syntheses.map((s) => ({
      id: s.id,
      type: "synthesis" as const,
      title: s.title,
      content: s.content,
      derivedFrom: s.derivedFrom,
      status: s.status,
      createdAt: s.createdAt,
    })),
    ...fb.artifacts.map((a) => ({
      id: a.id,
      type: "artifact" as const,
      title: a.title,
      content: a.content,
      derivedFrom: a.informedBy,
      status: a.status,
      createdAt: a.createdAt,
    })),
  ];
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id, nodeId } = await params;
    const fb = await getFieldbook(id);

    if (!fb) {
      return err("NOT_FOUND", `Fieldbook "${id}" not found`, 404);
    }

    // Parse depth query param
    const depthParam = request.nextUrl.searchParams.get("depth") || "full";
    const depth: number | "full" = depthParam === "full" ? "full" : parseInt(depthParam, 10);

    if (typeof depth === "number" && (isNaN(depth) || depth < 1)) {
      return err("VALIDATION_ERROR", "depth must be a positive integer or 'full'", 400);
    }

    const items = fieldbookToNodes(fb);

    // Check node exists
    if (!items.find((i) => i.id === nodeId)) {
      return err("NOT_FOUND", `Node "${nodeId}" not found in fieldbook "${id}"`, 404);
    }

    const graph = walkLineage(nodeId, items, { direction: "both", depth });

    return ok({
      rootId: graph.rootId,
      depth: depthParam,
      nodes: graph.nodes.map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
      })),
      edges: graph.edges,
      summary: {
        totalNodes: graph.nodes.length,
        totalEdges: graph.edges.length,
      },
    });
  } catch (error) {
    console.error("[v2/lineage/:nodeId] GET error:", error);
    return err("INTERNAL_ERROR", "Failed to load node lineage", 500);
  }
}
