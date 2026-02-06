/**
 * Callout Extension for TipTap
 * 
 * A custom block node for callouts/admonitions with Fieldbook variants:
 * - info (default) - general information
 * - warning - cautions and warnings
 * - success - positive outcomes
 * - error - errors and issues
 * - decision - key decisions made
 * - assumption - underlying assumptions
 * - question - open questions to resolve
 * - constraint - limitations and constraints
 * - risk - identified risks
 */

import { Node, mergeAttributes } from "@tiptap/react";

export type CalloutVariant = 
  | "info" 
  | "warning" 
  | "success" 
  | "error"
  | "decision"
  | "assumption"
  | "question"
  | "constraint"
  | "risk";

export interface CalloutOptions {
  HTMLAttributes: Record<string, unknown>;
}

declare module "@tiptap/react" {
  interface Commands<ReturnType> {
    callout: {
      setCallout: (attrs?: { variant?: CalloutVariant }) => ReturnType;
      toggleCallout: (attrs?: { variant?: CalloutVariant }) => ReturnType;
      insertCallout: (attrs?: { variant?: CalloutVariant }) => ReturnType;
    };
  }
}

export const Callout = Node.create<CalloutOptions>({
  name: "callout",

  group: "block",

  content: "block+",

  defining: true,

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      variant: {
        default: "info",
        parseHTML: (element) => element.getAttribute("data-variant") || "info",
        renderHTML: (attributes) => ({
          "data-variant": attributes.variant,
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="callout"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        "data-type": "callout",
      }),
      0,
    ];
  },

  addCommands() {
    return {
      setCallout:
        (attrs) =>
        ({ commands }) => {
          return commands.wrapIn(this.name, attrs);
        },
      toggleCallout:
        (attrs) =>
        ({ commands }) => {
          return commands.toggleWrap(this.name, attrs);
        },
      insertCallout:
        (attrs) =>
        ({ chain }) => {
          return chain()
            .insertContent({
              type: this.name,
              attrs,
              content: [{ type: "paragraph" }],
            })
            .focus()
            .run();
        },
    };
  },

  addKeyboardShortcuts() {
    return {
      "Mod-Shift-c": () => this.editor.commands.toggleCallout(),
    };
  },
});
