/**
 * AI Condense Synthesis API Endpoint
 * 
 * POST /api/ai/condense-synthesis
 * Merges a new source into an existing synthesis, updating it with new insights
 * 
 * Body: {
 *   newSource: { title: string, content: string },
 *   existingSynthesis: { id: string, title: string, content: string, derivedFrom: string[] }
 * }
 * 
 * Returns: {
 *   success: boolean,
 *   title: string,
 *   content: object (TipTap JSON)
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { PORTKEY_GATEWAY_URL, createHeaders } from "portkey-ai";

const PORTKEY_API_KEY = process.env.PORTKEY_API_KEY;
const PORTKEY_VIRTUAL_KEY = process.env.PORTKEY_VIRTUAL_KEY;

interface CondenseRequest {
  newSource: { title: string; content: string };
  existingSynthesis: { 
    id: string; 
    title: string; 
    content: string;
    derivedFrom: string[];
  };
}

const SYSTEM_PROMPT = `You are a senior research analyst. Your task is to update an existing synthesis document by incorporating insights from a new source.

Guidelines:
1. Preserve the structure and key insights of the existing synthesis
2. Seamlessly integrate new insights from the new source
3. Update any conclusions that need revision based on new information
4. Add new sections only if the source brings genuinely new themes
5. Maintain a cohesive narrative - don't just append
6. Note any tensions or contradictions between old and new material

Output format: Return a JSON object with this structure:
{
  "title": "Updated title (can keep original or refine it)",
  "content": {
    "type": "doc",
    "content": [
      { "type": "heading", "attrs": { "level": 2 }, "content": [{ "type": "text", "text": "Section Title" }] },
      { "type": "paragraph", "content": [{ "type": "text", "text": "Paragraph content..." }] }
    ]
  }
}

Use heading level 2 for main sections. The result should read as a unified document, not as a patchwork.`;

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
      return `\n## ${text}\n`;
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
    return NextResponse.json(
      { error: "Portkey API key or virtual key not configured" },
      { status: 500 }
    );
  }

  try {
    const body: CondenseRequest = await request.json();
    const { newSource, existingSynthesis } = body;

    if (!newSource || !existingSynthesis) {
      return NextResponse.json(
        { error: "newSource and existingSynthesis are required" },
        { status: 400 }
      );
    }

    // Extract text content
    const sourceText = extractTextFromContent(newSource.content);
    const synthesisText = extractTextFromContent(existingSynthesis.content);

    const userPrompt = `EXISTING SYNTHESIS:
Title: ${existingSynthesis.title}
Content:
${synthesisText}

---

NEW SOURCE TO INCORPORATE:
Title: ${newSource.title}
Content:
${sourceText}

---

Please update the synthesis to incorporate insights from the new source. The updated synthesis should be cohesive and well-integrated.`;

    console.log("[AI Condense] Updating synthesis:", existingSynthesis.title);
    console.log("[AI Condense] With new source:", newSource.title);

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
        temperature: 0.7,
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[AI Condense] API error:", errorText);
      return NextResponse.json(
        { error: "Failed to condense synthesis" },
        { status: 500 }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return NextResponse.json(
        { error: "No content generated" },
        { status: 500 }
      );
    }

    console.log("[AI Condense] Success, parsing response...");

    // Parse the response
    let jsonContent = content.trim();
    if (jsonContent.startsWith("```")) {
      jsonContent = jsonContent.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
    }

    const generated = JSON.parse(jsonContent);

    return NextResponse.json({
      success: true,
      title: generated.title,
      content: generated.content,
    });
  } catch (error) {
    console.error("[AI Condense] Error:", error);
    return NextResponse.json(
      { error: "Failed to condense synthesis", details: String(error) },
      { status: 500 }
    );
  }
}
