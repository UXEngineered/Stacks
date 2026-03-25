# Stacks — Feature Reference

Everything the application can do today, organized by surface area.

---

## Navigation & Layout

- **Project list** (`/projects`) — browse, create, rename, delete fieldbooks; sort and filter; share modal
- **Workspace** (`/projects/[id]`) — three-column "spine" layout: Sources (left), Working Area (center), Lineage (right)
- **Read-only mode** — query param `?readonly=true` hides editing controls; `?show=sources,syntheses,artifacts` filters visible panels
- **Global nav** — breadcrumbs, project rename inline, share, fork, movement drawer, user menu
- **Login** — dev credentials sign-in, Google OAuth when configured; branded with animated dithered torus

---

## Core Data Model

Every fieldbook contains three primary entity types connected by lineage:


| Entity        | Purpose                                                | Key fields                                      |
| ------------- | ------------------------------------------------------ | ----------------------------------------------- |
| **Source**    | Raw evidence — interviews, articles, data, transcripts | `type`, `content`, `external_link`, `metadata`  |
| **Synthesis** | Derived insight — analysis built from sources          | `derivedFrom` (source ids), `content`, `type`   |
| **Artifact**  | Deliverable — PRD, architecture doc, decision record   | `informedBy` (synthesis ids), `content`, `type` |


Each entity carries **semantic fields**: `status`, `visibility`, `tags`, `owner`.

Additionally:

- **Captures** — lightweight Phase 0-style notes, links, and files
- **Facts** — reverberation token map for template-driven propagation
- **Calibration history** — audit trail of recalibration decisions
- **Lineage references** — cross-fieldbook upstream links

---

## Source Management

- **Add sources** manually with title and content
- **External links** — attach URLs via the Add Link modal
- **Google Drive import** — pick documents from Drive (requires Google API keys)
- **Transcript parsing** — VTT, SRT, and plain text transcript ingestion
- **Thematic overlap detection** — AI checks new sources against existing syntheses before adding; surfaces matches in an overlap modal
- **Source ranking** — AI ranks sources by relevance to a given artifact type

---

## Editors

- **Source editor** — rich text editing, external link attachment, Google Drive picker, semantic pills (status, visibility, tags)
- **Synthesis editor** — rich text with `derivedFrom` source linking, AI-assisted generation
- **Artifact editor** — rich text with `informedBy` synthesis linking, type-specific templates
- **Decision editor** — structured decision capture
- **Document editor** (shared) — TipTap/ProseMirror-based; slash commands, mention autocomplete, toolbar, callout blocks, document references
- **Version history** — view and restore previous versions
- **Conflict resolution** — 409-based optimistic concurrency with resolution modal
- **Save status indicator** — real-time save state feedback
- **Export** — download as `.docx`, `.txt`, or `.md`

---

## Lineage & Graph

- **Lineage panel** — visual upstream/downstream trace for the selected node
- **Graph walker** — depth-limited, cycle-safe traversal of source → synthesis → artifact chains
- **Cross-fieldbook lineage** — `lineageReferences` link nodes to entities in other fieldbooks
- **Timeline view** (v1 API) — ordered event stream across a fieldbook's history
- **Full graph export** (v1 API) — all nodes and edges as a graph structure

---

## Reverberation (Propagation)

- **Token-based templates** — syntheses and artifacts can contain `{{FACT_NAME}}` tokens tied to the fieldbook's fact map
- **Deterministic rendering** — changing a fact re-renders all templates that reference it
- **Diff generation** — before/after comparison when facts change
- **AI-suggested adjustments** — after deterministic propagation, optionally generates AI suggestions for how downstream content should adapt
- **Recalibration status** — nodes track whether they're `current`, `stale`, or `recalibrating`
- **Calibration history** — full audit trail of recalibration decisions and diffs

---

## AI Capabilities

All AI routes use **gpt-4.1-mini** via **Portkey**.


| Capability              | What it does                                                                                                                                   |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| **Generate**            | Creates synthesis or artifact content from sources; type-specific system prompts (PRD, RFC, summary, analysis); returns TipTap-structured JSON |
| **Streaming synthesis** | Real-time markdown synthesis generation with document-type awareness                                                                           |
| **Overlap check**       | Detects thematic overlap between a new source and existing syntheses                                                                           |
| **Source ranking**      | Scores and ranks sources by relevance to a given task or artifact type                                                                         |
| **Condense**            | Shortens synthesis content while preserving key points                                                                                         |
| **Suggest adjustment**  | Proposes downstream content changes when upstream evidence shifts                                                                              |
| **Propagation AI**      | Fills `aiSuggestion` on diffs after deterministic reverberation runs                                                                           |


---

## Governance

- **Actor-aware writes** — all mutations track whether the actor is `user`, `agent`, or `mcp`
- **Semantic downgrades** — agent-created content starts at lower visibility/status until a human promotes it
- **Movement events** — every significant change (create, edit, recalibrate, fork) generates a movement event
- **Movement drawer** — chronological activity feed in the UI
- **Versioned edits** (v2) — propose and version node content with governance checks
- **Recalibration proposals** (v2) — structured proposals for updating stale nodes

---

## Collaboration

- **Share modal** — invite collaborators to a fieldbook
- **Members API** — add, list, remove members
- **Invitations** — generate and accept invitation links
- **Presence** — real-time indicator of who's currently viewing a fieldbook
- **Fork** — create a new fieldbook from an existing one with optional anchor nodes and fork context

---

## MCP Server (Agent Interface)

The `stacks` MCP server exposes fieldbook data and operations to external AI agents via stdio.

**Resources** (read-only):

- `stacks://fieldbooks` — list all fieldbooks
- `stacks://fieldbooks/{id}` — fieldbook summary with node IDs
- `stacks://fieldbooks/{id}/nodes/{nodeId}` — full node detail
- `stacks://catalog` — allowed type/status/visibility enums

**Tools** (read):

- `search_stacks` — full-text search across fieldbooks
- `list_nodes` — list nodes in a fieldbook with optional type filter
- `get_lineage` — upstream/downstream lineage for a node

**Tools** (write, governance-wrapped):

- `create_source` — add a new source
- `propose_edit` — suggest an edit to an existing node
- `propose_recalibration` — flag a node as needing recalibration with rationale

**Tools** (compile):

- `get_context` — compile a context bundle (JSON, markdown, or lineage) scoped to a target node; supports human and agent audiences

---

## API Surface

### Primary persistence — `/api/db/fieldbooks/...`

Full CRUD for fieldbooks, sources, syntheses, artifacts, and captures. Backed by `data/data.json`.

### Phase 0 graph API — `/api/v1/fieldbooks/...`

Graph-oriented API with nodes, edges, relationships, timeline, search, and fork. Backed by `data/phase0.json`.

### Governed / envelope API — `/api/v2/fieldbooks/...`

Versioned nodes, recalibration proposals, compiled context bundles, lineage, movements, catalog, and cross-fieldbook search. Structured `{ ok, data, meta }` response envelope.

### AI — `/api/ai/...`

Generate, synthesize (streaming), check-overlap, rank-sources, condense-synthesis, suggest-adjustment.

### Auth — `/api/auth/[...nextauth]`

NextAuth v5 handlers; Google OAuth + dev credentials provider.

### Documents — `/api/documents/...`

In-memory versioned document store with conflict detection, version history, search, and restore.

### Integrations — `/api/integrations/...`

Google Drive document import hook.

---

## Tech Stack


| Layer          | Technology                                           |
| -------------- | ---------------------------------------------------- |
| Framework      | Next.js 16 (App Router, Turbopack)                   |
| UI             | React 19, Tailwind CSS 4                             |
| Editor         | TipTap / ProseMirror                                 |
| Graph viz      | React Flow (canvas view)                             |
| Auth           | NextAuth v5 (Google OAuth + credentials)             |
| AI             | OpenAI (gpt-4.1-mini) via Portkey gateway            |
| Persistence    | JSON files (`data/data.json`, `data/phase0.json`)    |
| Agent protocol | MCP (`@modelcontextprotocol/sdk`, stdio)             |
| Validation     | Zod 4                                                |
| Export         | JSZip (docx generation)                              |
| Future DB      | Prisma schema defined for PostgreSQL (not yet wired) |


---

## Surfaces Not Yet Wired

- **Canvas view** (`app/components/canvas/`) — React Flow graph canvas with document nodes, inspector, and derived doc editor. Component exists but is not routed from any page.
- **Prisma / PostgreSQL** — schema defined in `prisma/schema.prisma` but runtime uses JSON file persistence.
- **Vercel AI SDK** — `ai` and `@ai-sdk/openai` packages are installed but not imported in application code.

