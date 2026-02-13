# Semantic Layer for Stacks

> Plan for review — branch: `semantics`

## Overview

Add semantic metadata (type, unified status, visibility, tags, owner) to all node types with a catalog config, UI affordances in the editor/nav/lineage rail, governance enforcement, and compile output enrichment.

## Data Model Changes

Extend all node types with shared semantic fields:

- **NodeStatus** (unified): `draft` | `proposed` | `canonical` | `superseded`
- **Visibility**: `internal` | `client_shareable` | `client_facing`
- **tags**: `string[]` (freeform)
- **owner**: `string` (optional accountability)

### Per-node type changes

- **Source**: keep existing `type` field, expand enum to add `meeting_transcript`, `email`, `slack_thread`, `data_metric`, `whiteboard`. Add `status`, `visibility`, `tags`, `owner`.
- **Synthesis**: add new `type` field (`SynthesisType`: `pattern` | `theme` | `tension` | `insight` | `comparison` | `framework`). Replace old `SynthesisStatus` with unified `NodeStatus`. Add `visibility`, `tags`, `owner`.
- **Artifact**: keep existing `type` field, expand enum to add `requirement`, `plan`, `risk_issue`, `recommendation`. Replace old `ArtifactStatus` with unified `NodeStatus`. Add `visibility`, `tags`, `owner`.

## Catalog Config

`fieldbook/config/catalog.json` defines all allowed enum values per node category. Included in compile output so agents always know the available vocabulary.

## Migration

One-time script (`fieldbook/scripts/migrate-semantics.ts`) to update existing `data.json`:

- Source: set `status: "canonical"`, `visibility: "internal"`, `tags: []`
- Synthesis: map `committed` → `canonical`, `draft` → `draft`; set `visibility: "internal"`, `tags: []`; set `type: "insight"` as default
- Artifact: map `final` → `canonical`, `review` → `proposed`, `draft` → `draft`; set `visibility: "internal"`, `tags: []`

## UI Changes

Minimal additions — no redesign.

1. **Pill chips under node title** — editable pills for Type, Status, Visibility in all editors
2. **Metadata section in right rail** — collapsible section below Lineage showing Type, Status, Visibility, Tags, Owner
3. **Left nav badges** — color-coded status dots and type labels next to each list item

## Governance

- Agents cannot set `status: "canonical"` directly (overridden to `"proposed"`)
- Agents cannot set `visibility: "client_facing"`
- New `guardedUpdateMetadata` function enforces these rules

## Compile Output

- `context.json` and `lineage.json` include semantic fields on every node
- `stack.md` renders status, visibility, tags
- Zip bundle includes `catalog.json`

## API / MCP

- REST v2 routes return and accept semantic fields
- MCP tools include semantic fields in responses
- New browsable resource: `stacks://catalog`
- Search supports filtering by status, visibility, tags
