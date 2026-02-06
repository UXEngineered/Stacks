/**
 * Fieldbook Document Zod Schema
 *
 * Validates documents at the API boundary.
 * Mirrors the TypeScript types but adds runtime validation.
 *
 * Usage:
 *   const result = DocumentSchema.safeParse(incomingData);
 *   if (!result.success) {
 *     console.error(result.error.format());
 *   }
 */

import { z } from "zod";

// =============================================================================
// INLINE CONTENT SCHEMAS
// =============================================================================

/**
 * Text formatting marks
 */
export const TextMarkSchema = z.enum([
  "bold",
  "italic",
  "code",
  "strikethrough",
]);

/**
 * A span of text with optional formatting
 */
export const TextSpanSchema = z.object({
  text: z.string(),
  marks: z.array(TextMarkSchema).optional(),
  href: z.string().url().optional(),
}).refine(
  // Warn if both marks and href are present (unusual but allowed)
  (span) => !(span.marks?.length && span.href),
  { message: "Links typically shouldn't have other formatting marks" }
).or(
  // Allow simple text spans without the warning
  z.object({
    text: z.string(),
    marks: z.array(TextMarkSchema).optional(),
    href: z.string().url().optional(),
  })
);

/**
 * Simplified TextSpan without the refinement (for nesting)
 */
const TextSpanBaseSchema = z.object({
  text: z.string(),
  marks: z.array(TextMarkSchema).optional(),
  href: z.string().url().optional(),
});

/**
 * Rich text is an array of spans
 */
export const RichTextSchema = z.array(TextSpanBaseSchema).min(0);

// =============================================================================
// BLOCK SCHEMAS
// =============================================================================

/**
 * Block ID format - simple string, but could enforce UUID later
 */
const BlockIdSchema = z.string().min(1).max(100);

/**
 * Indent level (0-3)
 */
const IndentSchema = z.union([
  z.literal(0),
  z.literal(1),
  z.literal(2),
  z.literal(3),
]);

/**
 * Base block fields
 */
const BaseBlockSchema = z.object({
  id: BlockIdSchema,
  indent: IndentSchema.optional(),
});

// -----------------------------------------------------------------------------
// Individual block type schemas
// -----------------------------------------------------------------------------

export const ParagraphBlockSchema = BaseBlockSchema.extend({
  type: z.literal("paragraph"),
  content: RichTextSchema,
});

export const HeadingLevelSchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
]);

export const HeadingBlockSchema = BaseBlockSchema.extend({
  type: z.literal("heading"),
  level: HeadingLevelSchema,
  content: RichTextSchema,
});

export const QuoteBlockSchema = BaseBlockSchema.extend({
  type: z.literal("quote"),
  content: RichTextSchema,
  attribution: z.string().optional(),
});

/**
 * List item interface for recursive typing
 */
interface ListItemType {
  id: string;
  content: z.infer<typeof RichTextSchema>;
  children?: ListItemType[];
}

/**
 * List item (recursive for nested lists)
 */
export const ListItemSchema: z.ZodType<ListItemType> = z.lazy(() =>
  z.object({
    id: BlockIdSchema,
    content: RichTextSchema,
    children: z.array(ListItemSchema).optional(),
  })
);

export const BulletedListBlockSchema = BaseBlockSchema.extend({
  type: z.literal("bulleted_list"),
  items: z.array(ListItemSchema).min(1),
});

export const NumberedListBlockSchema = BaseBlockSchema.extend({
  type: z.literal("numbered_list"),
  items: z.array(ListItemSchema).min(1),
  start: z.number().int().positive().optional(),
});

export const DividerBlockSchema = BaseBlockSchema.extend({
  type: z.literal("divider"),
});

export const CalloutIntentSchema = z.enum([
  "decision",
  "assumption",
  "open_question",
  "constraint",
  "risk",
]);

export const CalloutBlockSchema = BaseBlockSchema.extend({
  type: z.literal("callout"),
  intent: CalloutIntentSchema,
  title: z.string().optional(),
  content: RichTextSchema,
});

// -----------------------------------------------------------------------------
// Union of all block types
// -----------------------------------------------------------------------------

export const BlockSchema = z.discriminatedUnion("type", [
  ParagraphBlockSchema,
  HeadingBlockSchema,
  QuoteBlockSchema,
  BulletedListBlockSchema,
  NumberedListBlockSchema,
  DividerBlockSchema,
  CalloutBlockSchema,
]);

// =============================================================================
// DOCUMENT SCHEMAS
// =============================================================================

/**
 * ISO 8601 datetime string
 */
const DateTimeSchema = z.string().datetime({ offset: true }).or(
  z.string().datetime() // Allow without offset too
);

/**
 * Document metadata
 */
export const DocumentMetaSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(500),
  description: z.string().max(2000).optional(),
  createdAt: DateTimeSchema,
  updatedAt: DateTimeSchema,
  createdBy: z.string().min(1),
  tags: z.array(z.string().min(1).max(50)).max(20).optional(),
});

/**
 * Schema version - currently only "1.0"
 */
const SchemaVersionSchema = z.literal("1.0");

/**
 * Complete document schema
 */
export const DocumentSchema = z.object({
  schemaVersion: SchemaVersionSchema,
  meta: DocumentMetaSchema,
  blocks: z.array(BlockSchema),
});

// =============================================================================
// VERSION SCHEMAS
// =============================================================================

export const UserRefSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  email: z.string().email().optional(),
});

export const ChangeTypeSchema = z.enum([
  "created",
  "edited",
  "restructured",
  "metadata_updated",
  "restored",
]);

export const ChangeSummarySchema = z.object({
  type: ChangeTypeSchema,
  description: z.string().optional(),
  blocksAdded: z.array(BlockIdSchema).optional(),
  blocksModified: z.array(BlockIdSchema).optional(),
  blocksRemoved: z.array(BlockIdSchema).optional(),
});

export const DocumentVersionSchema = z.object({
  versionId: z.string().min(1),
  documentId: z.string().min(1),
  versionNumber: z.number().int().positive(),
  createdAt: DateTimeSchema,
  author: UserRefSchema,
  change: ChangeSummarySchema,
  snapshot: DocumentSchema,
  previousVersionId: z.string().nullable(),
});

// =============================================================================
// SOURCE REFERENCE SCHEMAS
// =============================================================================

export const SourceRelationshipSchema = z.enum([
  "quoted",
  "summarized",
  "derived",
  "references",
  "supersedes",
]);

export const SourceReferenceSchema = z.object({
  documentId: z.string().min(1),
  versionId: z.string().optional(),
  blockId: z.string().optional(),
  range: z
    .object({
      start: z.number().int().nonnegative(),
      end: z.number().int().positive(),
    })
    .refine((r) => r.end > r.start, {
      message: "Range end must be greater than start",
    })
    .optional(),
  referencedAt: DateTimeSchema,
  relationship: SourceRelationshipSchema,
});

// =============================================================================
// TYPE EXPORTS (inferred from schemas)
// =============================================================================

export type TextMark = z.infer<typeof TextMarkSchema>;
export type TextSpan = z.infer<typeof TextSpanBaseSchema>;
export type RichText = z.infer<typeof RichTextSchema>;
export type Block = z.infer<typeof BlockSchema>;
export type Document = z.infer<typeof DocumentSchema>;
export type DocumentMeta = z.infer<typeof DocumentMetaSchema>;
export type DocumentVersion = z.infer<typeof DocumentVersionSchema>;
export type CalloutIntent = z.infer<typeof CalloutIntentSchema>;
export type ChangeType = z.infer<typeof ChangeTypeSchema>;
export type ChangeSummary = z.infer<typeof ChangeSummarySchema>;
export type UserRef = z.infer<typeof UserRefSchema>;
export type SourceReference = z.infer<typeof SourceReferenceSchema>;

// =============================================================================
// VALIDATION HELPERS
// =============================================================================

/**
 * Validate a document and return typed result
 */
export function validateDocument(data: unknown): {
  success: true;
  data: Document;
} | {
  success: false;
  errors: z.ZodError;
} {
  const result = DocumentSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}

/**
 * Validate a single block
 */
export function validateBlock(data: unknown): {
  success: true;
  data: Block;
} | {
  success: false;
  errors: z.ZodError;
} {
  const result = BlockSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}

/**
 * Validate a document version
 */
export function validateDocumentVersion(data: unknown): {
  success: true;
  data: DocumentVersion;
} | {
  success: false;
  errors: z.ZodError;
} {
  const result = DocumentVersionSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}
