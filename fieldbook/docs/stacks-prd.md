# Stacks — Product Requirements Document

> A lineage-first system for how teams think, decide, and evolve work in the AI era.

---

## 1. Product Vision

Stacks is the human interface for agent-generated work. Agents do the heavy lifting — ingesting evidence, synthesizing patterns, generating artifacts — but every output flows through Stacks where people can inspect lineage, judge quality, and decide what becomes canonical.

The UI is not where work gets done. It is where work gets understood.

### Core Thesis

The future of work is not better collaboration. It is better preservation of intent.

In an AI-accelerated world, artifacts are cheap, drafts are infinite, and outputs are abundant. What becomes scarce is **why** something exists, what informed it, what changed, and what depends on it now. Teams do not fail due to lack of documentation — they fail due to context collapse over time.

### Design Philosophy

Stacks does not ask teams to do their work inside a new tool. It brings shared lineage to where work is already happening. Rather than acting as a central hub, Stacks operates as an orchestration layer that observes, captures, and connects work across the systems teams already use.

### Strategic Guardrail

> Does this reduce the cost of preserving intent, or does it increase the cost of doing the work?

Only the first belongs in Stacks.

---

## 2. What Stacks Is NOT

Stacks is explicitly not:

- Project management or task/sprint tracking
- A backlog, ticket, or kanban system
- Real-time collaboration (Google Docs-style)
- A document editor or whiteboard replacement
- A Jira, Asana, Notion, or Linear competitor

If a feature helps **control** work, it is out of scope. If it helps **understand** work, it is aligned.

### Features We Intentionally Do Not Build

- Named phases or gates
- Status indicators (on track, at risk, blocked)
- Backlogs, tickets, or sprints
- Heavy integrations with delivery tooling
- Prescriptive workflows
- Assignments, due dates, or milestones

---

## 3. Core Concepts

### Fieldbooks

Long-lived, forkable lineage graphs that preserve how decisions, assumptions, artifacts, and outcomes relate over time. A fieldbook is not a project workspace — it is the evidence record for how understanding evolved.

Fieldbooks contain three primary entity types connected by lineage:

| Entity | Role | Upstream Link |
|--------|------|---------------|
| **Source** | Raw evidence: interviews, transcripts, documents, meeting notes, external links | None (leaf nodes) |
| **Synthesis** | Patterns and insights derived from sources | `derivedFrom` (source IDs) |
| **Artifact** | Deliverables: architecture docs, roadmaps, PRDs, cost models, decision records | `informedBy` (synthesis/source IDs) |

Relationships preserved: `derived from`, `informed by`, `superseded`, `related to`.

Fieldbooks support **forking** with condensed inheritance — the fork starts sparse with only essential anchors (key decisions, constraints) carried forward as text. Nodes are not copied.

### The Spine

The primary UI: a three-column layout designed for tracing agent output back to its origins.

- **Left** — Sources panel: raw inputs, organized and searchable
- **Center** — Working area: editors for sources, syntheses, and artifacts
- **Right** — Lineage panel: upstream/downstream trace for the selected node, metadata, calibration history

Read left to right to see how raw evidence becomes a finished artifact. Read right to left to audit why an artifact says what it says.

### Semantic Layer

Every node carries metadata that controls how it flows through the system:

| Field | Values | Purpose |
|-------|--------|---------|
| **Status** | `draft`, `proposed`, `canonical`, `superseded` | Lifecycle position |
| **Visibility** | `internal`, `client_shareable`, `client_facing` | Audience control |
| **Tags** | Freeform strings | Classification |
| **Owner** | String (optional) | Accountability |
| **Type** | Catalog-defined per category | Semantic classification |

A central catalog (`config/catalog.json`) defines all allowed enum values. Agents are constrained by the same catalog humans use.

### Governance

The trust boundary between agent and human:

- Agents can create freely, but everything starts as `draft` or `proposed` — never `canonical`
- Agent edits create new versions; they never overwrite human-approved content
- Agents cannot set visibility to `client_facing` — forced down to `client_shareable`
- Recalibrations are proposals with rationale, not silent rewrites
- Every agent action emits a **movement event** — a permanent audit record of what changed, who did it, and why
- All writes accept an `Actor` (`user:<id>` or `agent:<id>:<name>`) for attribution

### Reverberation

When upstream evidence changes, downstream syntheses and artifacts are automatically flagged:

- **Token-based templates** — content can contain `{{FACT_NAME}}` tokens tied to the fieldbook's fact map
- **Deterministic rendering** — changing a fact re-renders all templates that reference it
- **Diff generation** — before/after comparison when facts change
- **AI-suggested adjustments** — after deterministic propagation, optionally generates AI suggestions for how downstream content should adapt
- **Recalibration status** — nodes track whether they are `idle`, `recalibrating`, or `calibrated`
- **Calibration history** — full audit trail of recalibration decisions

---

## 4. Data Model

### Catalog (allowed enum values)

**Source types:** `interview`, `transcript`, `doc`, `note`, `external_link`, `meeting_transcript`, `email`, `slack_thread`, `data_metric`, `whiteboard`

**Synthesis types:** `pattern`, `theme`, `tension`, `insight`, `comparison`, `framework`

**Artifact types:** `decision-brief`, `opportunity-map`, `design-rationale`, `research-warrant`, `alignment-map`, `evidence-inventory`, `transition-playbook`, `requirement`, `plan`, `risk_issue`, `recommendation`

**Statuses:** `draft`, `proposed`, `canonical`, `superseded`

**Visibilities:** `internal`, `client_shareable`, `client_facing`

### Entity Model

```
Fieldbook
├── id, name, description
├── parentId?, forkContext? (fork support)
├── facts? (reverberation token map)
├── movements[] (audit trail)
├── calibrationHistory[]
├── lineageReferences[] (cross-fieldbook upstream)
│
├── sources[]
│   ├── SemanticFields (status, visibility, tags, owner)
│   ├── type (SourceType), title, content
│   ├── url?, domain?, note? (for links)
│   └── ReverberationFields (template, rendered, diff)
│
├── syntheses[]
│   ├── SemanticFields
│   ├── type (SynthesisType), title, content
│   ├── derivedFrom: string[] → source IDs
│   └── ReverberationFields
│
└── artifacts[]
    ├── SemanticFields
    ├── type (ArtifactType), title, content
    ├── informedBy: string[] → synthesis/source IDs
    └── ReverberationFields
```

### Edge Semantics

Edges are implicit (stored as `derivedFrom` / `informedBy` arrays), not a separate table in JSON persistence:

| Relationship | Meaning | Direction |
|-------------|---------|-----------|
| `derived_from` | Synthesis was created from source | Downstream → upstream |
| `informed_by` | Artifact was influenced by synthesis | Downstream → upstream |
| `superseded` | New version replaces old | New → old |
| `related_to` | Soft association without derivation | Either direction |

Cross-fieldbook lineage is supported via `LineageReference` objects with availability tracking (`AVAILABLE`, `RESTRICTED`, `SNAPSHOT_ONLY`, `UNKNOWN`).

### Movement Events

Every governed action creates a movement event. Types:

`source_added`, `source_replaced`, `synthesis_recalibrated`, `artifact_checkpoint`, `artifact_major_update`, `lineage_changed`, `node_created`, `node_archived`

Filter buckets for the UI: `all`, `upstream`, `synthesis`, `artifacts`, `structural`.

Severity: `major` or `normal`, derived from event type or explicit annotation.

### Persistence

Currently: `data/data.json` (flat JSON file, read/write via `app/lib/db/`).

Future: Prisma schema defined for PostgreSQL (`prisma/schema.prisma`) with `Fieldbook`, `Node` (unified table with `node_type` discriminator), and `Edge` models. Not yet wired to runtime.

---

## 5. What Exists Today

### Web UI (Spine)

| Surface | Capabilities |
|---------|-------------|
| **Project list** (`/projects`) | Browse, create, rename, delete fieldbooks; sort/filter; share modal |
| **Workspace** (`/projects/[id]`) | Three-column spine: sources, working area, lineage |
| **Read-only mode** | `?readonly=true` hides editing; `?show=` filters visible panels |
| **Source management** | Manual add, external links, Google Drive import, transcript parsing (VTT/SRT/plain text) |
| **Editors** | TipTap/ProseMirror-based rich text for sources, syntheses, artifacts, decisions; slash commands, mentions, callouts, document references |
| **Version history** | View and restore previous versions |
| **Conflict resolution** | 409-based optimistic concurrency with resolution modal |
| **Export** | Download as `.docx`, `.txt`, or `.md` |
| **Lineage panel** | Visual upstream/downstream trace, external refs, calibration history |
| **Semantic pills** | Editable status, visibility, tags under each node title |
| **Collaboration** | Share modal, members API, invitation links, fork with anchor nodes and fork context |
| **Login** | Dev credentials, Google OAuth (NextAuth v5) |
| **Movement drawer** | UI exists but currently uses mock data (real events are persisted server-side via governance) |

### AI Capabilities

All AI routes use **gpt-4.1-mini** via **Portkey** gateway.

| Capability | What It Does |
|-----------|-------------|
| **Generate** | Creates synthesis or artifact content from sources; type-specific system prompts; returns TipTap JSON |
| **Streaming synthesis** | Real-time markdown synthesis with document-type awareness (PRD, RFC, summary, analysis) |
| **Overlap check** | Detects thematic overlap between a new source and existing syntheses |
| **Source ranking** | Scores and ranks sources by relevance to a given artifact type |
| **Condense** | Merges a new source into an existing synthesis while preserving key points |
| **Suggest adjustment** | Proposes downstream content changes when upstream evidence shifts (reverberation) |

Auto-synthesis flow: when a new source is added with content, the system checks for thematic overlap with existing syntheses and either merges into an existing synthesis or generates a new one.

### REST API v2 (governed, envelope-based)

All responses use `{ ok, data, meta }` or `{ ok, error }` envelope.

**Read:**
- `GET /api/v2/fieldbooks` — list fieldbooks
- `GET /api/v2/fieldbooks/:id` — single fieldbook with node summaries
- `GET /api/v2/fieldbooks/:id/nodes` — flat list of all nodes
- `GET /api/v2/fieldbooks/:id/nodes/:nodeId` — single node with content
- `GET /api/v2/fieldbooks/:id/lineage` — full graph (nodes + edges)
- `GET /api/v2/fieldbooks/:id/lineage/:nodeId?depth=1|full` — node subgraph
- `GET /api/v2/fieldbooks/:id/movements?type=&limit=&since=` — audit trail
- `GET /api/v2/catalog` — allowed enum values
- `GET /api/v2/search?q=&type=&status=&visibility=&tag=&limit=` — cross-fieldbook search

**Write (governed):**
- `POST /api/v2/fieldbooks/:id/nodes` — create source
- `POST /api/v2/fieldbooks/:id/syntheses` — create synthesis
- `POST /api/v2/fieldbooks/:id/artifacts` — create artifact
- `POST /api/v2/fieldbooks/:id/nodes/:nodeId/versions` — create new version
- `POST /api/v2/fieldbooks/:id/nodes/:nodeId/propose-recalibration` — propose recalibration

**Compile:**
- `POST /api/v2/fieldbooks/:id/compile` — compile node into agent-ready or human-ready output (JSON, markdown, lineage graph, or zip bundle)

All write endpoints accept `X-Actor` header for governance attribution.

### MCP Server (the agent's interface)

Agents connect via `@modelcontextprotocol/sdk` over stdio. Configuration:

```json
{
  "mcpServers": {
    "stacks": {
      "command": "bun",
      "args": ["run", "fieldbook/mcp/server.ts"]
    }
  }
}
```

**Resources (browsable, read-only):**

| URI | Content |
|-----|---------|
| `stacks://fieldbooks` | All fieldbooks with IDs, names, counts |
| `stacks://fieldbooks/{id}` | Single fieldbook summary with node IDs |
| `stacks://fieldbooks/{id}/nodes/{nodeId}` | Full node content and metadata |
| `stacks://catalog` | Type/status/visibility enums |

**Tools:**

| Tool | Type | Description |
|------|------|-------------|
| `search_stacks` | Read | Full-text search with status/visibility/tag/type filters |
| `list_nodes` | Read | All nodes in a fieldbook with metadata and relationships |
| `get_lineage` | Read | Upstream/downstream graph, configurable depth and direction |
| `get_context` | Compile | Rich context bundle: JSON, markdown, or lineage graph; scoped to artifact, 1-hop, or full chain; for human or agent audiences |
| `create_source` | Write | Add a new source (governed, emits movement event) |
| `propose_edit` | Write | Create a new version of any node (never overwrites canonical) |
| `propose_recalibration` | Write | Flag a node for recalibration with rationale (human reviews) |

### Compile Engine

Pure functions that transform lineage data into structured outputs:

| Format | Output | Use Case |
|--------|--------|----------|
| **JSON** (`context.json`) | Structured context: root node, upstream chain, downstream dependents, edges, optional agent task suggestions | Agent consumption |
| **Markdown** (`stack.md`) | Human-readable brief: title, derivation, content, source attributions, downstream list | Sharing, Claude Projects |
| **Lineage** (`lineage.json`) | Nodes + edges graph with counts | Graph analysis |
| **Bundle** (`.zip`) | All of the above + `catalog.json` + `README.md` | Portable handoff |

Scopes: `artifact` (node only), `lineage-1` (1 hop upstream), `lineage-full` (entire chain).

Targets: `human` (brief), `agent` (context + task suggestions), `both`.

### Lineage Walker

Recursive BFS-style graph traversal with cycle protection. Supports configurable depth (number or `full`) and direction (`upstream`, `downstream`, `both`). Operates on implicit edges derived from `derivedFrom` / `informedBy` arrays.

---

## 6. Connectors and Integrations

### Active

| Connector | Status | Details |
|-----------|--------|---------|
| **MCP Server** (stdio) | Built | Full read/write/compile for Claude Desktop, Cursor, and custom agents |
| **REST API v2** | Built | HTTP interface for UI, tools, and HTTP-preferring agents |
| **Google Drive** | Built | `POST /api/integrations/google-drive/document` — import Google Docs as plain text; UI picker in source editor |
| **Portkey AI Gateway** | Built | All AI routes proxy through Portkey to OpenAI (gpt-4.1-mini); supports virtual keys and routing |
| **NextAuth** | Built | Google OAuth + dev credentials provider; `api/auth/[...nextauth]` |
| **Figma Bridge** | Configured | `TalkToFigma` MCP server configured in `.cursor/mcp.json`; bidirectional Cursor-to-Figma via plugin; used for prototyping, not deep integration |

### Planned / Not Yet Built

| Connector | Intent | Priority |
|-----------|--------|----------|
| **`create_source_from_url`** | Fetch a URL, extract text, create a source automatically | Medium |
| **`create_source_from_transcript`** | Expose existing `transcript-parser.ts` as an MCP tool for meeting transcript ingestion | Medium |
| **`sync_from_claude_project`** | Pull conversation artifacts, decisions, and insights from Claude Projects back into Stacks as sources | Low |
| **Claude Projects export** | Compiled markdown dump that keeps Claude's knowledge base current with fieldbook state | Medium |
| **Slack ingestion** | Passive source capture from Slack threads (source type `slack_thread` exists in catalog but no connector) | Future |
| **Email ingestion** | Capture email threads as sources (source type `email` exists in catalog but no connector) | Future |
| **Webhook / event push** | Emit events when sources or syntheses change for external consumers | Future |

---

## 7. Vera — The Agent Layer

Vera is the agent persona that turns Stacks from a passive evidence store into an active partner. A Claude instance that monitors evidence, synthesizes patterns, generates artifacts, and proposes recalibrations — all governed by the same trust model that prevents silent mutation of canonical content.

### What Already Exists for Vera

**MCP server with full read/write/compile.** Claude and Cursor already connect via MCP. The agent can read all fieldbooks, nodes, lineage, and search; create sources; propose edits (versioned, never overwrite); propose recalibrations; compile context bundles.

**Governance layer.** Trust model is correct for Vera: agents cannot promote to `canonical` or `client_facing`; agent edits create new versions; every mutation emits a movement event with actor attribution; recalibrations are proposals.

**Reverberation.** Token-based propagation + AI-suggested adjustments exist for downstream impact.

### What's Missing

**1. `create_synthesis` and `create_artifact` as MCP tools** — The governance functions (`guardedCreateSynthesis`, `guardedCreateArtifact`) exist. REST v2 POST routes exist. But MCP write tools only expose `create_source`, `propose_edit`, and `propose_recalibration`. This is the single biggest gap. Without it, an agent can ingest evidence but cannot produce the artifacts.

**2. A `generate_artifact` compound MCP tool** — Combines: read syntheses, compile context, call the LLM, write result as governed artifact. This is the core Vera loop:

```
Sources → (human curates) → Syntheses → (Vera generates) → Artifact (draft)
                                                              ↓
                                                    Human reviews → canonical
```

**3. A `check_staleness` MCP tool** — Scans syntheses/artifacts, compares against upstream `updatedAt` timestamps, returns nodes that may need recalibration. Currently everything is pull-based — the agent must be asked.

**4. Watch/trigger mechanism** — Options: file watcher on `data.json`, a webhook endpoint that emits events on change, or a polling-based staleness check.

**5. Movement drawer wired to real data** — The UI movement drawer still uses mock events. Real movement events are persisted server-side via governance and queryable via `GET /api/v2/.../movements`, but the spine hasn't been wired to consume them yet.

### Build Priority

1. **Expose `create_synthesis` and `create_artifact` as MCP tools** — unlocks the entire generation loop
2. **Add `check_staleness` tool** — gives Vera something to react to
3. **Add `generate_artifact` compound tool** — the "Vera, produce the architecture doc" command
4. **Wire movement drawer to real events** — close the human-side feedback loop
5. **Add `create_source_from_transcript`** — frictionless meeting ingestion
6. **Export to Claude Projects** — compiled markdown dump for persistent agent context

Items 1-2 make Vera functional. Items 3-6 make it autonomous.

---

## 8. Surfaces Not Yet Wired

| Surface | Status | Details |
|---------|--------|---------|
| **Canvas view** | Component exists, not routed | React Flow graph canvas with document nodes, inspector, derived doc editor (`app/components/canvas/`). No page route points to it. |
| **Prisma / PostgreSQL** | Schema defined, not wired | `prisma/schema.prisma` models Fieldbook/Node/Edge for Postgres. Runtime uses JSON file persistence. |
| **Vercel AI SDK** | Packages installed, not imported | `ai` and `@ai-sdk/openai` are in `package.json` but unused in application code. |
| **Movement drawer (real data)** | Backend ready, UI uses mocks | `GET /api/v2/.../movements` returns real governed events; spine still renders `MOCK_MOVEMENT_EVENTS`. |

---

## 9. AI Guardrails

1. **AI proposes, never commits** — Humans confirm, supersede, or reject
2. **All synthesis is cited** — Every AI-generated insight traces back to source material
3. **AI amplifies understanding** — It does not replace human judgment or erase context
4. **Semantic downgrades enforced** — Agent-created content starts at lower visibility/status until a human promotes it
5. **Versioned, not overwritten** — Agent edits create new versions linked to originals; canonical content is immutable to agents

---

## 10. Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js (App Router, Turbopack) |
| Runtime | Bun |
| UI | React, Tailwind CSS |
| Editor | TipTap (ProseMirror-based) |
| Graph visualization | React Flow (canvas view, not yet routed) |
| Auth | NextAuth v5 (Google OAuth + credentials) |
| AI | OpenAI (gpt-4.1-mini) via Portkey gateway |
| Persistence | JSON file (`data/data.json`); Prisma/PostgreSQL defined but not wired |
| Agent protocol | MCP (`@modelcontextprotocol/sdk`, stdio transport) |
| Validation | Zod |
| Export | JSZip (bundle generation) |

---

## 11. Key Principles Summary

| Principle | Implication |
|-----------|-------------|
| Lineage-first | Relationships between artifacts matter more than the artifacts themselves |
| Passive capture | Reduce documentation tax through AI-proposed lineage with human confirmation |
| Tool-agnostic | Respect external tools, preserve snapshots, don't force migration |
| Evolution over status | Reveal how work evolved, not where it stands in a process |
| Intent preservation | The "why" is as important as the "what" |
| Human authority | AI assists, humans decide |

---

*Stacks is not the next productivity product. It is infrastructure for how modern, AI-accelerated teams reason over time.*
