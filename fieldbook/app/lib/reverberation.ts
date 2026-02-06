/**
 * Reverberation (Propagation) Utilities for Stacks
 * 
 * When a Source changes, downstream Syntheses and Artifacts that depend on it
 * should be recalibrated. This module provides:
 * - Token rendering: Replace {{TOKEN}} placeholders with fact values
 * - Diff computation: Track what changed between versions
 * - Propagation logic: Identify and update dependent items
 * 
 * No AI - uses deterministic token substitution for demo purposes.
 */

import type { DiffSummary, Fieldbook, Source, Synthesis, Artifact, RecalcStatus } from "./db/types";

/**
 * Render a template string by replacing {{TOKEN}} placeholders with fact values
 * 
 * @param template - Content with {{TOKEN}} placeholders
 * @param facts - Key-value pairs for token substitution
 * @returns Rendered content with tokens replaced
 */
export function renderTemplate(template: string, facts: Record<string, string>): string {
  if (!template) return template;
  
  // Match {{TOKEN_NAME}} patterns
  return template.replace(/\{\{(\w+)\}\}/g, (match, token) => {
    if (token in facts) {
      return facts[token];
    }
    // Leave unmatched tokens as-is (or could use "(missing)")
    return match;
  });
}

/**
 * Extract all token names from a template string
 * 
 * @param template - Content with {{TOKEN}} placeholders
 * @returns Array of unique token names
 */
export function extractTokens(template: string): string[] {
  if (!template) return [];
  
  const matches = template.match(/\{\{(\w+)\}\}/g);
  if (!matches) return [];
  
  // Extract token names and dedupe
  const tokens = matches.map(m => m.slice(2, -2));
  return [...new Set(tokens)];
}

/**
 * Check if a template contains any tokens
 */
export function hasTokens(template: string): boolean {
  if (!template) return false;
  return /\{\{(\w+)\}\}/.test(template);
}

/**
 * Compute a simple diff between two strings
 * Finds the first and last positions where they differ and extracts the changed segments.
 * 
 * @param prev - Previous content
 * @param next - New content
 * @returns DiffSummary or null if no change
 */
export function computeDiff(prev: string, next: string): DiffSummary | null {
  if (prev === next) return null;
  
  // Find first differing character
  let start = 0;
  const minLen = Math.min(prev.length, next.length);
  while (start < minLen && prev[start] === next[start]) {
    start++;
  }
  
  // Find last differing character (from end)
  let prevEnd = prev.length;
  let nextEnd = next.length;
  while (prevEnd > start && nextEnd > start && prev[prevEnd - 1] === next[nextEnd - 1]) {
    prevEnd--;
    nextEnd--;
  }
  
  // Extract the changed portions
  const before = prev.slice(start, prevEnd);
  const after = next.slice(start, nextEnd);
  
  // Generate human-friendly message
  let message: string;
  if (before && after) {
    // Look for simple value changes like "30%" -> "40%"
    const beforeTrimmed = before.trim();
    const afterTrimmed = after.trim();
    if (beforeTrimmed.length < 50 && afterTrimmed.length < 50) {
      message = `Updated from "${beforeTrimmed}" to "${afterTrimmed}" due to Source change`;
    } else {
      message = "Content updated due to upstream Source change";
    }
  } else if (!before && after) {
    message = "Content added due to upstream Source change";
  } else if (before && !after) {
    message = "Content removed due to upstream Source change";
  } else {
    message = "Content updated due to upstream Source change";
  }
  
  return {
    before,
    after,
    start,
    end: prevEnd,
    message,
  };
}

/**
 * Result of a propagation operation
 */
export interface PropagationResult {
  updatedSourceIds: string[];
  updatedSynthesisIds: string[];
  updatedArtifactIds: string[];
  fieldbook: Fieldbook;
}

/**
 * Propagate changes from a Source to all dependent Syntheses and Artifacts
 * 
 * When a Source is saved:
 * 1. Re-render the Source's content from its template
 * 2. Find all Syntheses derived from this Source - mark as recalibrating
 * 3. Re-render each Synthesis and compute diffs
 * 4. Find all Artifacts informed by the Source or affected Syntheses
 * 5. Re-render each Artifact and compute diffs
 * 
 * @param fieldbook - The fieldbook containing all items
 * @param sourceId - The ID of the Source that was changed
 * @returns Updated fieldbook and lists of affected item IDs
 */
export function propagateFromSource(
  fieldbook: Fieldbook,
  sourceId: string
): PropagationResult {
  const facts = fieldbook.facts || {};
  const now = new Date().toISOString();
  
  const updatedSourceIds: string[] = [];
  const updatedSynthesisIds: string[] = [];
  const updatedArtifactIds: string[] = [];
  
  console.log("[Reverberation] propagateFromSource called for:", sourceId);
  console.log("[Reverberation] Facts:", facts);
  
  // Get the triggering source info for diff attribution
  const triggeringSource = fieldbook.sources.find(s => s.id === sourceId);
  const sourceTitle = triggeringSource?.title || "Unknown Source";
  
  // Try to extract a meaningful snippet from the source content for context
  // This helps users understand what changed when there's no direct token-based change
  let sourceChangeSnippet: string | undefined;
  if (triggeringSource?.content) {
    try {
      const parsed = JSON.parse(triggeringSource.content);
      if (parsed.content && Array.isArray(parsed.content)) {
        // Extract text from first few paragraphs
        const textParts: string[] = [];
        for (const node of parsed.content.slice(0, 3)) {
          if (node.content && Array.isArray(node.content)) {
            for (const child of node.content) {
              if (child.text) {
                textParts.push(child.text);
              }
            }
          }
        }
        if (textParts.length > 0) {
          sourceChangeSnippet = textParts.join(" ").slice(0, 150);
        }
      }
    } catch {
      // Plain text content - use first 150 chars
      sourceChangeSnippet = triggeringSource.content.slice(0, 150);
    }
  }
  
  // Helper to add source info to a diff
  const addSourceInfo = (diff: DiffSummary | null, includeSnippet = false): DiffSummary | null => {
    if (!diff) return null;
    return {
      ...diff,
      triggeredBySourceId: sourceId,
      triggeredBySourceTitle: sourceTitle,
      ...(includeSnippet && sourceChangeSnippet ? { sourceChangeSnippet } : {}),
    };
  };
  
  // Create a mutable copy of the fieldbook
  const updated: Fieldbook = {
    ...fieldbook,
    sources: fieldbook.sources.map(s => ({ ...s })),
    syntheses: fieldbook.syntheses.map(s => ({ ...s })),
    artifacts: fieldbook.artifacts.map(a => ({ ...a })),
  };
  
  // 1. Update the source itself (if it has tokens)
  const sourceIdx = updated.sources.findIndex(s => s.id === sourceId);
  if (sourceIdx !== -1) {
    const source = updated.sources[sourceIdx];
    const template = source.contentTemplate || source.content;
    
    console.log("[Reverberation] Source has tokens:", hasTokens(template));
    
    if (hasTokens(template)) {
      const prevRendered = source.contentRendered || source.content;
      const newRendered = renderTemplate(template, facts);
      
      if (newRendered !== prevRendered) {
        console.log("[Reverberation] Source content changed");
        updated.sources[sourceIdx] = {
          ...source,
          contentTemplate: template,
          contentRendered: newRendered,
          content: newRendered, // Keep content in sync
          lastRenderedAt: now,
          recalcStatus: "recalibrating",
          lastDiff: addSourceInfo(computeDiff(prevRendered, newRendered)),
        };
        updatedSourceIds.push(sourceId);
      }
    }
  }
  
  // 2. Find and update dependent Syntheses
  // Always mark as recalibrating if they derive from the changed source
  updated.syntheses.forEach((synthesis, idx) => {
    if (synthesis.derivedFrom?.includes(sourceId)) {
      console.log("[Reverberation] Synthesis", synthesis.id, "derives from changed source");
      const template = synthesis.contentTemplate || synthesis.content;
      
      if (hasTokens(template)) {
        const prevRendered = synthesis.contentRendered || synthesis.content;
        const newRendered = renderTemplate(template, facts);
        
        if (newRendered !== prevRendered) {
          console.log("[Reverberation] Synthesis content changed");
          updated.syntheses[idx] = {
            ...synthesis,
            contentTemplate: template,
            contentRendered: newRendered,
            content: newRendered,
            lastRenderedAt: now,
            recalcStatus: "recalibrating",
            lastDiff: addSourceInfo(computeDiff(prevRendered, newRendered)),
          };
          updatedSynthesisIds.push(synthesis.id);
        } else {
          // Mark as recalibrating and set a minimal lastDiff to indicate upstream changed
          console.log("[Reverberation] Synthesis marked recalibrating (no content change)");
          updated.syntheses[idx] = {
            ...synthesis,
            recalcStatus: "recalibrating",
            lastRenderedAt: now,
            lastDiff: addSourceInfo({
              before: "",
              after: "",
              start: 0,
              end: 0,
              message: "Upstream Source was updated - review for accuracy",
            }, true), // Include source snippet for context
          };
          updatedSynthesisIds.push(synthesis.id);
        }
      } else {
        // No tokens but still mark as recalibrating with a notification (upstream changed)
        console.log("[Reverberation] Synthesis marked recalibrating (no tokens)");
        updated.syntheses[idx] = {
          ...synthesis,
          recalcStatus: "recalibrating",
          lastRenderedAt: now,
          lastDiff: addSourceInfo({
            before: "",
            after: "",
            start: 0,
            end: 0,
            message: "Upstream Source was updated - review for accuracy",
          }, true), // Include source snippet for context
        };
        updatedSynthesisIds.push(synthesis.id);
      }
    }
  });
  
  // 3. Find and update dependent Artifacts
  // Artifacts can be informed by Sources directly OR by affected Syntheses
  const affectedSynthesisSet = new Set(updatedSynthesisIds);
  
  updated.artifacts.forEach((artifact, idx) => {
    const informedBySource = artifact.informedBy?.includes(sourceId);
    const informedByAffectedSynthesis = artifact.informedBy?.some(id => 
      affectedSynthesisSet.has(id) || 
      updated.syntheses.some(s => s.id === id && s.derivedFrom?.includes(sourceId))
    );
    
    if (informedBySource || informedByAffectedSynthesis) {
      console.log("[Reverberation] Artifact", artifact.id, "is informed by changed source/synthesis");
      const template = artifact.contentTemplate || artifact.content;
      
      if (hasTokens(template)) {
        const prevRendered = artifact.contentRendered || artifact.content;
        const newRendered = renderTemplate(template, facts);
        
        if (newRendered !== prevRendered) {
          console.log("[Reverberation] Artifact content changed");
          updated.artifacts[idx] = {
            ...artifact,
            contentTemplate: template,
            contentRendered: newRendered,
            content: newRendered,
            lastRenderedAt: now,
            recalcStatus: "recalibrating",
            lastDiff: addSourceInfo(computeDiff(prevRendered, newRendered)),
          };
          updatedArtifactIds.push(artifact.id);
        } else {
          // Mark as recalibrating and set a minimal lastDiff to indicate upstream changed
          console.log("[Reverberation] Artifact marked recalibrating (no content change)");
          updated.artifacts[idx] = {
            ...artifact,
            recalcStatus: "recalibrating",
            lastRenderedAt: now,
            lastDiff: addSourceInfo({
              before: "",
              after: "",
              start: 0,
              end: 0,
              message: "Upstream Source was updated - review for accuracy",
            }, true), // Include source snippet for context
          };
          updatedArtifactIds.push(artifact.id);
        }
      } else {
        // No tokens but still mark as recalibrating with a notification (upstream changed)
        console.log("[Reverberation] Artifact marked recalibrating (no tokens)");
        updated.artifacts[idx] = {
          ...artifact,
          recalcStatus: "recalibrating",
          lastRenderedAt: now,
          lastDiff: addSourceInfo({
            before: "",
            after: "",
            start: 0,
            end: 0,
            message: "Upstream Source was updated - review for accuracy",
          }, true), // Include source snippet for context
        };
        updatedArtifactIds.push(artifact.id);
      }
    }
  });
  
  return {
    updatedSourceIds,
    updatedSynthesisIds,
    updatedArtifactIds,
    fieldbook: updated,
  };
}

/**
 * Mark all recalibrating items as calibrated
 * Call this after the recalibration animation completes
 */
export function markCalibrated(fieldbook: Fieldbook): Fieldbook {
  return {
    ...fieldbook,
    sources: fieldbook.sources.map(s => 
      s.recalcStatus === "recalibrating" ? { ...s, recalcStatus: "calibrated" as RecalcStatus } : s
    ),
    syntheses: fieldbook.syntheses.map(s => 
      s.recalcStatus === "recalibrating" ? { ...s, recalcStatus: "calibrated" as RecalcStatus } : s
    ),
    artifacts: fieldbook.artifacts.map(a => 
      a.recalcStatus === "recalibrating" ? { ...a, recalcStatus: "calibrated" as RecalcStatus } : a
    ),
  };
}

/**
 * Reset all items to idle state
 * Call this after showing the calibrated badge
 */
export function markIdle(fieldbook: Fieldbook): Fieldbook {
  return {
    ...fieldbook,
    sources: fieldbook.sources.map(s => 
      s.recalcStatus === "calibrated" ? { ...s, recalcStatus: "idle" as RecalcStatus } : s
    ),
    syntheses: fieldbook.syntheses.map(s => 
      s.recalcStatus === "calibrated" ? { ...s, recalcStatus: "idle" as RecalcStatus } : s
    ),
    artifacts: fieldbook.artifacts.map(a => 
      a.recalcStatus === "calibrated" ? { ...a, recalcStatus: "idle" as RecalcStatus } : a
    ),
  };
}

/**
 * Initialize contentRendered for all items that have templates but no rendered content
 * Call on app startup to ensure all content is properly rendered
 */
export function initializeRenderedContent(fieldbook: Fieldbook): Fieldbook {
  const facts = fieldbook.facts || {};
  const now = new Date().toISOString();
  
  return {
    ...fieldbook,
    sources: fieldbook.sources.map(s => {
      if (s.contentTemplate && !s.contentRendered) {
        return {
          ...s,
          contentRendered: renderTemplate(s.contentTemplate, facts),
          content: renderTemplate(s.contentTemplate, facts),
          lastRenderedAt: now,
          recalcStatus: "idle" as RecalcStatus,
        };
      }
      return s;
    }),
    syntheses: fieldbook.syntheses.map(s => {
      if (s.contentTemplate && !s.contentRendered) {
        return {
          ...s,
          contentRendered: renderTemplate(s.contentTemplate, facts),
          content: renderTemplate(s.contentTemplate, facts),
          lastRenderedAt: now,
          recalcStatus: "idle" as RecalcStatus,
        };
      }
      return s;
    }),
    artifacts: fieldbook.artifacts.map(a => {
      if (a.contentTemplate && !a.contentRendered) {
        return {
          ...a,
          contentRendered: renderTemplate(a.contentTemplate, facts),
          content: renderTemplate(a.contentTemplate, facts),
          lastRenderedAt: now,
          recalcStatus: "idle" as RecalcStatus,
        };
      }
      return a;
    }),
  };
}

/**
 * Update a fact value and propagate to all items that use it
 */
export function updateFact(
  fieldbook: Fieldbook,
  factKey: string,
  factValue: string
): Fieldbook {
  const newFacts = {
    ...fieldbook.facts,
    [factKey]: factValue,
  };
  
  const now = new Date().toISOString();
  
  // Re-render all items that might use this fact
  const updated: Fieldbook = {
    ...fieldbook,
    facts: newFacts,
    sources: fieldbook.sources.map(s => {
      const template = s.contentTemplate || s.content;
      if (hasTokens(template) && template.includes(`{{${factKey}}}`)) {
        const prevRendered = s.contentRendered || s.content;
        const newRendered = renderTemplate(template, newFacts);
        if (newRendered !== prevRendered) {
          return {
            ...s,
            contentRendered: newRendered,
            content: newRendered,
            lastRenderedAt: now,
            recalcStatus: "recalibrating" as RecalcStatus,
            lastDiff: computeDiff(prevRendered, newRendered),
          };
        }
      }
      return s;
    }),
    syntheses: fieldbook.syntheses.map(s => {
      const template = s.contentTemplate || s.content;
      if (hasTokens(template) && template.includes(`{{${factKey}}}`)) {
        const prevRendered = s.contentRendered || s.content;
        const newRendered = renderTemplate(template, newFacts);
        if (newRendered !== prevRendered) {
          return {
            ...s,
            contentRendered: newRendered,
            content: newRendered,
            lastRenderedAt: now,
            recalcStatus: "recalibrating" as RecalcStatus,
            lastDiff: computeDiff(prevRendered, newRendered),
          };
        }
      }
      return s;
    }),
    artifacts: fieldbook.artifacts.map(a => {
      const template = a.contentTemplate || a.content;
      if (hasTokens(template) && template.includes(`{{${factKey}}}`)) {
        const prevRendered = a.contentRendered || a.content;
        const newRendered = renderTemplate(template, newFacts);
        if (newRendered !== prevRendered) {
          return {
            ...a,
            contentRendered: newRendered,
            content: newRendered,
            lastRenderedAt: now,
            recalcStatus: "recalibrating" as RecalcStatus,
            lastDiff: computeDiff(prevRendered, newRendered),
          };
        }
      }
      return a;
    }),
  };
  
  return updated;
}
