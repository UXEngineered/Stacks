# Changelog

All notable changes to the Stacks Fieldbook project.

---

## [Unreleased] - phase0/demo-readiness

### UI/UX Improvements

- **Fieldbook list sorting**: Fieldbooks now sorted by most recently updated (descending)
- **Relative timestamps**: Added "last updated X ago" display next to fieldbook titles on homepage
- **Required fieldbook titles**: New fieldbooks now require a title - "Untitled" is not accepted, input auto-focuses on creation
- **Simplified search input**: Removed inner border styling, search now fills entire container area
- **Consistent empty states**: All placeholder text now uses same styling (`text-xs`, italic, `#737373`)
  - Changed "No sources yet" → "No sources" (and similar for syntheses, artifacts, decisions)
  - Content area shows "Nothing selected"
  - Lineage panel shows "Nothing selected", "No upstream items", "No downstream items"

### Right Panel Redesign

- **Tabbed interface**: Right panel now toggles between "Lineage" and "Changes" tabs
- **Tab styling**: Uses pill-style toggle matching ShareModal design
- **Node-specific change tracking**: Changes tab only shows calibration decisions for the currently selected item (no longer global)
- **Indicator dot**: Only appears on Changes tab when selected item has tracked changes
- **Removed**: Standalone FAB button and slide-out drawer for change tracking

---

## [Previous] - phase0/modal-work

### Auto-Synthesize Feature

- **Toggle control**: Added "Auto-synthesize" toggle to source creation screen (left of Discard button)
- **Background synthesis**: When enabled, saving a source automatically triggers AI synthesis in background
- **Generating state**: New synthesis appears in sidebar with spinning indicator while generating
- **Draft status**: Auto-generated syntheses have "Draft" badge and require user action

### Draft Synthesis Workflow

- **Draft banner**: Auto-generated syntheses show commit/discard banner at top of document
- **Forced decision**: Export, Delete, and Save buttons hidden for drafts until committed or discarded
- **Commit action**: Promotes draft to "Committed" status
- **Discard action**: Deletes the draft synthesis

### Input Field Styling

- **Focus states**: Input borders brighten when focused (Share Modal, Fork Modal)
- **Label colors**: Input labels use brighter white (`#d4d4d4` dark / `#525252` light)
- **Spacing**: Increased gap between Name input and Context label in Fork Modal

### Bug Fixes

- **Navigation blank screen**: Fixed issue where clicking logo during fieldbook creation showed blank screen
- **Hidden button**: Fixed "Start New Fieldbook" button not reappearing after navigation
- **Source data consistency**: Fixed auto-synthesis receiving stale/empty source data

### Animations

- **Deletion animation**: Slowed fieldbook deletion animation from 300ms to 400ms

---

## Core Features (Phase 0 Foundation)

### Fieldbook Management

- Create, edit, rename, and delete fieldbooks
- Fork fieldbooks to create new volumes with inherited context
- Fieldbook list with hover actions (edit, share, delete)
- Delete confirmation (two-click pattern)

### Sources

- Create and edit source documents (notes, documents)
- Rich text editor with TipTap
- External link sources with domain extraction
- Add Link modal for quick URL capture

### Syntheses

- Create syntheses derived from sources
- AI-assisted synthesis generation
- Source selection during synthesis creation
- Lineage tracking (derivedFrom relationships)

### Artifacts

- Create artifacts informed by sources/syntheses
- Multiple artifact types (decision-brief, opportunity-map, etc.)
- Status tracking (draft, review, final)

### Lineage & Traceability

- Right panel showing derivation relationships
- "Derived From" section (upstream items)
- "Informs" section (downstream items)
- External lineage references for forked fieldbooks
- Visual lineage indicator with counts

### Reverberation (Change Propagation)

- Calibration alerts when upstream sources change
- Diff highlighting showing what changed
- Accept/ignore calibration decisions
- Change tracking history per node

### Sharing & Collaboration

- Share modal with collaborator management
- Invite by email functionality
- Read-only shareable links
- Content visibility controls (show/hide sources, syntheses, artifacts)

### UI Framework

- Dark/light theme toggle
- Global navigation with breadcrumbs
- Three-column layout (Sources Panel | Working Area | Lineage Panel)
- Smooth page transitions and animations
- Consistent button variants (primary, secondary, tertiary)

---

## Technical Infrastructure

- Next.js 16 with App Router
- JSON-based persistence (demo-grade)
- TipTap rich text editor
- NextAuth for authentication (Google provider)
- TypeScript throughout
- Tailwind CSS for styling
