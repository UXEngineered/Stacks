/**
 * Mock Movement Data
 *
 * Provides sample events for the Movement panel during development.
 * Replace with real backend when movement events are persisted.
 */

import type { MovementEvent } from "./types";

const now = new Date();
const hour = (h: number) => new Date(now.getTime() - h * 60 * 60 * 1000).toISOString();
const day = (d: number) => new Date(now.getTime() - d * 24 * 60 * 60 * 1000).toISOString();

export const MOCK_MOVEMENT_EVENTS: MovementEvent[] = [
  // ── Unseen (very recent) ──────────────────────────────────────
  {
    id: "mv-0",
    type: "synthesis_recalibrated",
    title: "Synthesis recalibrated (2 new inputs)",
    summary: "Shifts the integration trade-off framing; review recommended.",
    affectedNodeIds: ["syn-1"],
    impactedArtifacts: [
      { id: "art-1", name: "Platform Team Decision Brief" },
      { id: "art-3", name: "Q3 Roadmap Draft" },
    ],
    createdAt: now.toISOString(),
    nodeId: "syn-1",
    severity: "major",
  },

  // ── Recent (< 24 h) ──────────────────────────────────────────
  {
    id: "mv-1",
    type: "source_added",
    title: "New source added",
    summary: "May trigger recalibration of 2 dependent syntheses.",
    affectedNodeIds: ["syn-1", "syn-2"],
    impactedArtifacts: [],
    createdAt: hour(3),
    nodeId: "src-1",
    createdBy: "agent:mcp-client:vera",
  },
  {
    id: "mv-2",
    type: "artifact_major_update",
    title: "Major artifact update checkpointed",
    summary: "Substantive content change captured; downstream consumers should review.",
    affectedNodeIds: ["art-1"],
    impactedArtifacts: [
      { id: "art-1", name: "Platform Team Decision Brief" },
    ],
    createdAt: hour(6),
    nodeId: "art-1",
    createdBy: "James Williams",
    severity: "major",
  },

  // ── Earlier (> 24 h) ─────────────────────────────────────────
  {
    id: "mv-3",
    type: "artifact_checkpoint",
    title: "Artifact checkpoint created",
    // no summary — self-explanatory
    affectedNodeIds: [],
    impactedArtifacts: [{ id: "art-1", name: "Platform Team Decision Brief" }],
    createdAt: day(1),
    nodeId: "art-1",
    createdBy: "James Williams",
  },
  {
    id: "mv-4",
    type: "lineage_changed",
    title: "Lineage restructured",
    summary: "Artifact now derives from 2 syntheses instead of 1.",
    affectedNodeIds: ["art-1"],
    impactedArtifacts: [
      { id: "art-1", name: "Platform Team Decision Brief" },
      { id: "art-2", name: "Technical Spike Summary" },
    ],
    createdAt: day(2),
    severity: "major",
  },
  {
    id: "mv-5",
    type: "source_replaced",
    title: "Source replaced",
    summary: "Original URL unreachable; replacement provided.",
    affectedNodeIds: ["syn-1"],
    impactedArtifacts: [{ id: "art-1", name: "Platform Team Decision Brief" }],
    createdAt: day(3),
    nodeId: "src-2",
  },
  {
    id: "mv-6",
    type: "node_created",
    title: "New synthesis created",
    summary: "Auto-generated from 3 source documents.",
    affectedNodeIds: [],
    impactedArtifacts: [],
    createdAt: day(4),
    nodeId: "syn-2",
    createdBy: "agent:mcp-client:vera",
  },
  {
    id: "mv-7",
    type: "node_archived",
    title: "Source archived",
    summary: "No longer referenced by any active synthesis.",
    affectedNodeIds: [],
    impactedArtifacts: [],
    createdAt: day(5),
    nodeId: "src-3",
  },
];

const STORAGE_KEY_PREFIX = "movement-seen-";

export function getLastSeenAt(projectId: string, userId?: string): string | null {
  if (typeof window === "undefined") return null;
  const key = userId ? `${STORAGE_KEY_PREFIX}${projectId}-${userId}` : `${STORAGE_KEY_PREFIX}${projectId}`;
  return localStorage.getItem(key);
}

export function setLastSeenAt(projectId: string, userId?: string, timestamp?: string): void {
  if (typeof window === "undefined") return;
  const key = userId ? `${STORAGE_KEY_PREFIX}${projectId}-${userId}` : `${STORAGE_KEY_PREFIX}${projectId}`;
  localStorage.setItem(key, timestamp || new Date().toISOString());
}

export function getUnseenCount(
  events: MovementEvent[],
  projectId: string,
  userId?: string
): number {
  const lastSeen = getLastSeenAt(projectId, userId);
  if (!lastSeen) return events.length;
  const cutoff = new Date(lastSeen).getTime();
  return events.filter((e) => new Date(e.createdAt).getTime() > cutoff).length;
}
