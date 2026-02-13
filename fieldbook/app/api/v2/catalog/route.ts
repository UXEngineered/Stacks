/**
 * GET /api/v2/catalog
 *
 * Returns the full Stacks catalog — all allowed enum values for
 * types, statuses, and visibilities.
 *
 * Useful for agents and clients to know the valid vocabulary.
 */

import { ok } from "@/app/lib/api/envelope";
import { catalog } from "@/app/lib/catalog";

export async function GET() {
  return ok(catalog);
}
