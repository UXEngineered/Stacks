/**
 * Fieldbook Document Data Model
 *
 * A typed block structure that supports rich editing while preserving semantics.
 * Designed for structured documents in consulting/strategy contexts.
 *
 * Design principles:
 * - Blocks are the atomic unit of content
 * - Inline formatting is explicit and limited
 * - Semantic meaning is encoded in block types, not arbitrary styling
 * - IDs enable referencing, linking, and change tracking
 */

// =============================================================================
// INLINE CONTENT (text with formatting)
// =============================================================================

/**
 * Inline text formatting marks
 * Limited set to prevent arbitrary styling chaos
 */
export type TextMark = "bold" | "italic" | "code" | "strikethrough";

/**
 * A span of text with optional formatting and links
 * This is the leaf node of our content tree
 */
export interface TextSpan {
  text: string;
  marks?: TextMark[];
  /** Optional link URL - mutually exclusive with marks in most cases */
  href?: string;
}

/**
 * Rich text content is an array of spans
 * Example: [{ text: "Hello " }, { text: "world", marks: ["bold"] }]
 */
export type RichText = TextSpan[];

// =============================================================================
// BLOCK TYPES
// =============================================================================

/**
 * Base block interface - all blocks extend this
 */
interface BaseBlock {
  id: string;
  /** Blocks can be indented for visual hierarchy (0-3 levels) */
  indent?: 0 | 1 | 2 | 3;
}

// -----------------------------------------------------------------------------
// Text blocks
// -----------------------------------------------------------------------------

export interface ParagraphBlock extends BaseBlock {
  type: "paragraph";
  content: RichText;
}

/**
 * Heading levels are semantically constrained
 * - h1: Document/section title (one per doc typically)
 * - h2: Major sections
 * - h3: Subsections
 * No h4-h6 to prevent hierarchy soup
 */
export type HeadingLevel = 1 | 2 | 3;

export interface HeadingBlock extends BaseBlock {
  type: "heading";
  level: HeadingLevel;
  content: RichText;
}

export interface QuoteBlock extends BaseBlock {
  type: "quote";
  content: RichText;
  /** Optional attribution */
  attribution?: string;
}

// -----------------------------------------------------------------------------
// List blocks
// -----------------------------------------------------------------------------

/**
 * List item - can contain rich text and nested items
 */
export interface ListItem {
  id: string;
  content: RichText;
  children?: ListItem[];
}

export interface BulletedListBlock extends BaseBlock {
  type: "bulleted_list";
  items: ListItem[];
}

export interface NumberedListBlock extends BaseBlock {
  type: "numbered_list";
  items: ListItem[];
  /** Starting number, defaults to 1 */
  start?: number;
}

// -----------------------------------------------------------------------------
// Structural blocks
// -----------------------------------------------------------------------------

export interface DividerBlock extends BaseBlock {
  type: "divider";
}

// -----------------------------------------------------------------------------
// Callout blocks (semantic annotations)
// -----------------------------------------------------------------------------

/**
 * Callout intents encode the semantic meaning of highlighted content
 * These are crucial for consulting/strategy docs where capturing
 * decisions, risks, and open questions is essential
 */
export type CalloutIntent =
  | "decision"       // A decision that was made
  | "assumption"     // An assumption being made
  | "open_question"  // Something that needs resolution
  | "constraint"     // A limitation or boundary condition
  | "risk";          // A potential problem or concern

export interface CalloutBlock extends BaseBlock {
  type: "callout";
  intent: CalloutIntent;
  /** Optional title/label for the callout */
  title?: string;
  content: RichText;
}

// -----------------------------------------------------------------------------
// Union type for all blocks
// -----------------------------------------------------------------------------

export type Block =
  | ParagraphBlock
  | HeadingBlock
  | QuoteBlock
  | BulletedListBlock
  | NumberedListBlock
  | DividerBlock
  | CalloutBlock;

export type BlockType = Block["type"];

// =============================================================================
// DOCUMENT STRUCTURE
// =============================================================================

/**
 * Document metadata
 */
export interface DocumentMeta {
  /** Unique document identifier */
  id: string;
  /** Document title (also typically the first h1) */
  title: string;
  /** Optional description/summary */
  description?: string;
  /** Creation timestamp (ISO 8601) */
  createdAt: string;
  /** Last modification timestamp (ISO 8601) */
  updatedAt: string;
  /** Creator user ID */
  createdBy: string;
  /** Tags for organization */
  tags?: string[];
}

/**
 * The complete document structure
 */
export interface Document {
  /** Schema version for forward compatibility */
  schemaVersion: "1.0";
  meta: DocumentMeta;
  /** Ordered array of content blocks */
  blocks: Block[];
}

// =============================================================================
// HELPER TYPES
// =============================================================================

/**
 * Type guard helpers for block discrimination
 */
export function isParagraphBlock(block: Block): block is ParagraphBlock {
  return block.type === "paragraph";
}

export function isHeadingBlock(block: Block): block is HeadingBlock {
  return block.type === "heading";
}

export function isCalloutBlock(block: Block): block is CalloutBlock {
  return block.type === "callout";
}

export function isListBlock(
  block: Block
): block is BulletedListBlock | NumberedListBlock {
  return block.type === "bulleted_list" || block.type === "numbered_list";
}

/**
 * Extract plain text from rich text (strips formatting)
 */
export function richTextToPlain(richText: RichText): string {
  return richText.map((span) => span.text).join("");
}

/**
 * Create a simple rich text from plain string
 */
export function plainToRichText(text: string): RichText {
  return [{ text }];
}
