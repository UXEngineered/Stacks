/**
 * Markdown Compiler — builds `stack.md`
 *
 * Converts a CompiledContext object into a clean, human-readable
 * markdown document suitable for sharing, pasting into docs, or
 * feeding to agents as a text-based brief.
 *
 * Pure function: no side effects.
 */

import type { CompiledContext, CompiledNode } from "./context";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function nodeSection(node: CompiledNode, heading: string): string {
  const lines: string[] = [];
  lines.push(`### ${heading}: ${node.title}`);
  lines.push("");

  if (node.status) {
    lines.push(`**Status:** ${node.status}`);
  }
  if (node.type) {
    lines.push(`**Type:** ${node.type}`);
  }
  if (node.createdAt) {
    lines.push(`**Created:** ${new Date(node.createdAt).toLocaleDateString()}`);
  }
  lines.push("");

  // Use plain text content if available, otherwise raw content
  const text = node.contentText || node.content;
  if (text && text.trim()) {
    lines.push(text.trim());
  } else {
    lines.push("*(No content)*");
  }
  lines.push("");

  return lines.join("\n");
}

function divider(): string {
  return "\n---\n";
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Render a CompiledContext as a markdown document.
 */
export function compileMarkdown(ctx: CompiledContext): string {
  const lines: string[] = [];

  // ── Title ──────────────────────────────────────────────────────────
  lines.push(`# ${ctx.root.title}`);
  lines.push("");
  lines.push(`> Compiled from Stacks on ${new Date(ctx.compiledAt).toLocaleString()}`);
  lines.push(`> Scope: ${ctx.scope} | Target: ${ctx.target}`);
  lines.push("");

  // ── Derivation summary (human) ────────────────────────────────────
  if (ctx.derivationSummary) {
    lines.push("## Derivation Chain");
    lines.push("");
    lines.push(ctx.derivationSummary);
    lines.push("");
  }

  // ── Root node content ─────────────────────────────────────────────
  lines.push("## Content");
  lines.push("");

  const rootText = ctx.root.contentText || ctx.root.content;
  if (rootText && rootText.trim()) {
    lines.push(rootText.trim());
  } else {
    lines.push("*(No content)*");
  }
  lines.push("");

  if (ctx.root.status) {
    lines.push(`**Status:** ${ctx.root.status}`);
    lines.push("");
  }

  // ── Upstream (sources & syntheses) ─────────────────────────────────
  if (ctx.upstream.length > 0) {
    lines.push(divider());
    lines.push("## Upstream Lineage");
    lines.push("");

    const sources = ctx.upstream.filter((n) => n.type === "source");
    const syntheses = ctx.upstream.filter((n) => n.type === "synthesis");
    const other = ctx.upstream.filter(
      (n) => n.type !== "source" && n.type !== "synthesis",
    );

    if (sources.length > 0) {
      lines.push(`### Sources (${sources.length})`);
      lines.push("");
      for (const src of sources) {
        lines.push(nodeSection(src, "Source"));
      }
    }

    if (syntheses.length > 0) {
      lines.push(`### Syntheses (${syntheses.length})`);
      lines.push("");
      for (const syn of syntheses) {
        lines.push(nodeSection(syn, "Synthesis"));
      }
    }

    if (other.length > 0) {
      for (const node of other) {
        lines.push(nodeSection(node, node.type));
      }
    }
  }

  // ── Downstream ─────────────────────────────────────────────────────
  if (ctx.downstream.length > 0) {
    lines.push(divider());
    lines.push("## Downstream");
    lines.push("");
    for (const node of ctx.downstream) {
      lines.push(`- **${node.title}** (${node.type}) — ${node.status || "no status"}`);
    }
    lines.push("");
  }

  // ── Tasks (agent) ──────────────────────────────────────────────────
  if (ctx.tasks && ctx.tasks.length > 0) {
    lines.push(divider());
    lines.push("## Suggested Tasks");
    lines.push("");
    for (const task of ctx.tasks) {
      lines.push(`- [ ] **${task.action}** → \`${task.target}\`: ${task.reason}`);
    }
    lines.push("");
  }

  // ── Graph summary ──────────────────────────────────────────────────
  if (ctx.edges.length > 0) {
    lines.push(divider());
    lines.push("## Lineage Graph");
    lines.push("");
    lines.push("| From | → | To | Relationship |");
    lines.push("|------|---|-----|-------------|");
    for (const edge of ctx.edges) {
      lines.push(`| ${edge.from} | → | ${edge.to} | ${edge.rel} |`);
    }
    lines.push("");
  }

  return lines.join("\n");
}
