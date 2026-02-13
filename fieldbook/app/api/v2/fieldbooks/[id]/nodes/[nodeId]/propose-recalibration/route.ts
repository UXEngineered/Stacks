/**
 * POST /api/v2/fieldbooks/:id/nodes/:nodeId/propose-recalibration
 *
 * Propose a recalibration for a synthesis or artifact.
 * Creates a proposal with rationale + optional new content.
 * Does NOT auto-apply — a human must review.
 */

import { NextRequest } from "next/server";
import { ok, err, parseActor } from "@/app/lib/api/envelope";
import { proposeRecalibration } from "@/app/lib/governance";

type RouteParams = { params: Promise<{ id: string; nodeId: string }> };

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id, nodeId } = await params;
    const actor = parseActor(request.headers.get("x-actor"));
    const body = await request.json();

    if (!body.rationale) {
      return err("VALIDATION_ERROR", "rationale is required", 400);
    }

    const proposal = await proposeRecalibration(
      id,
      nodeId,
      {
        rationale: body.rationale,
        proposedContent: body.proposedContent,
      },
      actor,
    );

    return ok(
      {
        proposal: {
          nodeId: proposal.nodeId,
          nodeType: proposal.nodeType,
          nodeTitle: proposal.nodeTitle,
          rationale: proposal.rationale,
          hasProposedContent: !!proposal.proposedContent,
        },
        movementEvent: {
          id: proposal.event.id,
          type: proposal.event.type,
          title: proposal.event.title,
        },
      },
      201,
    );
  } catch (error) {
    console.error("[v2/propose-recalibration] POST error:", error);
    const msg = error instanceof Error ? error.message : "Failed to propose recalibration";
    return err("INTERNAL_ERROR", msg, 500);
  }
}
