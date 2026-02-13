/**
 * POST /api/v2/fieldbooks/:id/compile
 *
 * The core "prepare for agent" endpoint.
 * Compiles context, markdown, lineage, or a bundle zip for a given node.
 */

import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getFieldbook } from "@/app/lib/db";
import { ok, err } from "@/app/lib/api/envelope";
import { compileContext } from "@/app/lib/compile/context";
import type { CompileTarget, CompileScope } from "@/app/lib/compile/context";
import { compileMarkdown } from "@/app/lib/compile/markdown";
import { compileLineage } from "@/app/lib/compile/lineage";
import { compileBundle } from "@/app/lib/compile/bundle";
import type { LineageNode } from "@/app/lib/lineage/walker";

type RouteParams = { params: Promise<{ id: string }> };

function fieldbookToNodes(fb: NonNullable<Awaited<ReturnType<typeof getFieldbook>>>): LineageNode[] {
  return [
    ...fb.sources.map((s) => ({
      id: s.id,
      type: "source" as const,
      title: s.title,
      content: s.content,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    })),
    ...fb.syntheses.map((s) => ({
      id: s.id,
      type: "synthesis" as const,
      title: s.title,
      content: s.content,
      derivedFrom: s.derivedFrom,
      status: s.status,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    })),
    ...fb.artifacts.map((a) => ({
      id: a.id,
      type: "artifact" as const,
      title: a.title,
      content: a.content,
      derivedFrom: a.informedBy,
      status: a.status,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
    })),
  ];
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Validate required fields
    if (!body.nodeId) {
      return err("VALIDATION_ERROR", "nodeId is required", 400);
    }

    const target: CompileTarget = body.target || "agent";
    const scope: CompileScope = body.scope || "lineage-1";
    const format: string = body.format || "json";

    if (!["human", "agent", "both"].includes(target)) {
      return err("VALIDATION_ERROR", "target must be 'human', 'agent', or 'both'", 400);
    }
    if (!["artifact", "lineage-1", "lineage-full"].includes(scope)) {
      return err("VALIDATION_ERROR", "scope must be 'artifact', 'lineage-1', or 'lineage-full'", 400);
    }
    if (!["json", "markdown", "lineage", "bundle"].includes(format)) {
      return err("VALIDATION_ERROR", "format must be 'json', 'markdown', 'lineage', or 'bundle'", 400);
    }

    const fb = await getFieldbook(id);
    if (!fb) {
      return err("NOT_FOUND", `Fieldbook "${id}" not found`, 404);
    }

    const items = fieldbookToNodes(fb);
    if (!items.find((i) => i.id === body.nodeId)) {
      return err("NOT_FOUND", `Node "${body.nodeId}" not found in fieldbook "${id}"`, 404);
    }

    switch (format) {
      case "json": {
        const ctx = compileContext(items, { nodeId: body.nodeId, target, scope });
        return ok(ctx);
      }

      case "markdown": {
        const ctx = compileContext(items, { nodeId: body.nodeId, target, scope });
        const md = compileMarkdown(ctx);
        return new NextResponse(md, {
          status: 200,
          headers: {
            "Content-Type": "text/markdown; charset=utf-8",
            "Content-Disposition": `attachment; filename="${ctx.root.title.replace(/[^a-z0-9\s-]/gi, "").replace(/\s+/g, "-").toLowerCase()}.md"`,
          },
        });
      }

      case "lineage": {
        const lin = compileLineage(body.nodeId, items, scope);
        return ok(lin);
      }

      case "bundle": {
        const result = await compileBundle(items, {
          nodeId: body.nodeId,
          target,
          scope,
        });
        return new NextResponse(Buffer.from(result.zip), {
          status: 200,
          headers: {
            "Content-Type": "application/zip",
            "Content-Disposition": `attachment; filename="${result.context.root.title.replace(/[^a-z0-9\s-]/gi, "").replace(/\s+/g, "-").toLowerCase()}-bundle.zip"`,
          },
        });
      }

      default:
        return err("VALIDATION_ERROR", `Unknown format: ${format}`, 400);
    }
  } catch (error) {
    console.error("[v2/compile] POST error:", error);
    const msg = error instanceof Error ? error.message : "Failed to compile";
    return err("INTERNAL_ERROR", msg, 500);
  }
}
