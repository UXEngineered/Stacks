# Stacks

> A lineage-first system for how teams think, decide, and evolve work in the AI era

## What is Stacks?

Stacks is not a traditional productivity product. It is an ecosystem designed for the current and future state of work, where AI accelerates creation but human understanding and decision memory become the constraint.

**Core design choice:** Stacks does not ask teams to do their work inside a new tool. It brings shared lineage to where work is already happening — through an API and MCP server that make Stacks content consumable by agents, internal tools, and future UIs.

## Core Concepts

### Fieldbooks
Long-lived, forkable lineage graphs that preserve how decisions, assumptions, artifacts, and outcomes relate over time. Fieldbooks are not phases or workspaces — they are records of evolution.

### The Spine Layout
A three-column interface for working with research and synthesis:
- **Sources** — Raw inputs (interviews, documents, notes, data)
- **Syntheses** — Condensed interpretations derived from sources
- **Artifacts** — Generated outputs (decision briefs, opportunity maps, playbooks)

### Semantic Layer
Every node carries semantic metadata for classification and governance:
- **Status** — `draft` | `proposed` | `canonical` | `superseded` (unified across all types)
- **Visibility** — `internal` | `client_shareable` | `client_facing`
- **Tags** — Freeform classification
- **Owner** — Accountability
- **Type** — Catalog-defined enum per node category (e.g., `pattern`, `theme`, `tension` for syntheses)

A central catalog (`config/catalog.json`) defines all allowed enum values. The UI shows editable pill chips, left-nav badges, and a right-rail metadata section.

### Reverberation
When upstream sources change, downstream syntheses and artifacts are automatically flagged for review. AI suggests what might need updating, but humans decide.

### Governance
Agents can read everything, create new content, and propose changes — but they cannot silently mutate canonical content. Edits by agents create new versions. Recalibrations are proposals, not auto-applied. Every agent action emits a movement event for human review.

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

Stacks exposes a versioned REST API (`/api/v2/`) for programmatic access. All responses use a standard envelope (`{ ok, data, meta }` or `{ ok, error }`).

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

## MCP Server

Stacks includes an MCP (Model Context Protocol) server that makes fieldbook content natively accessible to AI tools like Claude Desktop, Cursor, and Windsurf.

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

## Key Features

### AI-Assisted Generation
- Synthesize insights from multiple sources
- Generate structured artifacts (decision briefs, opportunity maps, etc.)
- AI proposes, humans confirm

### Calibration Alerts
When sources change, affected items show contextual AI suggestions:
> "Marcus Webb updated his stance on technical debt. Would you like me to rewrite the 'Control Costs' section to reflect this?"

### Calibration History
Track all calibration decisions (ignored vs. changed) in a toggleable history panel.

### Agent-Ready Compile
Export any node as structured JSON (for agents), human-readable markdown, a lineage graph, or a zip bundle containing all three — from the UI or via API.

## What Stacks Is NOT

- Project management
- Task or sprint tracking
- Real-time collaboration (Google-style)
- A document editor replacement
- A Jira, Asana, or Notion competitor

**If a feature helps control work, it is out of scope. If it helps understand work, it is aligned.**

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
