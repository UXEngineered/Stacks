/**
 * DocumentRef Extension for TipTap
 *
 * An inline node for referencing other Fieldbook documents.
 * Displays as @DocumentName and stores docId + displayName.
 *
 * Usage: Type "@" to trigger autocomplete, select a document
 * Click on a reference to navigate to that document.
 */

import { Node, mergeAttributes } from "@tiptap/react";
import { Plugin, PluginKey } from "@tiptap/pm/state";

export interface DocumentRefOptions {
  HTMLAttributes: Record<string, unknown>;
  /** Callback when a document reference is clicked */
  onDocumentClick?: (docId: string, displayName: string) => void;
  /** Callback when "@" is typed to trigger autocomplete */
  onMentionStart?: (query: string, range: { from: number; to: number }) => void;
  /** Callback when mention query changes */
  onMentionUpdate?: (query: string, range: { from: number; to: number }) => void;
  /** Callback when mention is cancelled */
  onMentionEnd?: () => void;
}

export interface DocumentRefAttributes {
  docId: string;
  displayName: string;
}

declare module "@tiptap/react" {
  interface Commands<ReturnType> {
    documentRef: {
      /**
       * Insert a document reference
       */
      insertDocumentRef: (attrs: DocumentRefAttributes) => ReturnType;
    };
  }
}

export const mentionPluginKey = new PluginKey("documentMention");

export const DocumentRef = Node.create<DocumentRefOptions>({
  name: "documentRef",

  // Inline node, can appear within paragraphs
  group: "inline",
  inline: true,
  selectable: true,
  atom: true, // Cannot be edited, only deleted as a whole

  addOptions() {
    return {
      HTMLAttributes: {},
      onDocumentClick: undefined,
      onMentionStart: undefined,
      onMentionUpdate: undefined,
      onMentionEnd: undefined,
    };
  },

  addAttributes() {
    return {
      docId: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-doc-id"),
        renderHTML: (attributes) => ({
          "data-doc-id": attributes.docId,
        }),
      },
      displayName: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-display-name"),
        renderHTML: (attributes) => ({
          "data-display-name": attributes.displayName,
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-type="document-ref"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        "data-type": "document-ref",
        class: "document-ref",
      }),
      `@${HTMLAttributes["data-display-name"] || "Document"}`,
    ];
  },

  addCommands() {
    return {
      insertDocumentRef:
        (attrs) =>
        ({ commands, state }) => {
          // Get current mention range from plugin state
          const pluginState = mentionPluginKey.getState(state);
          
          if (pluginState?.active && pluginState.range) {
            // Replace the @query text with the document reference
            return commands.insertContentAt(pluginState.range, {
              type: this.name,
              attrs,
            });
          }
          
          // Fallback: insert at current position
          return commands.insertContent({
            type: this.name,
            attrs,
          });
        },
    };
  },

  addProseMirrorPlugins() {
    const { onMentionStart, onMentionUpdate, onMentionEnd } = this.options;

    return [
      new Plugin({
        key: mentionPluginKey,
        state: {
          init() {
            return {
              active: false,
              query: "",
              range: null as { from: number; to: number } | null,
            };
          },
          apply(tr, state) {
            // Check for meta to update state
            const meta = tr.getMeta(mentionPluginKey);
            if (meta !== undefined) {
              return meta;
            }

            // If selection changed and we're active, update the query
            if (state.active && tr.docChanged) {
              // Transaction changed doc, recalculate state
              return {
                active: false,
                query: "",
                range: null,
              };
            }

            return state;
          },
        },
        props: {
          handleTextInput(view, from, to, text) {
            const state = mentionPluginKey.getState(view.state);

            // Starting a new mention with "@"
            if (text === "@" && !state?.active) {
              const tr = view.state.tr;
              tr.setMeta(mentionPluginKey, {
                active: true,
                query: "",
                range: { from, to: from + 1 },
              });
              view.dispatch(tr);
              
              onMentionStart?.("", { from, to: from + 1 });
              return false; // Let the character be inserted
            }

            // If mention is active, update query
            if (state?.active && state.range) {
              // Check if we're still typing after the @
              const $from = view.state.doc.resolve(from);
              const textBefore = $from.parent.textBetween(
                Math.max(0, $from.parentOffset - 50),
                $from.parentOffset,
                ""
              );
              
              const atIndex = textBefore.lastIndexOf("@");
              if (atIndex >= 0) {
                const query = textBefore.substring(atIndex + 1) + text;
                const newFrom = from - (textBefore.length - atIndex);
                
                const tr = view.state.tr;
                tr.setMeta(mentionPluginKey, {
                  active: true,
                  query,
                  range: { from: newFrom, to: to + text.length },
                });
                view.dispatch(tr);
                
                onMentionUpdate?.(query, { from: newFrom, to: to + text.length });
              }
            }

            return false;
          },
          handleKeyDown(view, event) {
            const state = mentionPluginKey.getState(view.state);

            // If mention is active
            if (state?.active) {
              // Escape cancels mention
              if (event.key === "Escape") {
                const tr = view.state.tr;
                tr.setMeta(mentionPluginKey, {
                  active: false,
                  query: "",
                  range: null,
                });
                view.dispatch(tr);
                
                onMentionEnd?.();
                return true;
              }

              // Space without query cancels mention
              if (event.key === " " && !state.query) {
                const tr = view.state.tr;
                tr.setMeta(mentionPluginKey, {
                  active: false,
                  query: "",
                  range: null,
                });
                view.dispatch(tr);
                
                onMentionEnd?.();
                return false;
              }

              // Backspace handling
              if (event.key === "Backspace") {
                if (state.query.length === 0) {
                  // Backspace on empty query cancels mention
                  const tr = view.state.tr;
                  tr.setMeta(mentionPluginKey, {
                    active: false,
                    query: "",
                    range: null,
                  });
                  view.dispatch(tr);
                  
                  onMentionEnd?.();
                  return false;
                } else {
                  // Update query with one less character
                  const newQuery = state.query.slice(0, -1);
                  const tr = view.state.tr;
                  tr.setMeta(mentionPluginKey, {
                    ...state,
                    query: newQuery,
                  });
                  view.dispatch(tr);
                  
                  onMentionUpdate?.(newQuery, state.range!);
                  return false;
                }
              }
            }

            return false;
          },
        },
      }),
    ];
  },

  // Add click handling via NodeView
  addNodeView() {
    return ({ node, HTMLAttributes }) => {
      const dom = document.createElement("span");
      
      Object.entries(
        mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
          "data-type": "document-ref",
          class: "document-ref",
        })
      ).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          dom.setAttribute(key, String(value));
        }
      });

      dom.textContent = `@${node.attrs.displayName || "Document"}`;
      
      // Handle click
      dom.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.options.onDocumentClick?.(
          node.attrs.docId,
          node.attrs.displayName
        );
      });

      return {
        dom,
      };
    };
  },
});
