/**
 * Fieldbook Document Module
 *
 * Exports all document-related types, schemas, and utilities.
 */

// Core types
export * from "./types";

// Style system
export * from "./styles";

// Version model
export * from "./version";

// Zod schemas and validation
export {
  // Schemas
  DocumentSchema,
  BlockSchema,
  DocumentVersionSchema,
  DocumentMetaSchema,
  RichTextSchema,
  TextSpanSchema,
  CalloutIntentSchema,
  // Validation helpers
  validateDocument,
  validateBlock,
  validateDocumentVersion,
} from "./schema";

// Example documents
export { rolesPermissionsDocument } from "./examples/roles-permissions";

// Document store operations
export {
  getDocument,
  listDocuments,
  saveDocument,
  createDocument,
  getVersion,
  getDocumentVersions,
  getVersionHistory,
  restoreVersion,
  seedStore,
} from "./store";

// Source sync operations
export {
  computeSourceStatus,
  isSourceSetInSync,
  getSourceSyncStatus,
  createSourceSnapshot,
  createSourceSet,
  refreshSourceSet,
} from "./source-sync";
