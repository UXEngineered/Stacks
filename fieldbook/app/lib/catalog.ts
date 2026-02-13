/**
 * Catalog — the single vocabulary of allowed enum values for Stacks.
 *
 * Reads from config/catalog.json so enums can be extended without
 * code changes. Exposed to UI (dropdown options), governance (validation),
 * and compile output (agents see what values are valid).
 */

import catalogData from "@/config/catalog.json";
import type {
  SourceType,
  SynthesisType,
  ArtifactType,
  NodeStatus,
  Visibility,
} from "@/app/lib/db/types";

// ---------------------------------------------------------------------------
// Raw catalog data
// ---------------------------------------------------------------------------

export interface Catalog {
  sourceTypes: string[];
  synthesisTypes: string[];
  artifactTypes: string[];
  statuses: string[];
  visibilities: string[];
}

export const catalog: Catalog = catalogData;

// ---------------------------------------------------------------------------
// Typed accessors
// ---------------------------------------------------------------------------

export const sourceTypes = catalog.sourceTypes as SourceType[];
export const synthesisTypes = catalog.synthesisTypes as SynthesisType[];
export const artifactTypes = catalog.artifactTypes as ArtifactType[];
export const statuses = catalog.statuses as NodeStatus[];
export const visibilities = catalog.visibilities as Visibility[];

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

export function isValidSourceType(v: string): v is SourceType {
  return catalog.sourceTypes.includes(v);
}

export function isValidSynthesisType(v: string): v is SynthesisType {
  return catalog.synthesisTypes.includes(v);
}

export function isValidArtifactType(v: string): v is ArtifactType {
  return catalog.artifactTypes.includes(v);
}

export function isValidStatus(v: string): v is NodeStatus {
  return catalog.statuses.includes(v);
}

export function isValidVisibility(v: string): v is Visibility {
  return catalog.visibilities.includes(v);
}

// ---------------------------------------------------------------------------
// Display helpers (turn slug into human-readable label)
// ---------------------------------------------------------------------------

export function labelFor(value: string): string {
  return value
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Returns types list for a given node category.
 */
export function typesForCategory(
  category: "source" | "synthesis" | "artifact",
): string[] {
  switch (category) {
    case "source":
      return catalog.sourceTypes;
    case "synthesis":
      return catalog.synthesisTypes;
    case "artifact":
      return catalog.artifactTypes;
  }
}
