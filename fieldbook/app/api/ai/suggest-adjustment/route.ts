/**
 * AI Adjustment Suggestion API Endpoint
 * 
 * POST /api/ai/suggest-adjustment
 * Generates an intelligent, contextual suggestion when upstream content changes.
 * 
 * Body: {
 *   sourceTitle: string,          // Name of the source that changed
 *   sourceContent: string,        // Current content of the source
 *   downstreamTitle: string,      // Name of the synthesis/artifact affected
 *   downstreamContent: string,    // Current content of the downstream item
 *   downstreamType: "synthesis" | "artifact",
 * }
 * 
 * Returns: {
 *   changeDescription: string,    // "Marcus Webb updated his stance on technical debt"
 *   suggestedAction: string,      // "Would you like me to rewrite the 'Control Costs' section?"
 *   targetSection?: string,       // Optional: specific section that may need updating
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { PORTKEY_GATEWAY_URL, createHeaders } from "portkey-ai";

const PORTKEY_API_KEY = process.env.PORTKEY_API_KEY;
const PORTKEY_VIRTUAL_KEY = process.env.PORTKEY_VIRTUAL_KEY;

interface SuggestAdjustmentRequest {
  sourceTitle: string;
  sourceContent: string;
  downstreamTitle: string;
  downstreamContent: string;
  downstreamType: "synthesis" | "artifact";
}

const SYSTEM_PROMPT = `You are an AI assistant for Stacks, a research and synthesis platform. Your task is to analyze when upstream source content changes and provide helpful, contextual suggestions for how downstream documents may need to be updated.

Given:
1. A source document that was just updated
2. A downstream synthesis or artifact that depends on it

Analyze the source content and the downstream document to:
1. Summarize what the source discusses or any notable stance/position (in 1 short sentence)
2. Identify which specific section(s) of the downstream document might be affected
3. Provide a helpful, actionable suggestion

Be specific and conversational. Reference actual content from the source (like a person's name if it's an interview, or a specific topic/stance).

Output format: Return a JSON object:
{
  "changeDescription": "Brief description of what the source contains or covers",
  "suggestedAction": "Conversational question asking if user wants help updating specific content",
  "targetSection": "Name of the section that might need updating (optional)"
}

Examples of good responses:
- {"changeDescription": "Marcus Webb shared concerns about technical debt in legacy systems", "suggestedAction": "Would you like me to update the 'Technical Risk' section to reflect his perspective?", "targetSection": "Technical Risk"}
- {"changeDescription": "The Operations team reported 45% productivity loss from system switching", "suggestedAction": "Should I revise the cost estimates to incorporate this new data?", "targetSection": "Cost Analysis"}
- {"changeDescription": "Sarah Chen's interview highlights disagreement about vendor consolidation timeline", "suggestedAction": "Would you like me to add her viewpoint to the 'Stakeholder Alignment' section?", "targetSection": "Stakeholder Alignment"}`;

function extractTextFromContent(content: string): string {
  try {
    const parsed = JSON.parse(content);
    if (parsed.content && Array.isArray(parsed.content)) {
      const textParts: string[] = [];
      const extractText = (nodes: any[]): void => {
        for (const node of nodes) {
          if (node.text) {
            textParts.push(node.text);
          }
          if (node.content && Array.isArray(node.content)) {
            extractText(node.content);
          }
        }
      };
      extractText(parsed.content);
      return textParts.join(" ").slice(0, 3000); // Limit to avoid huge prompts
    }
    return content.slice(0, 3000);
  } catch {
    return content.slice(0, 3000);
  }
}

function extractSectionNames(content: string): string[] {
  const sections: string[] = [];
  try {
    const parsed = JSON.parse(content);
    if (parsed.content && Array.isArray(parsed.content)) {
      for (const node of parsed.content) {
        if (node.type === "heading" && node.content?.[0]?.text) {
          sections.push(node.content[0].text);
        }
      }
    }
  } catch {
    // Not JSON content, try to extract markdown-style headers
    const headerMatches = content.match(/^##?\s+(.+)$/gm);
    if (headerMatches) {
      sections.push(...headerMatches.map(h => h.replace(/^##?\s+/, "")));
    }
  }
  return sections;
}

export async function POST(request: NextRequest) {
  if (!PORTKEY_API_KEY || !PORTKEY_VIRTUAL_KEY) {
    // Return a fallback suggestion if AI is not configured
    return NextResponse.json({
      changeDescription: "The upstream source was updated",
      suggestedAction: "Would you like to review and update this content?",
      targetSection: null,
    });
  }

  try {
    const body: SuggestAdjustmentRequest = await request.json();
    const { sourceTitle, sourceContent, downstreamTitle, downstreamContent, downstreamType } = body;

    if (!sourceTitle || !sourceContent || !downstreamContent) {
      return NextResponse.json(
        { error: "sourceTitle, sourceContent, and downstreamContent are required" },
        { status: 400 }
      );
    }

    const sourceText = extractTextFromContent(sourceContent);
    const downstreamText = extractTextFromContent(downstreamContent);
    const sections = extractSectionNames(downstreamContent);

    const userPrompt = `A source was just updated. Please analyze and suggest how the downstream ${downstreamType} might need to be updated.

SOURCE: "${sourceTitle}"
---
${sourceText}
---

DOWNSTREAM ${downstreamType.toUpperCase()}: "${downstreamTitle}"
${sections.length > 0 ? `Sections: ${sections.join(", ")}` : ""}
---
${downstreamText}
---

Provide a helpful, contextual suggestion for the user.`;

    console.log("[AI Suggest] Generating adjustment suggestion...");

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
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.5, // Lower temperature for more consistent suggestions
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[AI Suggest] API error:", errorText);
      
      // Return fallback on error
      return NextResponse.json({
        changeDescription: `"${sourceTitle}" was updated`,
        suggestedAction: "Would you like to review how this affects your document?",
        targetSection: null,
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return NextResponse.json({
        changeDescription: `"${sourceTitle}" was updated`,
        suggestedAction: "Would you like to review how this affects your document?",
        targetSection: null,
      });
    }

    // Strip markdown code blocks if present
    let jsonContent = content.trim();
    if (jsonContent.startsWith("```")) {
      jsonContent = jsonContent.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
    }

    const suggestion = JSON.parse(jsonContent);

    console.log("[AI Suggest] Generated suggestion:", suggestion);

    return NextResponse.json({
      changeDescription: suggestion.changeDescription || `"${sourceTitle}" was updated`,
      suggestedAction: suggestion.suggestedAction || "Would you like to review how this affects your document?",
      targetSection: suggestion.targetSection || null,
    });
  } catch (error) {
    console.error("[AI Suggest] Error:", error);
    
    // Return fallback on any error
    return NextResponse.json({
      changeDescription: "The upstream source was updated",
      suggestedAction: "Would you like to review and update this content?",
      targetSection: null,
    });
  }
}
