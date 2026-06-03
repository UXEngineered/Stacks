/**
 * Persistence layer for Stacks
 *
 * Two backends, selected automatically:
 *  - **Vercel Blob** when `BLOB_READ_WRITE_TOKEN` is set (production / preview)
 *  - **Local JSON file** otherwise (local dev)
 *
 * Every CRUD function below calls `loadData` / `saveData`, so swapping
 * the backend is transparent to the rest of the codebase.
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

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const DB_PATH = path.join(process.cwd(), "data", "data.json");
const BLOB_KEY = "stacks/data.json";
const BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN;
const useBlob = !!BLOB_TOKEN && process.env.VERCEL === "1";

const DEFAULT_DB: StacksDatabase = {
  fieldbooks: [],
};

// ---------------------------------------------------------------------------
// Local file helpers
// ---------------------------------------------------------------------------

async function loadFromFile(): Promise<StacksDatabase> {
  try {
    const data = await fs.readFile(DB_PATH, "utf-8");
    return JSON.parse(data) as StacksDatabase;
  } catch {
    return DEFAULT_DB;
  }
}

async function saveToFile(db: StacksDatabase): Promise<void> {
  const dir = path.dirname(DB_PATH);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2), "utf-8");
}

// ---------------------------------------------------------------------------
// Vercel Blob helpers (lazy-imported so local dev never loads the package)
// ---------------------------------------------------------------------------

async function loadFromBlob(): Promise<StacksDatabase> {
  const { list } = await import("@vercel/blob");
  try {
    const { blobs } = await list({ prefix: BLOB_KEY, token: BLOB_TOKEN!, limit: 1 });
    if (blobs.length === 0) throw new Error("Blob not found");
    const res = await fetch(blobs[0].downloadUrl);
    if (!res.ok) throw new Error(`Blob fetch failed: ${res.status}`);
    return (await res.json()) as StacksDatabase;
  } catch {
    console.log("[DB] Blob not found, seeding from local data.json");
    const seed = await loadFromFile();
    await saveToBlob(seed);
    return seed;
  }
}

async function saveToBlob(db: StacksDatabase): Promise<void> {
  const { put } = await import("@vercel/blob");
  await put(BLOB_KEY, JSON.stringify(db, null, 2), {
    access: "private",
    addRandomSuffix: false,
    token: BLOB_TOKEN!,
  });
}

// ---------------------------------------------------------------------------
// Public API — everything else in the app uses these two functions
// ---------------------------------------------------------------------------

export async function loadData(): Promise<StacksDatabase> {
  return useBlob ? loadFromBlob() : loadFromFile();
}

export async function saveData(db: StacksDatabase): Promise<void> {
  return useBlob ? saveToBlob(db) : saveToFile(db);
}

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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (cleanData as any)[key] = value;
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
    status: data.status || "draft",
    visibility: data.visibility || "internal",
    tags: data.tags || [],
    owner: data.owner,
    createdAt: now,
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

export async function createSynthesis(fieldbookId: string, data: CreateSynthesis): Promise<Synthesis | null> {
  const db = await readDb();
  const fieldbook = db.fieldbooks.find((fb) => fb.id === fieldbookId);
  
  if (!fieldbook) return null;
  
  const now = new Date().toISOString();
  const synthesis: Synthesis = {
    id: `syn-${Date.now()}`,
    title: data.title,
    type: data.type,
    content: data.content,
    derivedFrom: data.derivedFrom,
    status: data.status || "draft",
    visibility: data.visibility || "internal",
    tags: data.tags || [],
    owner: data.owner,
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
    status: data.status || "draft",
    visibility: data.visibility || "internal",
    tags: data.tags || [],
    owner: data.owner,
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
