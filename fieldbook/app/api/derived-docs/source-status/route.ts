/**
 * API Route: Derived Document Source Status
 *
 * POST /api/derived-docs/source-status
 *
 * Computes the sync status for a derived artifact based on its source set.
 * Returns information about which sources have changed since derivation.
 *
 * Request body:
 * - sourceSet: SourceSet - The source set captured when the artifact was derived
 *
 * Response:
 * - status: "in_sync" | "out_of_sync"
 * - changedSources: Array of changed source details
 * - missingSources: Array of document IDs that no longer exist
 * - totalSources: Total number of sources
 * - computedAt: ISO timestamp
 */

import { NextResponse } from "next/server";
import type { SourceSet, SourceStatus } from "@/app/lib/document/version";
import { computeSourceStatus } from "@/app/lib/document/source-sync";

interface SourceStatusRequest {
  sourceSet: SourceSet;
}

export async function POST(request: Request) {
  try {
    const body: SourceStatusRequest = await request.json();

    if (!body.sourceSet) {
      return NextResponse.json(
        { error: "Missing sourceSet in request body" },
        { status: 400 }
      );
    }

    if (!body.sourceSet.sources || !Array.isArray(body.sourceSet.sources)) {
      return NextResponse.json(
        { error: "Invalid sourceSet: missing or invalid sources array" },
        { status: 400 }
      );
    }

    const status: SourceStatus = computeSourceStatus(body.sourceSet);

    return NextResponse.json(status);
  } catch (error) {
    console.error("Error computing source status:", error);
    return NextResponse.json(
      { error: "Failed to compute source status" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/derived-docs/source-status
 *
 * Returns schema information for the source status endpoint.
 */
export async function GET() {
  return NextResponse.json({
    description: "Compute sync status for a derived artifact's source set",
    method: "POST",
    requestBody: {
      sourceSet: {
        sources: [
          {
            documentId: "string - The source document ID",
            versionId: "string - The version ID used when deriving",
            versionNumber: "number - The version number for display",
            title: "string - Title of the source at derivation time",
            capturedAt: "string - ISO timestamp when snapshot was captured",
          },
        ],
        derivedAt: "string - ISO timestamp when artifact was derived",
      },
    },
    response: {
      status: '"in_sync" | "out_of_sync"',
      changedSources: [
        {
          documentId: "string",
          title: "string",
          derivedVersionId: "string",
          derivedVersionNumber: "number",
          currentVersionId: "string",
          currentVersionNumber: "number",
          versionsBehind: "number",
        },
      ],
      missingSources: ["string - document IDs that no longer exist"],
      totalSources: "number",
      computedAt: "string - ISO timestamp",
    },
  });
}
