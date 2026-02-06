# Phase 0 Domain Model

> Minimal schema for lineage capture without work-about-work overhead.

---

## Design Intent

**This schema is exploratory infrastructure, not a product prediction.**

It exists to validate a single thesis: that lineage can be captured and referenced without creating work-about-work. It is expected to evolve as we learn. Do not treat this as a long-term contract.

### The Unified Node Model is Philosophical

`NodeType` (source, synthesis, artifact) represents **semantic roles**, not lifecycle stages.

- A Source is an input that exists
- A Synthesis is an interpretation that was derived
- An Artifact is an output that was produced

These are **not** workflow states. There is no "draft → review → approved" implied. A node does not "progress" through types. This constraint is intentional to prevent drift toward task or project management semantics.

### Forking is Intentionally Sparse

When a Fieldbook is forked:
- The new Fieldbook receives a `parent_id` reference
- Nodes are **not** copied
- Only `fork_context` (a text field) carries forward

This enforces **condensed inheritance**: the fork starts nearly empty, with only the essential anchors (e.g., "Final SOW signed, budget $500k, timeline 6mo") preserved as text. This is not a limitation—it is the design.

### Constraints are Philosophical, Not Just Technical

| Constraint | Rationale |
|------------|-----------|
| Cross-Fieldbook edges forbidden | Preserves bounded context; lineage is contained |
| No self-loop edges | Prevents false lineage claims |
| Edge direction: downstream → upstream | Supports "what depends on this?" reasoning |
| No status/phase fields | Lineage is not workflow |

### What This Explicitly Does NOT Support

- ❌ Phases, statuses, milestones
- ❌ Task tracking or assignments
- ❌ Workflow or process enforcement
- ❌ Real-time collaboration primitives
- ❌ AI committing lineage automatically

If a future change introduces any of these, it should be a conscious, documented decision—not schema drift.

---

## Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                            FIELDBOOK                                 │
│─────────────────────────────────────────────────────────────────────│
│ id              UUID PK                                             │
│ name            VARCHAR(255)                                        │
│ description     TEXT                                                │
│ parent_id       UUID FK → Fieldbook (nullable, for forks)           │
│ fork_context    TEXT (condensed inheritance from parent)            │
│ created_at      TIMESTAMP                                           │
│ updated_at      TIMESTAMP                                           │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ 1:N
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                              NODE                                    │
│─────────────────────────────────────────────────────────────────────│
│ id              UUID PK                                             │
│ fieldbook_id    UUID FK → Fieldbook                                 │
│ node_type       ENUM (source, synthesis, artifact)                  │
│ subtype         VARCHAR(50) (link, note, file, decision-brief, etc.)│
│ title           VARCHAR(500)                                        │
│ content         JSONB (rich text document)                          │
│ metadata        JSONB (type-specific: url, file_size, mime_type)    │
│ created_at      TIMESTAMP                                           │
│ updated_at      TIMESTAMP                                           │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ M:N (self-referential via Edge)
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                              EDGE                                    │
│─────────────────────────────────────────────────────────────────────│
│ id              UUID PK                                             │
│ fieldbook_id    UUID FK → Fieldbook                                 │
│ source_node_id  UUID FK → Node                                      │
│ target_node_id  UUID FK → Node                                      │
│ relationship    ENUM (derived_from, informed_by, superseded,        │
│                       related_to)                                   │
│ created_at      TIMESTAMP                                           │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Entity Definitions

### Fieldbook
The root container for a body of work. Supports forking with condensed inheritance.

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `name` | string | Display name |
| `description` | text | Optional description |
| `parent_id` | UUID? | If forked, reference to parent Fieldbook |
| `fork_context` | text | Condensed context inherited from parent (e.g., "Final SOW signed 2024-01-15, key constraints: budget $500k, timeline 6mo") |
| `created_at` | timestamp | Creation time |
| `updated_at` | timestamp | Last modification |

### Node
A single unit of content. Unified table with `node_type` discriminator.

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `fieldbook_id` | UUID | Parent Fieldbook (required) |
| `node_type` | enum | `source`, `synthesis`, or `artifact` |
| `subtype` | string | Type-specific: `link`, `note`, `file`, `interview`, `decision-brief`, `opportunity-map`, etc. |
| `title` | string | Display title |
| `content` | JSONB | Rich text content (TipTap/ProseMirror JSON) |
| `metadata` | JSONB | Type-specific data (see below) |
| `created_at` | timestamp | Creation time |
| `updated_at` | timestamp | Last modification |

**Metadata by subtype:**
- `link`: `{ url, fetched_at, snapshot_content }`
- `file`: `{ file_name, file_size, mime_type, storage_key }`
- `interview`: `{ interviewee, date, duration_minutes }`
- `decision-brief`: `{ confidence_level }` (if needed)

### Edge
A directed relationship between two Nodes.

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `fieldbook_id` | UUID | Parent Fieldbook (denormalized for query efficiency) |
| `source_node_id` | UUID | Origin node |
| `target_node_id` | UUID | Destination node |
| `relationship` | enum | Relationship type (see below) |
| `created_at` | timestamp | When relationship was created |

**Relationship types:**
- `derived_from` — Target was synthesized/created from Source (Synthesis ← Source)
- `informed_by` — Target was influenced by Source (Artifact ← Synthesis)
- `superseded` — Target replaces Source (new version supersedes old)
- `related_to` — Soft association without derivation semantics

**Edge direction convention:**
- Edges point from **downstream → upstream**
- "Synthesis A `derived_from` Source B" means A depends on B
- This allows: "What does A depend on?" = outgoing edges from A

---

## Validation Rules

### Fieldbook
1. `name` is required and non-empty
2. If `parent_id` is set, the parent Fieldbook must exist
3. Circular fork chains are not allowed (A cannot fork from B if B forks from A)

### Node
1. `fieldbook_id` must reference an existing Fieldbook
2. `node_type` must be one of: `source`, `synthesis`, `artifact`
3. `title` is required and non-empty
4. `content` must be valid JSON (TipTap document structure)

### Edge
1. `fieldbook_id` must reference an existing Fieldbook
2. `source_node_id` and `target_node_id` must reference existing Nodes
3. **Both nodes must belong to the same Fieldbook** (cross-fieldbook edges not allowed in Phase 0)
4. `source_node_id` ≠ `target_node_id` (no self-loops)
5. `relationship` must be one of: `derived_from`, `informed_by`, `superseded`, `related_to`
6. Duplicate edges (same source, target, relationship) are not allowed

### Fork Rules
1. When forking, the new Fieldbook gets `parent_id` set to the source Fieldbook
2. Nodes are **not** copied automatically — fork starts sparse
3. `fork_context` should contain condensed anchors (final artifacts, key decisions)
4. Parent Fieldbook remains unchanged and independently editable

---

## Indexes

```sql
-- Fieldbook lookups
CREATE INDEX idx_fieldbook_parent ON fieldbook(parent_id) WHERE parent_id IS NOT NULL;

-- Node queries
CREATE INDEX idx_node_fieldbook ON node(fieldbook_id);
CREATE INDEX idx_node_fieldbook_type ON node(fieldbook_id, node_type);
CREATE INDEX idx_node_updated ON node(updated_at DESC);

-- Edge traversal (lineage queries)
CREATE INDEX idx_edge_fieldbook ON edge(fieldbook_id);
CREATE INDEX idx_edge_source ON edge(source_node_id);
CREATE INDEX idx_edge_target ON edge(target_node_id);
CREATE INDEX idx_edge_source_rel ON edge(source_node_id, relationship);
CREATE INDEX idx_edge_target_rel ON edge(target_node_id, relationship);

-- Unique constraint: no duplicate edges
CREATE UNIQUE INDEX idx_edge_unique ON edge(source_node_id, target_node_id, relationship);
```

---

## What's NOT in Phase 0

Per the Phase 0 constitution, this schema intentionally excludes:

- ❌ `status` field (no on-track/at-risk/blocked)
- ❌ `phase` or `stage` field
- ❌ `assigned_to` or `owner` field
- ❌ `due_date` or `milestone` field
- ❌ `task` or `ticket` entities
- ❌ `user` table (auth deferred)
- ❌ `comment` or `activity` tables
- ❌ Real-time collaboration fields (`locked_by`, `editing_by`)

---

## Example Queries

### Get all nodes in a Fieldbook with their lineage counts
```sql
SELECT 
  n.*,
  (SELECT COUNT(*) FROM edge e WHERE e.source_node_id = n.id) as depends_on_count,
  (SELECT COUNT(*) FROM edge e WHERE e.target_node_id = n.id) as dependents_count
FROM node n
WHERE n.fieldbook_id = $1
ORDER BY n.created_at DESC;
```

### Get upstream lineage for a node (what it depends on)
```sql
SELECT n.*, e.relationship
FROM edge e
JOIN node n ON n.id = e.target_node_id
WHERE e.source_node_id = $1;
```

### Get downstream dependents (what depends on this node)
```sql
SELECT n.*, e.relationship
FROM edge e
JOIN node n ON n.id = e.source_node_id
WHERE e.target_node_id = $1;
```

### Get fork tree for a Fieldbook
```sql
WITH RECURSIVE fork_tree AS (
  SELECT id, name, parent_id, 0 as depth
  FROM fieldbook
  WHERE id = $1
  
  UNION ALL
  
  SELECT f.id, f.name, f.parent_id, ft.depth + 1
  FROM fieldbook f
  JOIN fork_tree ft ON f.parent_id = ft.id
)
SELECT * FROM fork_tree ORDER BY depth;
```
