/**
 * Fieldbook Block Model
 * 
 * A structured JSON format for document content.
 * Designed for:
 * - Schema validation with Zod
 * - AI parsing and generation
 * - Clean separation from editor internals
 */

import { z } from "zod";

// Inline marks that can be applied to text
export const MarkSchema = z.object({
  type: z.enum(["bold", "italic", "underline", "code", "link"]),
  attrs: z.record(z.string()).optional(),
});

export type Mark = z.infer<typeof MarkSchema>;

// Inline content (text with optional marks)
export const TextContentSchema = z.object({
  type: z.literal("text"),
  text: z.string(),
  marks: z.array(MarkSchema).optional(),
});

// Document reference inline node (@DocumentName)
export const DocumentRefSchema = z.object({
  type: z.literal("documentRef"),
  attrs: z.object({
    docId: z.string(),
    displayName: z.string(),
  }),
});

export type DocumentRef = z.infer<typeof DocumentRefSchema>;

// Union of all inline content types
export const InlineContentSchema = z.discriminatedUnion("type", [
  TextContentSchema,
  DocumentRefSchema,
]);

export type InlineContent = z.infer<typeof InlineContentSchema>;

// Block types
export const ParagraphBlockSchema = z.object({
  type: z.literal("paragraph"),
  content: z.array(InlineContentSchema).optional(),
});

export const HeadingBlockSchema = z.object({
  type: z.literal("heading"),
  attrs: z.object({
    level: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  }),
  content: z.array(InlineContentSchema).optional(),
});

export const BulletListBlockSchema = z.object({
  type: z.literal("bulletList"),
  content: z.array(z.object({
    type: z.literal("listItem"),
    content: z.array(z.lazy(() => BlockSchema)).optional(),
  })),
});

export const OrderedListBlockSchema = z.object({
  type: z.literal("orderedList"),
  content: z.array(z.object({
    type: z.literal("listItem"),
    content: z.array(z.lazy(() => BlockSchema)).optional(),
  })),
});

export const BlockquoteBlockSchema = z.object({
  type: z.literal("blockquote"),
  content: z.array(z.lazy(() => BlockSchema)).optional(),
});

// Callout variants for Fieldbook semantic blocks
export const CalloutVariants = [
  "info",
  "warning", 
  "success",
  "error",
  "decision",
  "assumption",
  "question",
  "constraint",
  "risk",
] as const;

export type CalloutVariant = typeof CalloutVariants[number];

export const CalloutBlockSchema = z.object({
  type: z.literal("callout"),
  attrs: z.object({
    variant: z.enum(CalloutVariants).default("info"),
  }),
  content: z.array(z.lazy(() => BlockSchema)).optional(),
});

export const CodeBlockSchema = z.object({
  type: z.literal("codeBlock"),
  attrs: z.object({
    language: z.string().optional(),
  }).optional(),
  content: z.array(InlineContentSchema).optional(),
});

export const HorizontalRuleBlockSchema = z.object({
  type: z.literal("horizontalRule"),
});

export const ImageBlockSchema = z.object({
  type: z.literal("image"),
  attrs: z.object({
    src: z.string(),
    alt: z.string().optional(),
    title: z.string().optional(),
  }),
});

// Union of all block types
export const BlockSchema: z.ZodType<Block> = z.lazy(() =>
  z.discriminatedUnion("type", [
    ParagraphBlockSchema,
    HeadingBlockSchema,
    BulletListBlockSchema,
    OrderedListBlockSchema,
    BlockquoteBlockSchema,
    CalloutBlockSchema,
    CodeBlockSchema,
    HorizontalRuleBlockSchema,
    ImageBlockSchema,
  ])
);

export type Block =
  | z.infer<typeof ParagraphBlockSchema>
  | z.infer<typeof HeadingBlockSchema>
  | z.infer<typeof BulletListBlockSchema>
  | z.infer<typeof OrderedListBlockSchema>
  | z.infer<typeof BlockquoteBlockSchema>
  | z.infer<typeof CalloutBlockSchema>
  | z.infer<typeof CodeBlockSchema>
  | z.infer<typeof HorizontalRuleBlockSchema>
  | z.infer<typeof ImageBlockSchema>;

// Complete document structure
export const FieldbookDocumentSchema = z.object({
  type: z.literal("doc"),
  content: z.array(BlockSchema),
});

export type FieldbookDocument = z.infer<typeof FieldbookDocumentSchema>;

/**
 * Create an empty document
 */
export function createEmptyDocument(): FieldbookDocument {
  return {
    type: "doc",
    content: [{ type: "paragraph" }],
  };
}

/**
 * Validate a document against the schema
 */
export function validateDocument(doc: unknown): FieldbookDocument | null {
  const result = FieldbookDocumentSchema.safeParse(doc);
  return result.success ? result.data : null;
}
