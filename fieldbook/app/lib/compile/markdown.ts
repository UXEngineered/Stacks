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

  const meta: string[] = [];
  if (node.status) meta.push(`**Status:** ${node.status}`);
  if (node.visibility) meta.push(`**Visibility:** ${node.visibility}`);
  if (node.type) meta.push(`**Type:** ${node.type}`);
  if (node.tags && node.tags.length > 0) meta.push(`**Tags:** ${node.tags.join(", ")}`);
  if (node.owner) meta.push(`**Owner:** ${node.owner}`);
  if (node.createdAt) meta.push(`**Created:** ${new Date(node.createdAt).toLocaleDateString()}`);
  if (meta.length > 0) {
    lines.push(meta.join("  \n"));
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

  const rootMeta: string[] = [];
  if (ctx.root.status) rootMeta.push(`**Status:** ${ctx.root.status}`);
  if (ctx.root.visibility) rootMeta.push(`**Visibility:** ${ctx.root.visibility}`);
  if (ctx.root.tags && ctx.root.tags.length > 0) rootMeta.push(`**Tags:** ${ctx.root.tags.join(", ")}`);
  if (ctx.root.owner) rootMeta.push(`**Owner:** ${ctx.root.owner}`);
  if (rootMeta.length > 0) {
    lines.push(rootMeta.join("  \n"));
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
      lines.push(`- **${node.title}** (${node.type}) — ${node.status || "no status"}${node.visibility ? ` [${node.visibility}]` : ""}`);
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
