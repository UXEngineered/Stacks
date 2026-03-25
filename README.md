# Stacks

> The human interface for agent-generated work

## What is Stacks?

Stacks is the place where humans see, evaluate, and govern what AI agents produce. Agents do the heavy lifting — ingesting evidence, synthesizing patterns, generating artifacts — but every output flows through Stacks where people can inspect lineage, judge quality, and decide what becomes canonical.

The UI is not where work gets done. It's where work gets understood.

Agents operate through the MCP server and REST API. They create sources, synthesize insights, draft architecture docs, roadmaps, and backlogs. Stacks gives humans the interface to see what the agent did, why it did it, what evidence it drew from, and whether to trust the result.

## The Model

```
Agents produce  →  Stacks organizes  →  Humans govern
```

Every piece of content in Stacks has **lineage** — a traceable chain from raw evidence through synthesis to final artifact. When an agent generates a roadmap, you can trace it back through the syntheses it drew from, down to the original interview transcripts, documents, and decisions that informed it. Nothing is opaque.

## Core Concepts

### Fieldbooks
Long-lived, forkable lineage graphs that preserve how decisions, assumptions, artifacts, and outcomes relate over time. A fieldbook is not a project workspace — it's the evidence record for how understanding evolved.

### The Spine
A three-column layout designed for tracing agent output back to its origins:
- **Sources** — Raw inputs agents ingest: interviews, transcripts, documents, meeting notes, external links
- **Syntheses** — Patterns and insights the agent (or human) derives from sources
- **Artifacts** — The deliverables: architecture docs, roadmaps, backlogs, cost models, decision records

Each column is a layer of refinement. Read left to right to see how raw evidence becomes a finished artifact. Read right to left to audit why an artifact says what it says.

### Governance
The trust boundary between agent and human:
- Agents can create freely, but everything starts as `draft` or `proposed` — never `canonical`
- Agent edits create new versions; they never overwrite human-approved content
- Recalibrations are proposals with rationale, not silent rewrites
- Every agent action emits a **movement event** — a permanent audit record of what changed, who did it, and why

### Semantic Layer
Every node carries metadata that controls how it flows through the system:
- **Status** — `draft` | `proposed` | `canonical` | `superseded`
- **Visibility** — `internal` | `client_shareable` | `client_facing`
- **Tags** — Freeform classification
- **Owner** — Accountability
- **Type** — Catalog-defined per category (e.g., `pattern`, `theme`, `tension` for syntheses)

A central catalog (`config/catalog.json`) defines all allowed values. Agents are constrained by the same catalog humans use.

### Reverberation
When upstream evidence changes, downstream syntheses and artifacts are automatically flagged. AI suggests what might need updating, but humans decide whether to accept, modify, or ignore.

## Getting Started

### Prerequisites
- [Bun](https://bun.sh/) (recommended) or Node.js 18+

### Installation

```bash
cd fieldbook
bun install
```

### Environment Setup

Create a `.env.local` file in the `fieldbook` directory:

```env
# Portkey AI Gateway (for AI features)
PORTKEY_API_KEY=your-portkey-api-key
PORTKEY_VIRTUAL_KEY=your-virtual-key-slug

# NextAuth (for authentication - optional for local dev)
NEXTAUTH_SECRET=your-secret
NEXTAUTH_URL=http://localhost:3000
```

### Running Locally

```bash
cd fieldbook
bun dev
```

Open [http://localhost:3000](http://localhost:3000)

## API

REST API (`/api/v2/`) for programmatic access — used by the UI, integrations, and agents that prefer HTTP over MCP. Standard envelope (`{ ok, data, meta }` or `{ ok, error }`).

### Read
- `GET /api/v2/fieldbooks` — list fieldbooks
- `GET /api/v2/fieldbooks/:id` — single fieldbook with node summaries
- `GET /api/v2/fieldbooks/:id/nodes` — all nodes (flat list)
- `GET /api/v2/fieldbooks/:id/nodes/:nodeId` — single node with content
- `GET /api/v2/fieldbooks/:id/lineage` — full graph (nodes + edges)
- `GET /api/v2/fieldbooks/:id/lineage/:nodeId?depth=1|full` — node subgraph

### Catalog
- `GET /api/v2/catalog` — returns all allowed enum values (source types, synthesis types, artifact types, statuses, visibilities)

### Search
- `GET /api/v2/search?q=<query>&type=<source|synthesis|artifact|all>&status=<status>&visibility=<vis>&tag=<tag>&limit=<n>` — full-text search across all fieldbooks, with optional semantic filters

### Movement History
- `GET /api/v2/fieldbooks/:id/movements?type=<filter>&limit=<n>&since=<ISO>` — audit trail of significant events
  - **type**: `all` | `upstream` | `synthesis` | `artifacts` | `structural`
  - Tracks every governed action: source additions, recalibration proposals, agent writes, and more

### Write (governed)
- `POST /api/v2/fieldbooks/:id/nodes` — create a source
- `POST /api/v2/fieldbooks/:id/nodes/:nodeId/versions` — create a new version
- `POST /api/v2/fieldbooks/:id/nodes/:nodeId/propose-recalibration` — propose recalibration

All write endpoints accept an `X-Actor` header (`user:<id>` or `agent:<id>:<name>`) to identify the caller. Agent actors are subject to governance rules.

### Compile
- `POST /api/v2/fieldbooks/:id/compile` — compile a node into agent-ready or human-ready output

Request body: `{ nodeId, target, scope, format }`
- **target**: `"human"` | `"agent"` | `"both"`
- **scope**: `"artifact"` | `"lineage-1"` | `"lineage-full"`
- **format**: `"json"` | `"markdown"` | `"lineage"` | `"bundle"`

See [docs/plan-agentic-api.md](./docs/plan-agentic-api.md) for full architecture details.

## MCP Server (the agent's interface)

The MCP server is how agents interact with Stacks. While humans use the web UI, agents connect via MCP to read evidence, create content, compile context, and propose changes — all governed by the same trust rules.

### Running the MCP server

```bash
cd fieldbook
bun run mcp/server.ts
```

### Connecting to Claude Desktop or Cursor

Add to your MCP configuration:

```json
{
  "mcpServers": {
    "stacks": {
      "command": "bun",
      "args": ["run", "/path/to/fieldbook/mcp/server.ts"]
    }
  }
}
```

### Available tools

| Tool | Description |
|------|-------------|
| `search_stacks` | Full-text search with optional status/visibility/tag filters |
| `list_nodes` | List all nodes with semantic metadata |
| `get_lineage` | Get upstream/downstream graph for a node |
| `get_context` | Compile a rich context bundle (the core agent tool) |
| `create_source` | Add a new source (governed) |
| `propose_edit` | Create a new version of a node (never overwrites canonical) |
| `propose_recalibration` | Propose recalibration with rationale (human reviews) |

## Project Structure

```
fieldbook/
├── app/
│   ├── api/
│   │   ├── ai/                 # AI generation endpoints
│   │   ├── db/                 # Legacy database CRUD
│   │   ├── v1/                 # Phase 0 API
│   │   └── v2/                 # API v2 (current — read, write, compile)
│   ├── components/
│   │   ├── editor/             # TipTap document editor
│   │   └── spine/              # Spine layout components
│   ├── hooks/                  # React hooks
│   └── lib/
│       ├── api/                # Response envelope + actor parsing
│       ├── blocks/             # Document format converters
│       ├── catalog.ts          # Catalog config loader + validation helpers
│       ├── compile/            # Compile engine (context, markdown, lineage, bundle)
│       ├── db/                 # JSON database layer + types
│       ├── lineage/            # Recursive lineage walker
│       ├── movement/           # Movement event types
│       ├── search.ts           # Full-text search (shared core)
│       └── governance.ts       # Actor-based mutation guard + semantic enforcement
├── config/
│   └── catalog.json            # Allowed enum values for types, statuses, visibilities
├── scripts/
│   └── migrate-semantics.ts    # One-time migration for semantic fields
├── mcp/
│   ├── server.ts               # MCP server entry point (stdio)
│   ├── resources/              # Browsable MCP resources (incl. catalog)
│   └── tools/                  # MCP tools (read, compile, write)
├── data/
│   └── data.json               # Local JSON database
└── docs/
    ├── plan-agentic-api.md     # Architecture plan for API + MCP
    └── plan-semantics.md       # Semantic layer plan
```

## What Humans Do Here

- **Review agent output** — read what was generated, trace it to evidence, decide if it's right
- **Promote or reject** — move drafts to canonical, or flag them for recalibration
- **Curate sources** — add, organize, and annotate the evidence that agents draw from
- **Follow the trail** — every artifact links back through syntheses to raw sources; nothing is a black box
- **Monitor movement** — see a chronological feed of every agent action across the fieldbook

## What Stacks Is NOT

- A place where humans do the writing (agents do that)
- Project management or task tracking
- Real-time collaboration (Google-style)
- A document editor replacement
- A Jira, Asana, or Notion competitor

**Stacks is not where work gets done. It's where work gets understood and trusted.**

## Tech Stack

- **Framework:** Next.js (App Router)
- **Runtime:** Bun
- **Editor:** TipTap (ProseMirror-based)
- **Styling:** Tailwind CSS
- **AI Gateway:** Portkey
- **MCP SDK:** @modelcontextprotocol/sdk
- **Database:** JSON file (demo/prototype)

## Documentation

- [Architecture Plan — API + MCP](./docs/plan-agentic-api.md) — Full design for the agentic layer
- [Semantic Layer Plan](./docs/plan-semantics.md) — Semantic metadata design
- [Stacks Principles](./fieldbook/stacks-principles.md) — Product intent and guardrails

## Next Steps — Vera (Verified Evidence-Ready Artifacts)

Vera is the agent layer that turns Stacks from a passive evidence store into an active partner. A Claude instance that monitors evidence, synthesizes patterns, generates artifacts, and proposes recalibrations — all governed by the same trust model that prevents silent mutation of canonical content.

### What Already Exists

**MCP server with full read/write/compile.** Claude Code and Cursor already connect to `stacks` via MCP. The agent can:
- Read all fieldbooks, nodes, lineage, and search across everything
- Create sources (ingesting evidence)
- Propose edits to any node (creates a version, never overwrites canonical)
- Propose recalibrations (rationale + optional new content, for human review)
- Compile context bundles (JSON, markdown, lineage) scoped to any node

**Governance layer.** The trust model is already correct for Vera:
- Agents can't promote to `canonical` or `client_facing` — always downgraded
- Agent edits create new versions, never overwrite
- Every mutation emits a movement event with actor attribution
- Recalibrations are proposals, not auto-applied

**Reverberation.** Token-based propagation + AI-suggested adjustments already exist for downstream impact.

### What's Missing

**1. Create Synthesis + Create Artifact via MCP**
The MCP write tools only expose `create_source`, `propose_edit`, and `propose_recalibration`. But `guardedCreateSynthesis` and `guardedCreateArtifact` already exist in the governance layer — they just aren't registered as MCP tools. This is the single biggest gap. Without it, Claude can ingest evidence but can't produce the artifacts.

**2. A "Generate Artifact from Syntheses" MCP Tool**
The AI generation routes (`/api/ai/generate`, `/api/ai/synthesize`) live as HTTP endpoints. A Vera-oriented tool would combine: read syntheses → compile context → call the LLM → write the result as a governed artifact. This is the core Vera loop:

```
Sources → (human curates) → Syntheses → (Vera generates) → Artifact (draft)
                                                              ↓
                                                    Human reviews → canonical
```

**3. A Watch/Trigger Mechanism**
Everything is currently pull-based — Claude has to be asked. For Vera to "monitor," options include:
- **Webhook/polling on data.json changes** — a file watcher or API endpoint that emits events when sources or syntheses change
- **A `check_staleness` MCP tool** — scans all syntheses/artifacts, compares them against upstream `updatedAt` timestamps, returns nodes that may need recalibration
- **Claude Projects integration** — export a compiled markdown snapshot to a Claude Project's knowledge base via API or file sync

**4. Ingestion from External Sources**
- **`create_source_from_url`** — fetch a URL, extract text, create a source
- **`sync_from_claude_project`** — pull conversation artifacts, decisions, and insights back into Stacks as sources
- **`create_source_from_transcript`** — expose the existing `transcript-parser.ts` as an MCP tool for meeting transcript ingestion

**5. Artifact Type-Specific Generation**
The `/api/ai/generate` route already has type-specific prompts for architecture docs, roadmaps, PRDs, etc. Wrapping these as MCP tools with `informedBy` linkage gives Vera the ability to say: "Based on these 4 syntheses, here's a draft architecture document" — and it lands in Stacks as a governed artifact with full lineage.

### The Vera Loop

```
┌─────────────────────────────────────────────────────────┐
│                    HUMAN WORLD                           │
│  Conversations, meetings, docs, Claude Projects chats   │
└────────────────────────┬────────────────────────────────┘
                         │ (sources flow in)
                         ▼
┌─────────────────────────────────────────────────────────┐
│                 STACKS (fieldbook)                        │
│                                                          │
│  Sources ──→ Syntheses ──→ Artifacts                     │
│     ▲            ▲              ▲                        │
│     │            │              │                        │
│  create_source   │         create_artifact               │
│  (Vera ingests)  │         (Vera generates)              │
│                  │                                        │
│           create_synthesis                                │
│           (Vera synthesizes)                              │
│                                                          │
│  Governance: all agent writes → draft/proposed            │
│  Movement: full audit trail of every Vera action          │
│  Reverberation: upstream changes propagate downstream     │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│                 VERA (Claude agent)                       │
│                                                          │
│  Via MCP:                                                │
│  1. Monitors for new/changed sources (check_staleness)   │
│  2. Synthesizes patterns across sources                  │
│  3. Generates artifacts (arch, roadmap, backlog, cost)   │
│  4. Proposes recalibrations when evidence shifts          │
│  5. Never promotes to canonical — humans decide           │
└─────────────────────────────────────────────────────────┘
```

### Build Priority

1. **Expose `create_synthesis` and `create_artifact` as MCP tools** — unlocks the entire generation loop
2. **Add a `check_staleness` tool** — gives Vera something to react to
3. **Add a `generate_artifact` tool** — combines compile + LLM + governed create; the "Vera, produce the architecture doc" command
4. **Add `create_source_from_transcript`** — frictionless ingestion from meetings
5. **Export to Claude Projects** — compiled markdown dump that keeps Claude's knowledge base current

Items 1–2 make Vera functional today. Items 3–5 make it autonomous.

## License

Proprietary - Sparq
