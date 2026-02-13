/**
 * Bundle Compiler — builds `bundle.zip`
 *
 * Packages context.json + stack.md + lineage.json into a single zip file.
 * Uses JSZip for zip creation.
 *
 * Returns a Uint8Array that can be sent as a binary response or saved to disk.
 */

import type { LineageNode } from "../lineage/walker";
import { compileContext } from "./context";
import type { CompileTarget, CompileScope, CompiledContext } from "./context";
import { compileMarkdown } from "./markdown";
import { compileLineage } from "./lineage";
import type { CompiledLineage } from "./lineage";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BundleOptions {
  nodeId: string;
  target: CompileTarget;
  scope: CompileScope;
}

export interface BundleResult {
  /** The zip file contents as a Uint8Array */
  zip: Uint8Array;
  /** The individual compiled outputs (for inspection/logging) */
  context: CompiledContext;
  markdown: string;
  lineage: CompiledLineage;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Compile all three formats and bundle them into a zip.
 *
 * @param items   - All items in the fieldbook
 * @param options - What to compile
 * @returns       - The zip as Uint8Array plus the individual outputs
 */
export async function compileBundle(
  items: LineageNode[],
  options: BundleOptions,
): Promise<BundleResult> {
  // Compile all three outputs
  const context = compileContext(items, {
    nodeId: options.nodeId,
    target: options.target,
    scope: options.scope,
  });
  const markdown = compileMarkdown(context);
  const lineage = compileLineage(options.nodeId, items, options.scope);

  // Dynamically import JSZip (only needed for bundle, avoid loading for other compilers)
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();

  // Sanitize the title for the folder name
  const folderName = context.root.title
    .replace(/[^a-z0-9\s-]/gi, "")
    .replace(/\s+/g, "-")
    .toLowerCase()
    .slice(0, 50) || "stacks-bundle";

  const folder = zip.folder(folderName)!;
  folder.file("context.json", JSON.stringify(context, null, 2));
  folder.file("stack.md", markdown);
  folder.file("lineage.json", JSON.stringify(lineage, null, 2));

  // Add a small README
  folder.file(
    "README.md",
    [
      `# ${context.root.title}`,
      "",
      `Compiled from Stacks on ${new Date(context.compiledAt).toLocaleString()}`,
      "",
      "## Contents",
      "",
      "- **context.json** — Structured context (metadata, content, lineage, tasks)",
      "- **stack.md** — Human-readable markdown brief",
      "- **lineage.json** — Graph of upstream/downstream nodes and edges",
      "",
      `Scope: ${options.scope} | Target: ${options.target}`,
    ].join("\n"),
  );

  const zipData = await zip.generateAsync({ type: "uint8array" });

  return {
    zip: zipData,
    context,
    markdown,
    lineage,
  };
}
