# Phase 0 API Reference

> Version: v1  
> Base URL: `/api/v1`

This document describes the Phase 0 API endpoints for Stacks/Fieldbook.

---

## Design Principles

1. **Lineage-first**: All operations preserve and create lineage relationships
2. **Semantic types**: NodeType (source, synthesis, artifact) represents roles, not workflow states
3. **Bounded context**: All relationships must exist within a single Fieldbook
4. **Sparse forking**: Forks preserve parent reference without cloning data

---

## Endpoints Overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/fieldbooks` | Create a new fieldbook |
| GET | `/fieldbooks` | List all fieldbooks |
| GET | `/fieldbooks/:id` | Get fieldbook details |
| POST | `/fieldbooks/:id/fork` | Fork a fieldbook |
| POST | `/fieldbooks/:id/nodes` | Create any node type |
| GET | `/fieldbooks/:id/nodes` | List nodes (optional type filter) |
| POST | `/fieldbooks/:id/sources` | Create a source node |
| POST | `/fieldbooks/:id/artifacts` | Create an artifact node |
| POST | `/fieldbooks/:id/decisions` | Create a decision (artifact) |
| POST | `/fieldbooks/:id/relationships` | Create an edge between nodes |
| GET | `/fieldbooks/:id/relationships` | List edges |
| GET | `/fieldbooks/:id/timeline` | Get ordered node stream |
| GET | `/fieldbooks/:id/graph` | Get full node/edge graph |
| GET | `/fieldbooks/:id/search?q=` | Search nodes |

---

## Fieldbooks

### Create Fieldbook

```http
POST /api/v1/fieldbooks
Content-Type: application/json

{
  "name": "Q1 Platform Strategy",
  "description": "Research and decisions for platform modernization"
}
```

**Response** (201 Created):
```json
{
  "id": "1738678xxx-abc123",
  "name": "Q1 Platform Strategy",
  "description": "Research and decisions for platform modernization",
  "createdAt": "2026-02-04T...",
  "updatedAt": "2026-02-04T..."
}
```

### Get Fieldbook Detail

```http
GET /api/v1/fieldbooks/:id
```

**Response** (200 OK):
```json
{
  "fieldbook": { ... },
  "nodeCount": 15,
  "edgeCount": 8,
  "parent": null
}
```

### Fork Fieldbook

Creates a new fieldbook with a parent reference. Optionally copies selected anchor nodes.

```http
POST /api/v1/fieldbooks/:id/fork
Content-Type: application/json

{
  "name": "Q2 Platform Strategy",
  "forkContext": "Continuing from Q1 with approved SOW ($500k budget, 6mo timeline)",
  "anchorNodeIds": ["node-id-1", "node-id-2"]
}
```

**Response** (201 Created):
```json
{
  "fieldbook": {
    "id": "...",
    "name": "Q2 Platform Strategy",
    "parentId": "<original-id>",
    "forkContext": "Continuing from Q1 with approved SOW..."
  },
  "anchorNodes": [
    { "id": "new-node-1", ... },
    { "id": "new-node-2", ... }
  ]
}
```

---

## Nodes

Nodes are the core content entities. They have three semantic types:

| Type | Description | Examples |
|------|-------------|----------|
| `source` | Input that exists | Links, notes, files, interviews |
| `synthesis` | Interpretation derived | Analysis, themes, insights |
| `artifact` | Output produced | Decisions, briefs, maps |

### Create Node (Generic)

```http
POST /api/v1/fieldbooks/:id/nodes
Content-Type: application/json

{
  "nodeType": "source",
  "subtype": "link",
  "title": "Competitor Analysis Report",
  "content": { "type": "doc", "content": [...] },
  "metadata": {
    "url": "https://example.com/report.pdf"
  }
}
```

### Create Source (Convenience)

```http
POST /api/v1/fieldbooks/:id/sources
Content-Type: application/json

{
  "title": "Marcus Webb Interview",
  "subtype": "interview",
  "metadata": {
    "interviewee": "Marcus Webb",
    "date": "2026-01-15",
    "durationMinutes": 45
  }
}
```

**Valid subtypes**: `link`, `note`, `file`, `interview`, `transcript`, `document`

### Create Artifact (Convenience)

```http
POST /api/v1/fieldbooks/:id/artifacts
Content-Type: application/json

{
  "title": "Platform Migration Decision",
  "subtype": "decision-brief",
  "content": { ... }
}
```

**Valid subtypes**: `decision-brief`, `opportunity-map`, `design-rationale`, `research-warrant`, `alignment-map`, `evidence-inventory`, `transition-playbook`, `custom`

### Create Decision (Convenience)

```http
POST /api/v1/fieldbooks/:id/decisions
Content-Type: application/json

{
  "title": "Adopt Kubernetes for orchestration",
  "metadata": {
    "decision": "Adopt Kubernetes",
    "rationale": "Industry standard, team expertise exists",
    "alternatives": ["Docker Swarm", "ECS", "Nomad"],
    "decisionDate": "2026-02-01"
  }
}
```

### List Nodes

```http
GET /api/v1/fieldbooks/:id/nodes
GET /api/v1/fieldbooks/:id/nodes?type=source
```

---

## Relationships (Edges)

Edges connect nodes within a fieldbook. Direction is downstream → upstream.

| Type | Meaning |
|------|---------|
| `derived_from` | Target was synthesized/created from source |
| `informed_by` | Target was influenced by source |
| `superseded` | Target replaces source (versioning) |
| `related_to` | Soft association |

### Create Relationship

```http
POST /api/v1/fieldbooks/:id/relationships
Content-Type: application/json

{
  "sourceNodeId": "<downstream-node-id>",
  "targetNodeId": "<upstream-node-id>",
  "relationship": "derived_from"
}
```

**Validation Rules**:
- Both nodes must belong to the same fieldbook
- No self-loops (sourceNodeId ≠ targetNodeId)
- No duplicate edges with same relationship type

**Error Codes**:
- `CROSS_FIELDBOOK_EDGE`: Nodes belong to different fieldbooks
- `SELF_LOOP_EDGE`: Self-referential edge attempted
- `DUPLICATE_EDGE`: Identical edge already exists

---

## Queries

### Timeline

Returns nodes in reverse chronological order with their edges.

```http
GET /api/v1/fieldbooks/:id/timeline
```

**Response**:
```json
{
  "items": [
    {
      "node": { ... },
      "incomingEdges": [...],
      "outgoingEdges": [...]
    }
  ],
  "total": 15
}
```

### Graph

Returns all nodes and edges for visualization.

```http
GET /api/v1/fieldbooks/:id/graph
```

**Response**:
```json
{
  "nodes": [...],
  "edges": [...]
}
```

### Search

Search node titles and content.

```http
GET /api/v1/fieldbooks/:id/search?q=kubernetes
GET /api/v1/fieldbooks/:id/search?q=kubernetes&type=source&limit=10
```

**Response**:
```json
{
  "results": [
    {
      "node": { ... },
      "matchedField": "content",
      "snippet": "...considering kubernetes for container orchestration..."
    }
  ],
  "total": 3,
  "query": "kubernetes"
}
```

---

## Error Responses

All errors follow this shape:

```json
{
  "error": "Human-readable message",
  "code": "ERROR_CODE"
}
```

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `NOT_FOUND` | 404 | Resource doesn't exist |
| `VALIDATION_ERROR` | 400 | Invalid request body |
| `INVALID_NODE_TYPE` | 400 | Unknown node type |
| `INVALID_RELATIONSHIP` | 400 | Unknown relationship type |
| `CROSS_FIELDBOOK_EDGE` | 400 | Nodes in different fieldbooks |
| `SELF_LOOP_EDGE` | 400 | Self-referential edge |
| `DUPLICATE_EDGE` | 409 | Edge already exists |
| `INTERNAL_ERROR` | 500 | Server error |

---

## TypeScript Types

All types are exported from `@/app/lib/phase0/types`:

```typescript
import type {
  Fieldbook,
  Node,
  Edge,
  NodeType,
  RelationshipType,
  CreateFieldbookRequest,
  CreateNodeRequest,
  CreateRelationshipRequest,
  FieldbookDetailResponse,
  TimelineResponse,
  GraphResponse,
  SearchResponse,
} from "@/app/lib/phase0/types";
```
