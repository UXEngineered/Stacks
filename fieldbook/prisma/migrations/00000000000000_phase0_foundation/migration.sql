-- =============================================================================
-- STACKS PHASE 0 - FOUNDATION MIGRATION
-- =============================================================================
--
-- Creates the minimal schema for lineage capture:
--   - fieldbook: Root container with fork support
--   - node: Unified content entity (source, synthesis, artifact)
--   - edge: Directed relationships between nodes
--
-- Run with: psql -d your_database -f migration.sql
-- Or use Prisma: npx prisma migrate deploy
--
-- =============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- ENUMS
-- =============================================================================

CREATE TYPE node_type AS ENUM ('source', 'synthesis', 'artifact');

CREATE TYPE relationship_type AS ENUM ('derived_from', 'informed_by', 'superseded', 'related_to');

-- =============================================================================
-- FIELDBOOK
-- =============================================================================

CREATE TABLE fieldbook (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(255) NOT NULL,
    description     TEXT,
    
    -- Fork support
    parent_id       UUID REFERENCES fieldbook(id) ON DELETE SET NULL,
    fork_context    TEXT,  -- Condensed inheritance from parent
    
    -- Timestamps
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Index for finding forks of a fieldbook
CREATE INDEX idx_fieldbook_parent ON fieldbook(parent_id) WHERE parent_id IS NOT NULL;

-- =============================================================================
-- NODE
-- =============================================================================

CREATE TABLE node (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fieldbook_id    UUID NOT NULL REFERENCES fieldbook(id) ON DELETE CASCADE,
    
    -- Type discriminator
    node_type       node_type NOT NULL,
    subtype         VARCHAR(50),  -- link, note, file, interview, decision-brief, etc.
    
    -- Content
    title           VARCHAR(500) NOT NULL,
    content         JSONB,        -- TipTap/ProseMirror document JSON
    metadata        JSONB,        -- Type-specific metadata
    
    -- Timestamps
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Indexes for node queries
CREATE INDEX idx_node_fieldbook ON node(fieldbook_id);
CREATE INDEX idx_node_fieldbook_type ON node(fieldbook_id, node_type);
CREATE INDEX idx_node_updated ON node(updated_at DESC);

-- =============================================================================
-- EDGE
-- =============================================================================

CREATE TABLE edge (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fieldbook_id    UUID NOT NULL REFERENCES fieldbook(id) ON DELETE CASCADE,
    
    -- Relationship endpoints
    source_node_id  UUID NOT NULL REFERENCES node(id) ON DELETE CASCADE,
    target_node_id  UUID NOT NULL REFERENCES node(id) ON DELETE CASCADE,
    
    -- Relationship type
    relationship    relationship_type NOT NULL,
    
    -- Timestamp
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    
    -- Constraints
    CONSTRAINT edge_no_self_loop CHECK (source_node_id != target_node_id)
);

-- Indexes for edge traversal (lineage queries)
CREATE INDEX idx_edge_fieldbook ON edge(fieldbook_id);
CREATE INDEX idx_edge_source ON edge(source_node_id);
CREATE INDEX idx_edge_target ON edge(target_node_id);
CREATE INDEX idx_edge_source_rel ON edge(source_node_id, relationship);
CREATE INDEX idx_edge_target_rel ON edge(target_node_id, relationship);

-- Unique constraint: no duplicate edges
CREATE UNIQUE INDEX idx_edge_unique ON edge(source_node_id, target_node_id, relationship);

-- =============================================================================
-- TRIGGERS: Auto-update updated_at
-- =============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_fieldbook_updated_at
    BEFORE UPDATE ON fieldbook
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_node_updated_at
    BEFORE UPDATE ON node
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- VALIDATION FUNCTION: Ensure edge nodes belong to same fieldbook
-- =============================================================================

CREATE OR REPLACE FUNCTION validate_edge_same_fieldbook()
RETURNS TRIGGER AS $$
DECLARE
    source_fieldbook UUID;
    target_fieldbook UUID;
BEGIN
    SELECT fieldbook_id INTO source_fieldbook FROM node WHERE id = NEW.source_node_id;
    SELECT fieldbook_id INTO target_fieldbook FROM node WHERE id = NEW.target_node_id;
    
    IF source_fieldbook != target_fieldbook THEN
        RAISE EXCEPTION 'Edge nodes must belong to the same fieldbook. Source: %, Target: %', 
            source_fieldbook, target_fieldbook;
    END IF;
    
    IF source_fieldbook != NEW.fieldbook_id THEN
        RAISE EXCEPTION 'Edge fieldbook_id must match the nodes fieldbook. Edge: %, Nodes: %',
            NEW.fieldbook_id, source_fieldbook;
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER validate_edge_fieldbook
    BEFORE INSERT OR UPDATE ON edge
    FOR EACH ROW
    EXECUTE FUNCTION validate_edge_same_fieldbook();

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE fieldbook IS 'Root container for a body of work. Supports forking with condensed inheritance.';
COMMENT ON COLUMN fieldbook.parent_id IS 'Reference to parent fieldbook if this is a fork';
COMMENT ON COLUMN fieldbook.fork_context IS 'Condensed context inherited from parent (key anchors, constraints)';

COMMENT ON TABLE node IS 'Unified content entity: source (inputs), synthesis (interpretations), artifact (outputs)';
COMMENT ON COLUMN node.node_type IS 'Primary classification: source, synthesis, or artifact';
COMMENT ON COLUMN node.subtype IS 'Secondary classification: link, note, file, interview, decision-brief, etc.';
COMMENT ON COLUMN node.content IS 'Rich text content in TipTap/ProseMirror JSON format';
COMMENT ON COLUMN node.metadata IS 'Type-specific metadata (url, file_size, interviewee, etc.)';

COMMENT ON TABLE edge IS 'Directed relationship between nodes. Points downstream → upstream.';
COMMENT ON COLUMN edge.relationship IS 'derived_from (created from), informed_by (influenced by), superseded (replaces), related_to (soft link)';
