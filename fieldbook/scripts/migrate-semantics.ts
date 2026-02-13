#!/usr/bin/env bun
/**
 * One-time migration: add semantic fields to all existing nodes.
 *
 * Run from the fieldbook/ directory:
 *   bun run scripts/migrate-semantics.ts
 *
 * What it does:
 *   - Sources: set status="canonical", visibility="internal", tags=[]
 *   - Syntheses: map committed→canonical, draft→draft; set visibility="internal",
 *     tags=[], type="insight" (default)
 *   - Artifacts: map final→canonical, review→proposed, draft→draft;
 *     set visibility="internal", tags=[]
 */

import { promises as fs } from "fs";
import path from "path";

const DB_PATH = path.join(process.cwd(), "data", "data.json");

interface AnyNode {
  id: string;
  status?: string;
  visibility?: string;
  tags?: string[];
  owner?: string;
  type?: string;
  [key: string]: unknown;
}

interface AnyFieldbook {
  id: string;
  name: string;
  sources: AnyNode[];
  syntheses: AnyNode[];
  artifacts: AnyNode[];
  [key: string]: unknown;
}

async function migrate() {
  console.log("Reading", DB_PATH);
  const raw = await fs.readFile(DB_PATH, "utf-8");
  const db = JSON.parse(raw) as { fieldbooks: AnyFieldbook[] };

  let sourcesUpdated = 0;
  let synthesesUpdated = 0;
  let artifactsUpdated = 0;

  for (const fb of db.fieldbooks) {
    // ── Sources ─────────────────────────────────────────────────────
    for (const src of fb.sources) {
      if (!src.status) src.status = "canonical";
      if (!src.visibility) src.visibility = "internal";
      if (!src.tags) src.tags = [];
      sourcesUpdated++;
    }

    // ── Syntheses ───────────────────────────────────────────────────
    for (const syn of fb.syntheses) {
      // Map old status to new
      const oldStatus = syn.status;
      if (oldStatus === "committed") {
        syn.status = "canonical";
      } else if (oldStatus === "draft" || !oldStatus) {
        syn.status = "draft";
      }

      // Add type if missing
      if (!syn.type) syn.type = "insight";

      if (!syn.visibility) syn.visibility = "internal";
      if (!syn.tags) syn.tags = [];
      synthesesUpdated++;
    }

    // ── Artifacts ───────────────────────────────────────────────────
    for (const art of fb.artifacts) {
      const oldStatus = art.status;
      if (oldStatus === "final") {
        art.status = "canonical";
      } else if (oldStatus === "review") {
        art.status = "proposed";
      } else if (oldStatus === "draft" || !oldStatus) {
        art.status = "draft";
      }

      if (!art.visibility) art.visibility = "internal";
      if (!art.tags) art.tags = [];
      artifactsUpdated++;
    }
  }

  // Write back
  await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2), "utf-8");

  console.log("Migration complete:");
  console.log(`  Sources:    ${sourcesUpdated} updated`);
  console.log(`  Syntheses:  ${synthesesUpdated} updated`);
  console.log(`  Artifacts:  ${artifactsUpdated} updated`);
  console.log("Wrote", DB_PATH);
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
