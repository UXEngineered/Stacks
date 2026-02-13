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
| `search_stacks` | Full-text search across all fieldbooks |
| `list_nodes` | List all nodes in a fieldbook |
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
│       ├── compile/            # Compile engine (context, markdown, lineage, bundle)
│       ├── db/                 # JSON database layer
│       ├── lineage/            # Recursive lineage walker
│       ├── movement/           # Movement event types
│       └── governance.ts       # Actor-based mutation guard
├── mcp/
│   ├── server.ts               # MCP server entry point (stdio)
│   ├── resources/              # Browsable MCP resources
│   └── tools/                  # MCP tools (read, compile, write)
├── data/
│   └── data.json               # Local JSON database
└── docs/
    └── plan-agentic-api.md     # Architecture plan for API + MCP
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
- [Stacks Principles](./fieldbook/stacks-principles.md) — Product intent and guardrails

## License

Proprietary - Sparq
