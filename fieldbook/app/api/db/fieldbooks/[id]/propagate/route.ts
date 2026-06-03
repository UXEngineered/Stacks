/**
 * Propagation API Endpoint
 * 
 * POST /api/db/fieldbooks/[id]/propagate
 * Triggers reverberation when a Source is updated.
 * Also generates AI suggestions for affected downstream items.
 * 
 * Body: { sourceId: string, newFacts?: Record<string, string> }
 * 
 * PATCH /api/db/fieldbooks/[id]/propagate
 * Updates recalc status (e.g., mark items as calibrated or idle)
 * 
 * Body: { status: "calibrated" | "idle" }
 */

import { NextRequest, NextResponse } from "next/server";
import { getFieldbook, saveData, loadData } from "@/app/lib/db";
import { 
  propagateFromSource, 
  markCalibrated, 
  markIdle, 
  updateFact,
  initializeRenderedContent 
} from "@/app/lib/reverberation";
import { PORTKEY_GATEWAY_URL, createHeaders } from "portkey-ai";

const PORTKEY_API_KEY = process.env.PORTKEY_API_KEY;
const PORTKEY_VIRTUAL_KEY = process.env.PORTKEY_VIRTUAL_KEY;

/**
 * Generate an AI suggestion for how to update downstream content
 */
async function generateAISuggestion(
  sourceTitle: string,
  sourceContent: string,
  downstreamTitle: string,
  downstreamContent: string,
  downstreamType: "synthesis" | "artifact"
): Promise<{ changeDescription: string; suggestedAction: string; targetSection?: string } | null> {
  if (!PORTKEY_API_KEY || !PORTKEY_VIRTUAL_KEY) {
    return null;
  }

  try {
    // Extract text from JSON content
    const extractText = (content: string): string => {
      try {
        const parsed = JSON.parse(content);
        if (parsed.content && Array.isArray(parsed.content)) {
          const textParts: string[] = [];
          const extract = (nodes: any[]): void => {
            for (const node of nodes) {
              if (node.text) textParts.push(node.text);
              if (node.content) extract(node.content);
            }
          };
          extract(parsed.content);
          return textParts.join(" ").slice(0, 2000);
        }
        return content.slice(0, 2000);
      } catch {
        return content.slice(0, 2000);
      }
    };

    // Extract section names from downstream content
    const extractSections = (content: string): string[] => {
      const sections: string[] = [];
      try {
        const parsed = JSON.parse(content);
        if (parsed.content) {
          for (const node of parsed.content) {
            if (node.type === "heading" && node.content?.[0]?.text) {
              sections.push(node.content[0].text);
            }
          }
        }
      } catch {
        // ignore
      }
      return sections;
    };

    const sourceText = extractText(sourceContent);
    const downstreamText = extractText(downstreamContent);
    const sections = extractSections(downstreamContent);

    const systemPrompt = `You analyze upstream source changes and suggest how downstream documents should be updated. Be specific and reference actual content. Output JSON only:
{"changeDescription": "Brief summary of source content/stance", "suggestedAction": "Conversational question about updating specific section", "targetSection": "Section name if applicable"}`;

    const userPrompt = `SOURCE "${sourceTitle}": ${sourceText.slice(0, 1500)}

DOWNSTREAM ${downstreamType.toUpperCase()} "${downstreamTitle}"${sections.length > 0 ? ` (Sections: ${sections.join(", ")})` : ""}: ${downstreamText.slice(0, 1000)}`;

    const response = await fetch(`${PORTKEY_GATEWAY_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...createHeaders({
          apiKey: PORTKEY_API_KEY,
          virtualKey: PORTKEY_VIRTUAL_KEY,
        }),
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.4,
        max_tokens: 300,
      }),
    });

    if (!response.ok) {
      console.error("[Propagate AI] API error:", await response.text());
      return null;
    }

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content?.trim();
    if (!content) return null;

    // Strip markdown code blocks
    if (content.startsWith("```")) {
      content = content.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
    }

    return JSON.parse(content);
  } catch (error) {
    console.error("[Propagate AI] Error generating suggestion:", error);
    return null;
  }
}

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST - Trigger propagation from a source change
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { sourceId, newFacts, prevSourceContent } = body;
    
    if (!sourceId && !newFacts) {
      return NextResponse.json(
        { error: "Either sourceId or newFacts is required" },
        { status: 400 }
      );
    }
    
    const fieldbook = await getFieldbook(id);
    if (!fieldbook) {
      return NextResponse.json(
        { error: "Fieldbook not found" },
        { status: 404 }
      );
    }
    
    let updatedFieldbook = fieldbook;
    let result = {
      updatedSourceIds: [] as string[],
      updatedSynthesisIds: [] as string[],
      updatedArtifactIds: [] as string[],
    };
    
    // If newFacts provided, update facts and propagate
    if (newFacts) {
      for (const [key, value] of Object.entries(newFacts)) {
        updatedFieldbook = updateFact(updatedFieldbook, key, value as string);
      }
    }
    
    // If sourceId provided, propagate from that source
    if (sourceId) {
      const propagationResult = propagateFromSource(updatedFieldbook, sourceId, prevSourceContent);
      updatedFieldbook = propagationResult.fieldbook;
      result = {
        updatedSourceIds: propagationResult.updatedSourceIds,
        updatedSynthesisIds: propagationResult.updatedSynthesisIds,
        updatedArtifactIds: propagationResult.updatedArtifactIds,
      };
      
      // Generate suggestions for affected items (AI when available, local fallback otherwise)
      const triggeringSource = updatedFieldbook.sources.find(s => s.id === sourceId);
      if (triggeringSource) {
        const hasAI = !!(PORTKEY_API_KEY && PORTKEY_VIRTUAL_KEY);
        console.log("[Propagate] Generating suggestions for affected items...", hasAI ? "(AI)" : "(local fallback)");

        // Build a local fallback suggestion from the source diff data
        const buildLocalFallback = (
          downstreamTitle: string,
          downstreamType: "synthesis" | "artifact",
        ) => {
          const sourceSnippet = prevSourceContent
            ? undefined // diff is already in lastDiff.before/after
            : undefined;
          void sourceSnippet;
          return {
            changeDescription: `"${triggeringSource.title}" was updated. This ${downstreamType} may reference information that has changed.`,
            suggestedAction: `Review "${downstreamTitle}" to ensure it still accurately reflects the evidence from "${triggeringSource.title}".`,
          };
        };

        // Generate suggestions for syntheses
        const synthesisPromises = result.updatedSynthesisIds.slice(0, 3).map(async (synId) => {
          const synthesis = updatedFieldbook.syntheses.find(s => s.id === synId);
          if (!synthesis?.lastDiff) return null;

          if (hasAI) {
            const suggestion = await generateAISuggestion(
              triggeringSource.title,
              triggeringSource.content,
              synthesis.title,
              synthesis.content,
              "synthesis"
            );
            if (suggestion) return { id: synId, suggestion };
          }
          return { id: synId, suggestion: buildLocalFallback(synthesis.title, "synthesis") };
        });

        // Generate suggestions for artifacts
        const artifactPromises = result.updatedArtifactIds.slice(0, 3).map(async (artId) => {
          const artifact = updatedFieldbook.artifacts.find(a => a.id === artId);
          if (!artifact?.lastDiff) return null;

          if (hasAI) {
            const suggestion = await generateAISuggestion(
              triggeringSource.title,
              triggeringSource.content,
              artifact.title,
              artifact.contentRendered || artifact.content,
              "artifact"
            );
            if (suggestion) return { id: artId, suggestion };
          }
          return { id: artId, suggestion: buildLocalFallback(artifact.title, "artifact") };
        });

        const [synthesisSuggestions, artifactSuggestions] = await Promise.all([
          Promise.all(synthesisPromises),
          Promise.all(artifactPromises),
        ]);

        for (const entry of synthesisSuggestions) {
          if (entry?.suggestion) {
            const idx = updatedFieldbook.syntheses.findIndex(s => s.id === entry.id);
            if (idx !== -1 && updatedFieldbook.syntheses[idx].lastDiff) {
              updatedFieldbook.syntheses[idx] = {
                ...updatedFieldbook.syntheses[idx],
                lastDiff: {
                  ...updatedFieldbook.syntheses[idx].lastDiff!,
                  aiSuggestion: entry.suggestion,
                },
              };
            }
          }
        }

        for (const entry of artifactSuggestions) {
          if (entry?.suggestion) {
            const idx = updatedFieldbook.artifacts.findIndex(a => a.id === entry.id);
            if (idx !== -1 && updatedFieldbook.artifacts[idx].lastDiff) {
              updatedFieldbook.artifacts[idx] = {
                ...updatedFieldbook.artifacts[idx],
                lastDiff: {
                  ...updatedFieldbook.artifacts[idx].lastDiff!,
                  aiSuggestion: entry.suggestion,
                },
              };
            }
          }
        }

        console.log("[Propagate] Suggestions generated");
      }
    }
    
    // Save the updated fieldbook
    const db = await loadData();
    const idx = db.fieldbooks.findIndex(fb => fb.id === id);
    if (idx !== -1) {
      db.fieldbooks[idx] = {
        ...updatedFieldbook,
        updatedAt: new Date().toISOString(),
      };
      await saveData(db);
    }
    
    return NextResponse.json({
      success: true,
      ...result,
      fieldbook: updatedFieldbook,
    });
  } catch (error) {
    console.error("Propagation error:", error);
    return NextResponse.json(
      { error: "Failed to propagate changes" },
      { status: 500 }
    );
  }
}

// PATCH - Update recalc status (calibrated -> idle, etc.)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status } = body;
    
    if (!status || !["calibrated", "idle"].includes(status)) {
      return NextResponse.json(
        { error: "Status must be 'calibrated' or 'idle'" },
        { status: 400 }
      );
    }
    
    const fieldbook = await getFieldbook(id);
    if (!fieldbook) {
      return NextResponse.json(
        { error: "Fieldbook not found" },
        { status: 404 }
      );
    }
    
    let updatedFieldbook = fieldbook;
    
    if (status === "calibrated") {
      updatedFieldbook = markCalibrated(fieldbook);
    } else if (status === "idle") {
      updatedFieldbook = markIdle(fieldbook);
    }
    
    // Save the updated fieldbook
    const db = await loadData();
    const idx = db.fieldbooks.findIndex(fb => fb.id === id);
    if (idx !== -1) {
      db.fieldbooks[idx] = updatedFieldbook;
      await saveData(db);
    }
    
    return NextResponse.json({
      success: true,
      fieldbook: updatedFieldbook,
    });
  } catch (error) {
    console.error("Status update error:", error);
    return NextResponse.json(
      { error: "Failed to update status" },
      { status: 500 }
    );
  }
}

// GET - Initialize rendered content (for app startup)
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    
    const fieldbook = await getFieldbook(id);
    if (!fieldbook) {
      return NextResponse.json(
        { error: "Fieldbook not found" },
        { status: 404 }
      );
    }
    
    // Initialize any items that have templates but no rendered content
    const updatedFieldbook = initializeRenderedContent(fieldbook);
    
    // Only save if something changed
    if (JSON.stringify(updatedFieldbook) !== JSON.stringify(fieldbook)) {
      const db = await loadData();
      const idx = db.fieldbooks.findIndex(fb => fb.id === id);
      if (idx !== -1) {
        db.fieldbooks[idx] = updatedFieldbook;
        await saveData(db);
      }
    }
    
    return NextResponse.json({
      success: true,
      fieldbook: updatedFieldbook,
    });
  } catch (error) {
    console.error("Initialize error:", error);
    return NextResponse.json(
      { error: "Failed to initialize content" },
      { status: 500 }
    );
  }
}
