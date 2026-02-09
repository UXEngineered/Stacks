/**
 * AI Thematic Overlap Check API Endpoint
 * 
 * POST /api/ai/check-overlap
 * Checks if a new source's themes overlap with existing syntheses
 * 
 * Body: {
 *   sourceTitle: string,
 *   sourceContent: string,
 *   existingSyntheses: { id: string, title: string, content: string }[]
 * }
 * 
 * Returns: {
 *   hasOverlap: boolean,
 *   existingSynthesis: { id: string, title: string } | null,
 *   explanation: string | null  // One-sentence explanation, only if overlap detected
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { PORTKEY_GATEWAY_URL, createHeaders } from "portkey-ai";

const PORTKEY_API_KEY = process.env.PORTKEY_API_KEY;
const PORTKEY_VIRTUAL_KEY = process.env.PORTKEY_VIRTUAL_KEY;

interface CheckOverlapRequest {
  sourceTitle: string;
  sourceContent: string;
  existingSyntheses: { id: string; title: string; content: string }[];
}

const SYSTEM_PROMPT = `You are an expert at identifying thematic connections between documents.

Your task: Determine if a new source document has significant thematic overlap with any existing synthesis document.

Rules:
1. Only report overlap if the themes are STRONGLY related - not just tangentially connected
2. The overlap must be explainable in ONE clear sentence
3. If you cannot explain the connection simply and clearly, report no overlap
4. Focus on core themes, arguments, or insights - not just shared keywords
5. Be conservative - when in doubt, report no overlap

Return a JSON object with this exact structure:
{
  "hasOverlap": boolean,
  "matchedSynthesisId": string | null,
  "explanation": string | null
}

If hasOverlap is false, matchedSynthesisId and explanation should be null.
If hasOverlap is true, explanation must be a single sentence (max 20 words) that explains WHY they're related.`;

function extractTextFromContent(content: string): string {
  if (!content) return "";
  
  try {
    const parsed = JSON.parse(content);
    if (parsed.content) {
      return extractTextFromDoc(parsed);
    }
    return content;
  } catch {
    return content;
  }
}

function extractTextFromDoc(doc: any): string {
  if (!doc.content) return "";
  
  return doc.content.map((node: any) => {
    if (node.type === "heading" && node.content) {
      const text = node.content.map((c: any) => c.text || "").join("");
      return `## ${text}\n`;
    }
    if (node.type === "paragraph" && node.content) {
      return node.content.map((c: any) => c.text || "").join("") + "\n";
    }
    if (node.type === "bulletList" && node.content) {
      return node.content.map((item: any) => {
        if (item.content?.[0]?.content) {
          return "• " + item.content[0].content.map((c: any) => c.text || "").join("");
        }
        return "";
      }).join("\n") + "\n";
    }
    return "";
  }).join("");
}

export async function POST(request: NextRequest) {
  if (!PORTKEY_API_KEY || !PORTKEY_VIRTUAL_KEY) {
    // If AI not configured, just return no overlap (don't block the flow)
    return NextResponse.json({
      hasOverlap: false,
      existingSynthesis: null,
      explanation: null,
    });
  }

  try {
    const body: CheckOverlapRequest = await request.json();
    const { sourceTitle, sourceContent, existingSyntheses } = body;

    // If no existing syntheses, no overlap possible
    if (!existingSyntheses || existingSyntheses.length === 0) {
      return NextResponse.json({
        hasOverlap: false,
        existingSynthesis: null,
        explanation: null,
      });
    }

    // Extract text content
    const sourceText = extractTextFromContent(sourceContent);
    
    // If source has no meaningful content, no overlap check needed
    if (!sourceText.trim()) {
      return NextResponse.json({
        hasOverlap: false,
        existingSynthesis: null,
        explanation: null,
      });
    }

    // Build the user prompt with source and existing syntheses
    const synthesesList = existingSyntheses.map((s, i) => {
      const text = extractTextFromContent(s.content);
      return `--- Synthesis ${i + 1} (ID: ${s.id}) ---
Title: ${s.title}
Content: ${text.slice(0, 500)}${text.length > 500 ? "..." : ""}
`;
    }).join("\n");

    const userPrompt = `NEW SOURCE:
Title: ${sourceTitle}
Content: ${sourceText.slice(0, 1000)}${sourceText.length > 1000 ? "..." : ""}

EXISTING SYNTHESES:
${synthesesList}

Analyze if the new source has significant thematic overlap with any of the existing syntheses.`;

    console.log("[AI Check Overlap] Checking source:", sourceTitle);
    console.log("[AI Check Overlap] Against", existingSyntheses.length, "syntheses");

    // Call OpenAI API via Portkey gateway
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
        temperature: 0.3, // Lower temperature for more consistent results
        max_tokens: 256,
      }),
    });

    if (!response.ok) {
      console.error("[AI Check Overlap] API error, returning no overlap");
      // On error, just return no overlap to not block the flow
      return NextResponse.json({
        hasOverlap: false,
        existingSynthesis: null,
        explanation: null,
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return NextResponse.json({
        hasOverlap: false,
        existingSynthesis: null,
        explanation: null,
      });
    }

    // Parse the response
    let jsonContent = content.trim();
    if (jsonContent.startsWith("```")) {
      jsonContent = jsonContent.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
    }

    const result = JSON.parse(jsonContent);
    
    console.log("[AI Check Overlap] Result:", result);

    // Find the matched synthesis
    let existingSynthesis = null;
    if (result.hasOverlap && result.matchedSynthesisId) {
      const matched = existingSyntheses.find(s => s.id === result.matchedSynthesisId);
      if (matched) {
        existingSynthesis = {
          id: matched.id,
          title: matched.title,
        };
      } else {
        // If we can't find the matched synthesis, treat as no overlap
        return NextResponse.json({
          hasOverlap: false,
          existingSynthesis: null,
          explanation: null,
        });
      }
    }

    return NextResponse.json({
      hasOverlap: result.hasOverlap && existingSynthesis !== null,
      existingSynthesis,
      explanation: result.hasOverlap ? result.explanation : null,
    });
  } catch (error) {
    console.error("[AI Check Overlap] Error:", error);
    // On error, return no overlap to not block the flow
    return NextResponse.json({
      hasOverlap: false,
      existingSynthesis: null,
      explanation: null,
    });
  }
}
