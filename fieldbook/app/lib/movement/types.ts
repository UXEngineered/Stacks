/**
 * Movement Event Types
 *
 * Significant shifts in the fieldbook's understanding.
 * Not activity tracking — no noisy edits or minor saves.
 */

export type MovementEventType =
  | "source_added"
  | "source_replaced"
  | "synthesis_recalibrated"
  | "artifact_checkpoint"
  | "artifact_major_update"
  | "lineage_changed"
  | "node_created"
  | "node_archived";

export type MovementFilter =
  | "all"
  | "upstream"   // sources, source_replaced
  | "synthesis"  // synthesis_recalibrated
  | "artifacts"  // artifact_checkpoint, artifact_major_update
  | "structural"; // lineage_changed, node_created, node_archived

export type MovementSeverity = "major" | "normal";

/**
 * Derive severity from event type + downstream impact.
 * Major: artifact_major_update, lineage_changed w/ impacted artifacts,
 *        synthesis_recalibrated w/ downstream impacts > 0.
 */
export function deriveSeverity(event: MovementEvent): MovementSeverity {
  if (event.severity) return event.severity;
  if (event.type === "artifact_major_update") return "major";
  if (event.type === "lineage_changed" && event.impactedArtifacts.length > 0) return "major";
  if (event.type === "synthesis_recalibrated" && event.affectedNodeIds.length > 0) return "major";
  return "normal";
}

export interface MovementEvent {
  id: string;
  type: MovementEventType;
  title: string;
  /** One-line "why it matters". Optional — omit for self-explanatory titles. */
  summary?: string;
  affectedNodeIds: string[];
  impactedArtifacts: Array<{ id: string; name: string }>;
  createdAt: string; // ISO
  createdBy?: string;
  /** Node ID this event relates to (for navigation) */
  nodeId?: string;
  /** Override auto-derived severity. If omitted, deriveSeverity() decides. */
  severity?: MovementSeverity;
}

export interface MovementData {
  events: MovementEvent[];
  /** ISO timestamp when user last opened the drawer */
  lastSeenAt?: string;
}
