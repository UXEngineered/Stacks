# Phase 0: Foundation

> Validate that lineage can be captured and referenced without creating work-about-work.

---

## Purpose

Prove that a small team can use Stacks to:
1. Capture sources (interviews, documents, notes)
2. Derive syntheses that preserve their lineage
3. Generate artifacts that trace back to evidence
4. Understand what changed and why when upstream sources evolve

**Goal:** A working prototype that demonstrates lineage preservation without adding friction to how people already work.

---

## Explicit Non-Goals

Phase 0 will **not** include:

| Category | What we won't build |
|----------|---------------------|
| Project management | Named phases, gates, milestones |
| Task tracking | Backlogs, tickets, sprints, assignments |
| Status indicators | On track, at risk, blocked, complete |
| Real-time collaboration | Google Docs-style simultaneous editing |
| Delivery tool integrations | Jira, Asana, Linear, Monday |
| AI committing lineage | AI proposes only; humans confirm |
| Prescriptive workflows | Enforced sequences or approvals |

---

## Definition of Done

Phase 0 is complete when the following capabilities exist and work:

### Required Capabilities

- [ ] **Sources** — Create, edit, and persist source documents
- [ ] **Syntheses** — Derive syntheses from selected sources; lineage preserved
- [ ] **Artifacts** — Generate artifacts informed by sources/syntheses; lineage preserved
- [ ] **Lineage visibility** — View what any item derives from and what depends on it
- [ ] **Reverberation** — When a source changes, downstream items are flagged for review
- [ ] **AI-assisted generation** — AI can draft syntheses and artifacts from sources
- [ ] **AI guardrails enforced** — AI proposes, humans confirm; all output is cited

### Success Signals

1. A user can answer "Why does this artifact say X?" by tracing lineage to sources
2. A user can answer "What might break if I change this source?" before editing
3. No user is asked to update a status, assign a task, or move a card
4. Documentation tax is near-zero—lineage emerges from normal work

---

## Litmus Test

Before adding any feature, ask:

> **Does this help understand work, or does it help control work?**

If control → out of scope.  
If understand → evaluate for Phase 0.

---

## Out of Scope for Later Phases

The following are valid Stacks concepts but deferred beyond Phase 0:

- Strategic forking (condensing prior context into constraints)
- Assumption monitoring (flagging conflicts over time)
- Lineage ledger (proof-of-intent export at project close)
- Passive ingestion (Slack, Zoom, Figma signals)
- Role-based views (sales, exec, client)
- Multi-user access control

---

*Phase 0 is infrastructure. If it works, teams will want the rest.*
