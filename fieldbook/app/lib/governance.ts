/**
 * Governance Layer
 *
 * Wraps data mutations with trust rules:
 *   - Users can create & edit in place.
 *   - Agents can create, but edits produce new versions (never overwrite canonical).
 *   - Recalibrations by agents are proposals (draft + diff), not auto-applied.
 *   - Every mutation emits a persisted MovementEvent.
 *
 * This module is the single choke-point for writes that come from
 * both the REST API and the MCP server.
 */

import {
  loadData,
  saveData,
  createSource as dbCreateSource,
  createSynthesis as dbCreateSynthesis,
  createArtifact as dbCreateArtifact,
  updateSource as dbUpdateSource,
  updateSynthesis as dbUpdateSynthesis,
  updateArtifact as dbUpdateArtifact,
  getFieldbook,
} from "./db";
import type {
  Source,
  Synthesis,
  Artifact,
  CreateSource,
  CreateSynthesis,
  CreateArtifact,
  Fieldbook,
} from "./db/types";
import type { MovementEvent, MovementEventType } from "./movement/types";
import type { Actor } from "./api/envelope";

// ---------------------------------------------------------------------------
// Movement event persistence
// ---------------------------------------------------------------------------

/**
 * Persist a movement event to the fieldbook's movements array.
 * Creates the array if it doesn't exist yet.
 */
export async function persistMovementEvent(
  fieldbookId: string,
  event: Omit<MovementEvent, "id" | "createdAt">,
): Promise<MovementEvent> {
  const db = await loadData();
  const fb = db.fieldbooks.find((f) => f.id === fieldbookId);
  if (!fb) throw new Error(`Fieldbook ${fieldbookId} not found`);

  const full: MovementEvent = {
    ...event,
    id: `mv-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
  };

  // Extend fieldbook with movements array (schema addition)
  const movements: MovementEvent[] =
    (fb as Fieldbook & { movements?: MovementEvent[] }).movements || [];
  movements.push(full);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (fb as any).movements = movements;

  await saveData(db);
  return full;
}

/**
 * Read all movement events for a fieldbook.
 */
export async function getMovementEvents(
  fieldbookId: string,
): Promise<MovementEvent[]> {
  const fb = await getFieldbook(fieldbookId);
  if (!fb) return [];
  return (fb as Fieldbook & { movements?: MovementEvent[] }).movements || [];
}

// ---------------------------------------------------------------------------
// Actor label helper
// ---------------------------------------------------------------------------

function actorLabel(actor: Actor): string {
  if (actor.kind === "agent") {
    return `agent:${actor.id}${actor.name ? `:${actor.name}` : ""}`;
  }
  return `user:${actor.id}`;
}

// ---------------------------------------------------------------------------
// Guarded Create
// ---------------------------------------------------------------------------

export interface CreateResult<T> {
  item: T;
  event: MovementEvent;
}

/**
 * Create a source with governance: emits a movement event.
 * Both users and agents may create sources.
 */
export async function guardedCreateSource(
  fieldbookId: string,
  data: CreateSource & { url?: string; domain?: string; note?: string; capturedAt?: string },
  actor: Actor,
): Promise<CreateResult<Source>> {
  const item = await dbCreateSource(fieldbookId, data);
  if (!item) throw new Error(`Failed to create source in fieldbook ${fieldbookId}`);

  const event = await persistMovementEvent(fieldbookId, {
    type: "source_added" as MovementEventType,
    title: `Source added: ${item.title || "Untitled"}`,
    summary: actor.kind === "agent"
      ? `Created by ${actorLabel(actor)}`
      : undefined,
    affectedNodeIds: [item.id],
    impactedArtifacts: [],
    createdBy: actorLabel(actor),
    nodeId: item.id,
  });

  return { item, event };
}

/**
 * Create a synthesis with governance: emits a movement event.
 */
export async function guardedCreateSynthesis(
  fieldbookId: string,
  data: CreateSynthesis & { status?: "draft" | "committed" },
  actor: Actor,
): Promise<CreateResult<Synthesis>> {
  const item = await dbCreateSynthesis(fieldbookId, data);
  if (!item) throw new Error(`Failed to create synthesis in fieldbook ${fieldbookId}`);

  const event = await persistMovementEvent(fieldbookId, {
    type: "node_created" as MovementEventType,
    title: `Synthesis created: ${item.title || "Untitled"}`,
    summary: actor.kind === "agent"
      ? `Created by ${actorLabel(actor)}`
      : undefined,
    affectedNodeIds: [item.id],
    impactedArtifacts: [],
    createdBy: actorLabel(actor),
    nodeId: item.id,
  });

  return { item, event };
}

/**
 * Create an artifact with governance: emits a movement event.
 */
export async function guardedCreateArtifact(
  fieldbookId: string,
  data: CreateArtifact,
  actor: Actor,
): Promise<CreateResult<Artifact>> {
  const item = await dbCreateArtifact(fieldbookId, data);
  if (!item) throw new Error(`Failed to create artifact in fieldbook ${fieldbookId}`);

  const event = await persistMovementEvent(fieldbookId, {
    type: "node_created" as MovementEventType,
    title: `Artifact created: ${item.title || "Untitled"}`,
    summary: actor.kind === "agent"
      ? `Created by ${actorLabel(actor)}`
      : undefined,
    affectedNodeIds: [item.id],
    impactedArtifacts: [{ id: item.id, name: item.title }],
    createdBy: actorLabel(actor),
    nodeId: item.id,
  });

  return { item, event };
}

// ---------------------------------------------------------------------------
// Guarded Update
// ---------------------------------------------------------------------------

export interface VersionResult<T> {
  /** The new or updated item */
  item: T;
  /** Movement event emitted */
  event: MovementEvent;
  /** True if a new version was created (agent path) rather than in-place edit */
  isNewVersion: boolean;
}

/**
 * Update a source. Users edit in place; agents create a new version.
 */
export async function guardedUpdateSource(
  fieldbookId: string,
  sourceId: string,
  updates: Partial<Pick<Source, "title" | "content" | "url" | "note">>,
  actor: Actor,
): Promise<VersionResult<Source>> {
  if (actor.kind === "user") {
    // User: edit in place
    const item = await dbUpdateSource(fieldbookId, { id: sourceId, ...updates });
    if (!item) throw new Error(`Source ${sourceId} not found`);

    const event = await persistMovementEvent(fieldbookId, {
      type: "source_replaced" as MovementEventType,
      title: `Source updated: ${item.title}`,
      affectedNodeIds: [item.id],
      impactedArtifacts: [],
      createdBy: actorLabel(actor),
      nodeId: item.id,
    });

    return { item, event, isNewVersion: false };
  }

  // Agent: create a new version — never overwrite canonical
  const original = (await getFieldbook(fieldbookId))?.sources.find(
    (s) => s.id === sourceId,
  );
  if (!original) throw new Error(`Source ${sourceId} not found`);

  const newItem = await dbCreateSource(fieldbookId, {
    title: updates.title ?? original.title,
    type: original.type,
    content: updates.content ?? original.content,
    url: updates.url ?? original.url,
    note: updates.note ?? original.note,
  });
  if (!newItem) throw new Error("Failed to create new source version");

  const event = await persistMovementEvent(fieldbookId, {
    type: "source_added" as MovementEventType,
    title: `New version of "${original.title}" proposed by agent`,
    summary: `Original: ${sourceId} → New: ${newItem.id}. Created by ${actorLabel(actor)}`,
    affectedNodeIds: [sourceId, newItem.id],
    impactedArtifacts: [],
    createdBy: actorLabel(actor),
    nodeId: newItem.id,
  });

  return { item: newItem, event, isNewVersion: true };
}

/**
 * Update a synthesis. Users edit in place; agents create a new version.
 */
export async function guardedUpdateSynthesis(
  fieldbookId: string,
  synthesisId: string,
  updates: Partial<Pick<Synthesis, "title" | "content" | "derivedFrom">>,
  actor: Actor,
): Promise<VersionResult<Synthesis>> {
  if (actor.kind === "user") {
    const item = await dbUpdateSynthesis(fieldbookId, { id: synthesisId, ...updates });
    if (!item) throw new Error(`Synthesis ${synthesisId} not found`);

    const event = await persistMovementEvent(fieldbookId, {
      type: "synthesis_recalibrated" as MovementEventType,
      title: `Synthesis updated: ${item.title}`,
      affectedNodeIds: [item.id],
      impactedArtifacts: [],
      createdBy: actorLabel(actor),
      nodeId: item.id,
    });

    return { item, event, isNewVersion: false };
  }

  // Agent: new version
  const fb = await getFieldbook(fieldbookId);
  const original = fb?.syntheses.find((s) => s.id === synthesisId);
  if (!original) throw new Error(`Synthesis ${synthesisId} not found`);

  const newItem = await dbCreateSynthesis(fieldbookId, {
    title: updates.title ?? original.title,
    content: updates.content ?? original.content,
    derivedFrom: updates.derivedFrom ?? original.derivedFrom,
    status: "draft",
  });
  if (!newItem) throw new Error("Failed to create new synthesis version");

  const event = await persistMovementEvent(fieldbookId, {
    type: "node_created" as MovementEventType,
    title: `New version of "${original.title}" proposed by agent`,
    summary: `Original: ${synthesisId} → New: ${newItem.id}. Created by ${actorLabel(actor)}`,
    affectedNodeIds: [synthesisId, newItem.id],
    impactedArtifacts: [],
    createdBy: actorLabel(actor),
    nodeId: newItem.id,
  });

  return { item: newItem, event, isNewVersion: true };
}

/**
 * Update an artifact. Users edit in place; agents create a new version.
 */
export async function guardedUpdateArtifact(
  fieldbookId: string,
  artifactId: string,
  updates: Partial<Pick<Artifact, "title" | "content" | "informedBy">>,
  actor: Actor,
): Promise<VersionResult<Artifact>> {
  if (actor.kind === "user") {
    const item = await dbUpdateArtifact(fieldbookId, { id: artifactId, ...updates });
    if (!item) throw new Error(`Artifact ${artifactId} not found`);

    const event = await persistMovementEvent(fieldbookId, {
      type: "artifact_major_update" as MovementEventType,
      title: `Artifact updated: ${item.title}`,
      affectedNodeIds: [item.id],
      impactedArtifacts: [{ id: item.id, name: item.title }],
      createdBy: actorLabel(actor),
      nodeId: item.id,
    });

    return { item, event, isNewVersion: false };
  }

  // Agent: new version
  const fb = await getFieldbook(fieldbookId);
  const original = fb?.artifacts.find((a) => a.id === artifactId);
  if (!original) throw new Error(`Artifact ${artifactId} not found`);

  const newItem = await dbCreateArtifact(fieldbookId, {
    type: original.type,
    title: updates.title ?? original.title,
    content: updates.content ?? original.content,
    informedBy: updates.informedBy ?? original.informedBy,
    status: "draft",
  });
  if (!newItem) throw new Error("Failed to create new artifact version");

  const event = await persistMovementEvent(fieldbookId, {
    type: "node_created" as MovementEventType,
    title: `New version of "${original.title}" proposed by agent`,
    summary: `Original: ${artifactId} → New: ${newItem.id}. Created by ${actorLabel(actor)}`,
    affectedNodeIds: [artifactId, newItem.id],
    impactedArtifacts: [
      { id: original.id, name: original.title },
      { id: newItem.id, name: newItem.title },
    ],
    createdBy: actorLabel(actor),
    nodeId: newItem.id,
  });

  return { item: newItem, event, isNewVersion: true };
}

// ---------------------------------------------------------------------------
// Propose Recalibration (agent-only: draft + diff, never auto-apply)
// ---------------------------------------------------------------------------

export interface RecalibrationProposal {
  /** The node being proposed for recalibration */
  nodeId: string;
  nodeType: "synthesis" | "artifact";
  nodeTitle: string;
  /** Current content */
  currentContent: string;
  /** Proposed new content (if provided by the agent) */
  proposedContent?: string;
  /** Description of what the agent thinks should change */
  rationale: string;
  /** Movement event created */
  event: MovementEvent;
}

/**
 * Propose a recalibration for a synthesis or artifact.
 * This does NOT mutate the node — it creates a movement event
 * with the proposal details for a human to review.
 */
export async function proposeRecalibration(
  fieldbookId: string,
  nodeId: string,
  proposal: {
    rationale: string;
    proposedContent?: string;
  },
  actor: Actor,
): Promise<RecalibrationProposal> {
  const fb = await getFieldbook(fieldbookId);
  if (!fb) throw new Error(`Fieldbook ${fieldbookId} not found`);

  // Find the node — could be synthesis or artifact
  const synthesis = fb.syntheses.find((s) => s.id === nodeId);
  const artifact = fb.artifacts.find((a) => a.id === nodeId);
  const node = synthesis || artifact;
  if (!node) throw new Error(`Node ${nodeId} not found`);

  const nodeType: "synthesis" | "artifact" = synthesis ? "synthesis" : "artifact";

  const event = await persistMovementEvent(fieldbookId, {
    type: "synthesis_recalibrated" as MovementEventType,
    title: `Recalibration proposed for "${node.title}"`,
    summary: `Agent ${actorLabel(actor)} proposes: ${proposal.rationale}`,
    affectedNodeIds: [nodeId],
    impactedArtifacts: nodeType === "artifact"
      ? [{ id: node.id, name: node.title }]
      : [],
    createdBy: actorLabel(actor),
    nodeId,
    severity: "major",
  });

  return {
    nodeId,
    nodeType,
    nodeTitle: node.title,
    currentContent: node.content,
    proposedContent: proposal.proposedContent,
    rationale: proposal.rationale,
    event,
  };
}
