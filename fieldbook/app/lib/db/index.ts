/**
 * Simple JSON file-based database for Stacks
 * 
 * DEMO/PROTOTYPE PERSISTENCE LAYER
 * ================================
 * - Reads from and writes to data/data.json
 * - All mutations immediately persist to disk
 * - No authentication, no multi-user support
 * - To reset demo data: delete data/data.json and restart the app
 * 
 * For production, replace with a real database.
 */

import { promises as fs } from "fs";
import path from "path";
import type {
  StacksDatabase,
  Fieldbook,
  Source,
  Synthesis,
  Artifact,
  Capture,
  CreateFieldbook,
  CreateSource,
  CreateSynthesis,
  CreateArtifact,
  CreateCapture,
  UpdateFieldbook,
  UpdateSource,
  UpdateSynthesis,
  UpdateArtifact,
  UpdateCapture,
} from "./types";

// Path to the JSON database file
const DB_PATH = path.join(process.cwd(), "data", "data.json");

// Default empty database (used if data.json doesn't exist)
const DEFAULT_DB: StacksDatabase = {
  fieldbooks: [],
};

// =============================================================================
// Core Helper Functions
// =============================================================================

/**
 * loadData() - Reads the JSON file and returns the database state
 * 
 * If the file doesn't exist, returns the default empty structure.
 * This is the single source of truth for all read operations.
 */
export async function loadData(): Promise<StacksDatabase> {
  try {
    const data = await fs.readFile(DB_PATH, "utf-8");
    return JSON.parse(data) as StacksDatabase;
  } catch {
    // File doesn't exist or is invalid - return default
    return DEFAULT_DB;
  }
}

/**
 * saveData() - Writes the full state back to the JSON file
 * 
 * Called after every mutation to ensure persistence.
 * Creates the data directory if it doesn't exist.
 */
export async function saveData(db: StacksDatabase): Promise<void> {
  const dir = path.dirname(DB_PATH);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2), "utf-8");
}

// Aliases for backward compatibility
export const readDb = loadData;
export const writeDb = saveData;

// =============================================================================
// Fieldbook Operations
// =============================================================================

export async function getAllFieldbooks(): Promise<Fieldbook[]> {
  const db = await readDb();
  return db.fieldbooks;
}

export async function getFieldbook(id: string): Promise<Fieldbook | null> {
  const db = await readDb();
  return db.fieldbooks.find((fb) => fb.id === id) || null;
}

export async function createFieldbook(data: CreateFieldbook): Promise<Fieldbook> {
  const db = await readDb();
  const now = new Date().toISOString();
  
  const fieldbook: Fieldbook = {
    id: `fb-${Date.now()}`,
    name: data.name,
    description: data.description,
    createdAt: now,
    sources: [],
    syntheses: [],
    artifacts: [],
    // Fork support (condensed inheritance)
    parentId: data.parentId,
    forkContext: data.forkContext,
  };
  
  db.fieldbooks.push(fieldbook);
  await writeDb(db);
  return fieldbook;
}

export async function updateFieldbook(data: UpdateFieldbook): Promise<Fieldbook | null> {
  const db = await readDb();
  const index = db.fieldbooks.findIndex((fb) => fb.id === data.id);
  
  if (index === -1) return null;
  
  const now = new Date().toISOString();
  
  // Filter out undefined values to avoid overwriting existing fields
  const cleanData: Partial<UpdateFieldbook> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      cleanData[key as keyof UpdateFieldbook] = value;
    }
  }
  
  db.fieldbooks[index] = {
    ...db.fieldbooks[index],
    ...cleanData,
    updatedAt: now,
  };
  
  await writeDb(db);
  return db.fieldbooks[index];
}

export async function deleteFieldbook(id: string): Promise<boolean> {
  const db = await readDb();
  const initialLength = db.fieldbooks.length;
  db.fieldbooks = db.fieldbooks.filter((fb) => fb.id !== id);
  
  if (db.fieldbooks.length === initialLength) return false;
  
  await writeDb(db);
  return true;
}

// =============================================================================
// Source Operations
// =============================================================================

export async function getSources(fieldbookId: string): Promise<Source[]> {
  const fieldbook = await getFieldbook(fieldbookId);
  return fieldbook?.sources || [];
}

export async function getSource(fieldbookId: string, sourceId: string): Promise<Source | null> {
  const fieldbook = await getFieldbook(fieldbookId);
  return fieldbook?.sources.find((s) => s.id === sourceId) || null;
}

export async function createSource(fieldbookId: string, data: CreateSource & { url?: string; domain?: string; note?: string; capturedAt?: string }): Promise<Source | null> {
  const db = await readDb();
  const fieldbook = db.fieldbooks.find((fb) => fb.id === fieldbookId);
  
  if (!fieldbook) return null;
  
  const now = new Date().toISOString();
  const source: Source = {
    id: `src-${Date.now()}`,
    title: data.title,
    type: data.type,
    content: data.content,
    createdAt: now,
    // External link fields (only populated for type = 'external_link')
    ...(data.url && { url: data.url }),
    ...(data.domain && { domain: data.domain }),
    ...(data.note && { note: data.note }),
    ...(data.capturedAt && { capturedAt: data.capturedAt }),
  };
  
  fieldbook.sources.push(source);
  fieldbook.updatedAt = now;
  await writeDb(db);
  return source;
}

export async function updateSource(fieldbookId: string, data: UpdateSource): Promise<Source | null> {
  const db = await readDb();
  const fieldbook = db.fieldbooks.find((fb) => fb.id === fieldbookId);
  
  if (!fieldbook) return null;
  
  const index = fieldbook.sources.findIndex((s) => s.id === data.id);
  if (index === -1) return null;
  
  const now = new Date().toISOString();
  fieldbook.sources[index] = {
    ...fieldbook.sources[index],
    ...data,
    updatedAt: now,
  };
  fieldbook.updatedAt = now;
  
  await writeDb(db);
  return fieldbook.sources[index];
}

export async function deleteSource(fieldbookId: string, sourceId: string): Promise<boolean> {
  const db = await readDb();
  const fieldbook = db.fieldbooks.find((fb) => fb.id === fieldbookId);
  
  if (!fieldbook) return false;
  
  const initialLength = fieldbook.sources.length;
  fieldbook.sources = fieldbook.sources.filter((s) => s.id !== sourceId);
  
  if (fieldbook.sources.length === initialLength) return false;
  
  fieldbook.updatedAt = new Date().toISOString();
  await writeDb(db);
  return true;
}

// =============================================================================
// Synthesis Operations
// =============================================================================

export async function getSyntheses(fieldbookId: string): Promise<Synthesis[]> {
  const fieldbook = await getFieldbook(fieldbookId);
  return fieldbook?.syntheses || [];
}

export async function getSynthesis(fieldbookId: string, synthesisId: string): Promise<Synthesis | null> {
  const fieldbook = await getFieldbook(fieldbookId);
  return fieldbook?.syntheses.find((s) => s.id === synthesisId) || null;
}

export async function createSynthesis(fieldbookId: string, data: CreateSynthesis & { status?: "draft" | "committed"; needsReview?: boolean }): Promise<Synthesis | null> {
  const db = await readDb();
  const fieldbook = db.fieldbooks.find((fb) => fb.id === fieldbookId);
  
  if (!fieldbook) return null;
  
  const now = new Date().toISOString();
  const synthesis: Synthesis = {
    id: `syn-${Date.now()}`,
    title: data.title,
    content: data.content,
    derivedFrom: data.derivedFrom,
    status: data.status,
    needsReview: data.needsReview,
    createdAt: now,
  };
  
  fieldbook.syntheses.push(synthesis);
  fieldbook.updatedAt = now;
  await writeDb(db);
  return synthesis;
}

export async function updateSynthesis(fieldbookId: string, data: UpdateSynthesis): Promise<Synthesis | null> {
  const db = await readDb();
  const fieldbook = db.fieldbooks.find((fb) => fb.id === fieldbookId);
  
  if (!fieldbook) return null;
  
  const index = fieldbook.syntheses.findIndex((s) => s.id === data.id);
  if (index === -1) return null;
  
  const now = new Date().toISOString();
  fieldbook.syntheses[index] = {
    ...fieldbook.syntheses[index],
    ...data,
    updatedAt: now,
  };
  fieldbook.updatedAt = now;
  
  await writeDb(db);
  return fieldbook.syntheses[index];
}

export async function deleteSynthesis(fieldbookId: string, synthesisId: string): Promise<boolean> {
  const db = await readDb();
  const fieldbook = db.fieldbooks.find((fb) => fb.id === fieldbookId);
  
  if (!fieldbook) return false;
  
  const initialLength = fieldbook.syntheses.length;
  fieldbook.syntheses = fieldbook.syntheses.filter((s) => s.id !== synthesisId);
  
  if (fieldbook.syntheses.length === initialLength) return false;
  
  fieldbook.updatedAt = new Date().toISOString();
  await writeDb(db);
  return true;
}

// =============================================================================
// Artifact Operations
// =============================================================================

export async function getArtifacts(fieldbookId: string): Promise<Artifact[]> {
  const fieldbook = await getFieldbook(fieldbookId);
  return fieldbook?.artifacts || [];
}

export async function getArtifact(fieldbookId: string, artifactId: string): Promise<Artifact | null> {
  const fieldbook = await getFieldbook(fieldbookId);
  return fieldbook?.artifacts.find((a) => a.id === artifactId) || null;
}

export async function createArtifact(fieldbookId: string, data: CreateArtifact): Promise<Artifact | null> {
  const db = await readDb();
  const fieldbook = db.fieldbooks.find((fb) => fb.id === fieldbookId);
  
  if (!fieldbook) return null;
  
  const now = new Date().toISOString();
  const artifact: Artifact = {
    id: `art-${Date.now()}`,
    type: data.type,
    title: data.title,
    content: data.content,
    informedBy: data.informedBy,
    status: data.status,
    createdAt: now,
  };
  
  fieldbook.artifacts.push(artifact);
  fieldbook.updatedAt = now;
  await writeDb(db);
  return artifact;
}

export async function updateArtifact(fieldbookId: string, data: UpdateArtifact): Promise<Artifact | null> {
  const db = await readDb();
  const fieldbook = db.fieldbooks.find((fb) => fb.id === fieldbookId);
  
  if (!fieldbook) return null;
  
  const index = fieldbook.artifacts.findIndex((a) => a.id === data.id);
  if (index === -1) return null;
  
  const now = new Date().toISOString();
  fieldbook.artifacts[index] = {
    ...fieldbook.artifacts[index],
    ...data,
    updatedAt: now,
  };
  fieldbook.updatedAt = now;
  
  await writeDb(db);
  return fieldbook.artifacts[index];
}

export async function deleteArtifact(fieldbookId: string, artifactId: string): Promise<boolean> {
  const db = await readDb();
  const fieldbook = db.fieldbooks.find((fb) => fb.id === fieldbookId);
  
  if (!fieldbook) return false;
  
  const initialLength = fieldbook.artifacts.length;
  fieldbook.artifacts = fieldbook.artifacts.filter((a) => a.id !== artifactId);
  
  if (fieldbook.artifacts.length === initialLength) return false;
  
  fieldbook.updatedAt = new Date().toISOString();
  await writeDb(db);
  return true;
}

// =============================================================================
// Capture Operations (Phase 0 minimal artifacts)
// =============================================================================

export async function getCaptures(fieldbookId: string): Promise<Capture[]> {
  const fieldbook = await getFieldbook(fieldbookId);
  return fieldbook?.captures || [];
}

export async function getCapture(fieldbookId: string, captureId: string): Promise<Capture | null> {
  const fieldbook = await getFieldbook(fieldbookId);
  return fieldbook?.captures?.find((c) => c.id === captureId) || null;
}

export async function createCapture(fieldbookId: string, data: CreateCapture): Promise<Capture | null> {
  const db = await readDb();
  const fieldbook = db.fieldbooks.find((fb) => fb.id === fieldbookId);
  
  if (!fieldbook) return null;
  
  const now = new Date().toISOString();
  const id = `cap-${Date.now()}`;
  
  let capture: Capture;
  
  if (data.type === "external_link") {
    capture = {
      id,
      type: "external_link",
      url: data.url,
      title: data.title,
      capturedAt: data.capturedAt,
      createdAt: now,
    };
  } else if (data.type === "note") {
    capture = {
      id,
      type: "note",
      text: data.text,
      capturedAt: data.capturedAt,
      createdAt: now,
    };
  } else {
    // file
    capture = {
      id,
      type: "file",
      filename: data.filename,
      size: data.size,
      mimeType: data.mimeType,
      storageKey: data.storageKey,
      capturedAt: data.capturedAt,
      createdAt: now,
    };
  }
  
  // Initialize captures array if it doesn't exist
  if (!fieldbook.captures) {
    fieldbook.captures = [];
  }
  
  fieldbook.captures.push(capture);
  fieldbook.updatedAt = now;
  await writeDb(db);
  return capture;
}

export async function updateCapture(fieldbookId: string, data: UpdateCapture): Promise<Capture | null> {
  const db = await readDb();
  const fieldbook = db.fieldbooks.find((fb) => fb.id === fieldbookId);
  
  if (!fieldbook || !fieldbook.captures) return null;
  
  const index = fieldbook.captures.findIndex((c) => c.id === data.id);
  if (index === -1) return null;
  
  const now = new Date().toISOString();
  fieldbook.captures[index] = {
    ...fieldbook.captures[index],
    ...data,
    updatedAt: now,
  } as Capture;
  fieldbook.updatedAt = now;
  
  await writeDb(db);
  return fieldbook.captures[index];
}

export async function deleteCapture(fieldbookId: string, captureId: string): Promise<boolean> {
  const db = await readDb();
  const fieldbook = db.fieldbooks.find((fb) => fb.id === fieldbookId);
  
  if (!fieldbook || !fieldbook.captures) return false;
  
  const initialLength = fieldbook.captures.length;
  fieldbook.captures = fieldbook.captures.filter((c) => c.id !== captureId);
  
  if (fieldbook.captures.length === initialLength) return false;
  
  fieldbook.updatedAt = new Date().toISOString();
  await writeDb(db);
  return true;
}

// Re-export types
export * from "./types";
