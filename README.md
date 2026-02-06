# Stacks

> A lineage-first system for how teams think, decide, and evolve work in the AI era

## What is Stacks?

Stacks is not a traditional productivity product. It is an ecosystem designed for the current and future state of work, where AI accelerates creation but human understanding and decision memory become the constraint.

**Core design choice:** Stacks does not ask teams to do their work inside a new tool. It brings shared lineage to where work is already happening.

## Core Concepts

### Fieldbooks
Long-lived, forkable lineage graphs that preserve how decisions, assumptions, artifacts, and outcomes relate over time. Fieldbooks are not phases or workspaces—they are records of evolution.

### The Spine Layout
A three-column interface for working with research and synthesis:
- **Sources** — Raw inputs (interviews, documents, notes, data)
- **Syntheses** — Condensed interpretations derived from sources
- **Artifacts** — Generated outputs (decision briefs, opportunity maps, playbooks)

### Reverberation
When upstream sources change, downstream syntheses and artifacts are automatically flagged for review. AI suggests what might need updating, but humans decide.

## Getting Started

### Prerequisites
- Node.js 18+
- pnpm

### Installation

```bash
cd fieldbook
pnpm install
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
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
fieldbook/
├── app/
│   ├── api/                    # API routes
│   │   ├── ai/                 # AI generation endpoints
│   │   └── db/                 # Database CRUD operations
│   ├── components/
│   │   ├── editor/             # TipTap document editor
│   │   └── spine/              # Spine layout components
│   ├── hooks/                  # React hooks
│   └── lib/
│       ├── blocks/             # Document format converters
│       ├── db/                 # JSON database layer
│       └── reverberation.ts    # Change propagation logic
├── data/
│   └── data.json               # Local JSON database
└── stacks-principles.md        # Product principles & guardrails
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

## What Stacks Is NOT

- Project management
- Task or sprint tracking
- Real-time collaboration (Google-style)
- A document editor replacement
- A Jira, Asana, or Notion competitor

**If a feature helps control work, it is out of scope. If it helps understand work, it is aligned.**

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Editor:** TipTap (ProseMirror-based)
- **Styling:** Tailwind CSS
- **AI Gateway:** Portkey
- **Database:** JSON file (demo/prototype)

## Documentation

- [Stacks Principles](./fieldbook/stacks-principles.md) — Product intent and guardrails

## License

Proprietary - Sparq
