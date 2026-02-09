/**
 * AI Source Relevance Ranking API Endpoint
 * 
 * POST /api/ai/rank-sources
 * Ranks available sources/syntheses by relevance to a given artifact type
 * 
 * Body: {
 *   artifactType: string,
 *   items: { id: string, title: string, content: string, type: string }[]
 * }
 * 
 * Returns: {
 *   ranked: { id: string, score: number }[]  // score 0-1, descending
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { PORTKEY_GATEWAY_URL, createHeaders } from "portkey-ai";

const PORTKEY_API_KEY = process.env.PORTKEY_API_KEY;
const PORTKEY_VIRTUAL_KEY = process.env.PORTKEY_VIRTUAL_KEY;

interface RankRequest {
  artifactType: string;
  artifactTypeLabel: string;
  items: { id: string; title: string; content: string; type: string }[];
}

const SYSTEM_PROMPT = `You rank source documents and syntheses by relevance to a specific artifact type.

Artifact types and what they need:
- decision-brief: Syntheses with clear trade-offs, tensions, or recommendations. Sources with evidence.
- opportunity-map: Broad thematic syntheses. Sources revealing unmet needs or gaps.
- design-rationale: Syntheses about design tensions. Sources with user behavior or constraints.
- research-warrant: Sources with strong evidence. Syntheses that frame the research question.
- alignment-map: Syntheses showing different stakeholder perspectives or priorities.
- evidence-inventory: Sources (raw evidence). Syntheses that summarize evidence clusters.
- transition-playbook: Syntheses with actionable insights. Sources with implementation details.

Return a JSON array of objects with "id" and "score" (0.0 to 1.0).
Only include items with score >= 0.3. Sort descending by score.
Be decisive — most items should score below 0.5 unless truly relevant.

Return ONLY the JSON array, no other text.`;

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

function extractTextFromDoc(doc: Record<string, unknown>): string {
  if (!doc.content) return "";
  return (doc.content as Record<string, unknown>[]).map((node) => {
    if (node.type === "heading" && node.content) {
      return (node.content as Record<string, unknown>[]).map((c) => c.text || "").join("");
    }
    if (node.type === "paragraph" && node.content) {
      return (node.content as Record<string, unknown>[]).map((c) => c.text || "").join("");
    }
    if (node.type === "bulletList" && node.content) {
      return (node.content as Record<string, unknown>[]).map((item) => {
        const itemContent = item.content as Record<string, unknown>[] | undefined;
        if (itemContent?.[0]) {
          const para = itemContent[0].content as Record<string, unknown>[] | undefined;
          if (para) return para.map((c) => c.text || "").join("");
        }
        return "";
      }).join(" ");
    }
    return "";
  }).join(" ");
}

export async function POST(request: NextRequest) {
  if (!PORTKEY_API_KEY || !PORTKEY_VIRTUAL_KEY) {
    return NextResponse.json({ ranked: [] });
  }

  try {
    const body: RankRequest = await request.json();
    const { artifactType, artifactTypeLabel, items } = body;

    if (!items || items.length === 0) {
      return NextResponse.json({ ranked: [] });
    }

    const itemsList = items.map((item, i) => {
      const text = extractTextFromContent(item.content);
      return `[${i}] ID: ${item.id} | Type: ${item.type} | Title: ${item.title}\nContent: ${text.slice(0, 300)}${text.length > 300 ? "..." : ""}`;
    }).join("\n\n");

    const userPrompt = `Artifact type: ${artifactType} (${artifactTypeLabel})

Available items to rank:
${itemsList}

Rank these by relevance to generating a ${artifactTypeLabel}.`;

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
        temperature: 0.2,
        max_tokens: 512,
      }),
    });

    if (!response.ok) {
      console.error("[AI Rank Sources] API error");
      return NextResponse.json({ ranked: [] });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return NextResponse.json({ ranked: [] });
    }

    let jsonContent = content.trim();
    if (jsonContent.startsWith("```")) {
      jsonContent = jsonContent.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
    }

    const ranked = JSON.parse(jsonContent);
    return NextResponse.json({ ranked });
  } catch (error) {
    console.error("[AI Rank Sources] Error:", error);
    return NextResponse.json({ ranked: [] });
  }
}
