/**
 * Converter between TipTap JSON and Fieldbook Block Model
 * 
 * TipTap's JSON format is very close to our model since both
 * are based on ProseMirror's document structure. The main
 * differences are:
 * - We use "callout" instead of a custom node name
 * - We normalize some attribute names
 * - We validate against our schema
 */

import type { JSONContent } from "@tiptap/react";
import type { FieldbookDocument, Block, InlineContent, Mark, DocumentRef } from "./types";
import { validateDocument } from "./types";

/**
 * Convert TipTap JSON to Fieldbook document format
 */
export function tiptapToFieldbook(tiptapDoc: JSONContent): FieldbookDocument {
  const converted = convertNode(tiptapDoc) as FieldbookDocument;
  
  // Validate and return, or return empty doc if invalid
  const validated = validateDocument(converted);
  if (!validated) {
    console.warn("Document failed validation, returning as-is");
    return converted;
  }
  return validated;
}

/**
 * Convert Fieldbook document to TipTap JSON format
 */
export function fieldbookToTiptap(doc: FieldbookDocument): JSONContent {
  // Our format is compatible with TipTap's JSON structure
  // We just need to ensure the structure matches
  return convertToTiptap(doc);
}

function convertNode(node: JSONContent): Block | FieldbookDocument | InlineContent {
  switch (node.type) {
    case "doc":
      return {
        type: "doc",
        content: (node.content || []).map(convertNode) as Block[],
      };

    case "paragraph":
      return {
        type: "paragraph",
        content: node.content?.map(convertInlineContent),
      };

    case "heading":
      return {
        type: "heading",
        attrs: {
          level: (node.attrs?.level as 1 | 2 | 3) || 1,
        },
        content: node.content?.map(convertInlineContent),
      };

    case "bulletList":
      return {
        type: "bulletList",
        content: (node.content || []).map((item) => ({
          type: "listItem" as const,
          content: item.content?.map(convertNode) as Block[],
        })),
      };

    case "orderedList":
      return {
        type: "orderedList",
        content: (node.content || []).map((item) => ({
          type: "listItem" as const,
          content: item.content?.map(convertNode) as Block[],
        })),
      };

    case "blockquote":
      return {
        type: "blockquote",
        content: (node.content || []).map(convertNode) as Block[],
      };

    case "callout":
      return {
        type: "callout",
        attrs: {
          variant: node.attrs?.variant || "info",
        },
        content: (node.content || []).map(convertNode) as Block[],
      };

    case "codeBlock":
      return {
        type: "codeBlock",
        attrs: {
          language: node.attrs?.language,
        },
        content: node.content?.map(convertInlineContent),
      };

    case "horizontalRule":
      return {
        type: "horizontalRule",
      };

    default:
      // Fallback to paragraph
      return {
        type: "paragraph",
        content: node.content?.map(convertInlineContent),
      };
  }
}

function convertInlineContent(node: JSONContent): InlineContent {
  // Handle document reference nodes
  if (node.type === "documentRef") {
    return {
      type: "documentRef",
      attrs: {
        docId: String(node.attrs?.docId || ""),
        displayName: String(node.attrs?.displayName || ""),
      },
    } as DocumentRef;
  }

  // Default to text node
  return {
    type: "text",
    text: node.text || "",
    marks: node.marks?.map(convertMark),
  };
}

function convertMark(mark: { type: string; attrs?: Record<string, unknown> }): Mark {
  const type = mark.type as Mark["type"];
  
  if (type === "link" && mark.attrs) {
    return {
      type: "link",
      attrs: {
        href: String(mark.attrs.href || ""),
        target: mark.attrs.target ? String(mark.attrs.target) : undefined,
      },
    };
  }

  return { type };
}

function convertToTiptap(node: FieldbookDocument | Block | InlineContent): JSONContent {
  // Handle text nodes
  if ("text" in node && node.type === "text") {
    return {
      type: "text",
      text: node.text,
      marks: node.marks?.map((mark) => ({
        type: mark.type,
        attrs: mark.attrs,
      })),
    };
  }

  // Handle document reference nodes
  if (node.type === "documentRef") {
    return {
      type: "documentRef",
      attrs: {
        docId: node.attrs.docId,
        displayName: node.attrs.displayName,
      },
    };
  }

  const block = node as FieldbookDocument | Block;

  switch (block.type) {
    case "doc":
      return {
        type: "doc",
        content: block.content.map(convertToTiptap),
      };

    case "paragraph":
      return {
        type: "paragraph",
        content: block.content?.map(convertToTiptap),
      };

    case "heading":
      return {
        type: "heading",
        attrs: { level: block.attrs.level },
        content: block.content?.map(convertToTiptap),
      };

    case "bulletList":
      return {
        type: "bulletList",
        content: block.content.map((item) => ({
          type: "listItem",
          content: item.content?.map(convertToTiptap),
        })),
      };

    case "orderedList":
      return {
        type: "orderedList",
        content: block.content.map((item) => ({
          type: "listItem",
          content: item.content?.map(convertToTiptap),
        })),
      };

    case "blockquote":
      return {
        type: "blockquote",
        content: block.content?.map(convertToTiptap),
      };

    case "callout":
      return {
        type: "callout",
        attrs: { variant: block.attrs.variant },
        content: block.content?.map(convertToTiptap),
      };

    case "codeBlock":
      return {
        type: "codeBlock",
        attrs: block.attrs,
        content: block.content?.map(convertToTiptap),
      };

    case "horizontalRule":
      return {
        type: "horizontalRule",
      };

    default:
      return { type: "paragraph" };
  }
}
