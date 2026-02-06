/**
 * AI Generation API Endpoint
 * 
 * POST /api/ai/generate
 * Generates synthesis or artifact content using OpenAI GPT-4
 * 
 * Body: {
 *   type: "synthesis" | "artifact",
 *   artifactType?: string,  // For artifacts: "decision-brief", "opportunity-map", etc.
 *   sources: { title: string, content: string }[],
 *   prompt?: string,  // Additional instructions
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { PORTKEY_GATEWAY_URL, createHeaders } from "portkey-ai";

const PORTKEY_API_KEY = process.env.PORTKEY_API_KEY;
const PORTKEY_VIRTUAL_KEY = process.env.PORTKEY_VIRTUAL_KEY;

interface GenerateRequest {
  type: "synthesis" | "artifact";
  artifactType?: string;
  sources: { title: string; content: string }[];
  prompt?: string;
}

// System prompts for different generation types
const SYNTHESIS_SYSTEM_PROMPT = `You are a senior research analyst at Sparq, a strategy consulting firm. Your task is to synthesize insights from multiple sources into a coherent analysis.

Your synthesis should:
- Identify key themes and patterns across sources
- Surface tensions and contradictions
- Draw implications for strategy or decision-making
- Be evidence-based, citing specific sources when relevant
- Use clear, professional language

Output format: Return a JSON object with this structure:
{
  "title": "A concise title for the synthesis",
  "content": {
    "type": "doc",
    "content": [
      { "type": "heading", "attrs": { "level": 2 }, "content": [{ "type": "text", "text": "Section Title" }] },
      { "type": "paragraph", "content": [{ "type": "text", "text": "Paragraph content..." }] }
    ]
  }
}

Use heading level 2 for main sections. Include sections like: Key Themes, Patterns, Tensions, Implications, and Open Questions.`;

const ARTIFACT_PROMPTS: Record<string, string> = {
  "decision-brief": `You are creating a Decision Brief - a concise document that frames a decision, presents evidence, and recommends a direction.

Structure:
1. Recommendation (1-2 sentences of the recommended action)
2. Confidence Level (High/Medium/Low with brief justification)
3. Problem Statement (What problem or opportunity this addresses)
4. Key Evidence (Bullet points with source references)
5. Recommended Direction (Numbered steps or actions)
6. Open Questions (Unresolved issues needing further input)
7. Dissenting Signals (Counter-arguments or risks)`,

  "opportunity-map": `You are creating an Opportunity Map - a document that identifies and prioritizes opportunities based on research.

Structure:
1. Executive Summary
2. Opportunity Areas (grouped by theme)
3. Prioritization Matrix (impact vs effort assessment)
4. Quick Wins (low effort, high impact)
5. Strategic Bets (high effort, high impact)
6. Dependencies and Risks`,

  "design-rationale": `You are creating a Design Rationale - a document that explains why certain design decisions were made.

Structure:
1. Decision Overview
2. Context and Constraints
3. Options Considered (with pros/cons)
4. Selected Approach
5. Trade-offs Accepted
6. Future Considerations`,

  "research-warrant": `You are creating a Research Warrant - a document that justifies why additional research is needed.

Structure:
1. Research Question
2. Current Knowledge Gaps
3. Stakes (why this matters)
4. Proposed Method
5. Expected Outcomes
6. Resource Requirements`,

  "alignment-map": `You are creating an Alignment Map - a document that visualizes stakeholder positions and interests.

Structure:
1. Stakeholder Overview
2. Key Positions (what each stakeholder wants)
3. Areas of Alignment
4. Areas of Tension
5. Path to Consensus
6. Negotiation Points`,

  "evidence-inventory": `You are creating an Evidence Inventory - a systematic catalog of evidence supporting key claims.

Structure:
1. Core Claims (numbered)
2. Evidence Matrix (claim → supporting evidence)
3. Confidence Assessment per claim
4. Evidence Gaps
5. Recommended Next Steps`,

  "transition-playbook": `You are creating a Transition Playbook - a practical guide for implementing change.

Structure:
1. Vision Statement
2. Current State Summary
3. Target State
4. Migration Path (phased approach)
5. Quick Reference Guide
6. Common Pitfalls and Mitigations
7. Success Metrics`,
};

function getArtifactSystemPrompt(artifactType: string): string {
  const typePrompt = ARTIFACT_PROMPTS[artifactType] || ARTIFACT_PROMPTS["decision-brief"];
  
  return `You are a senior consultant at Sparq, a strategy consulting firm. ${typePrompt}

Output format: Return a JSON object with this structure:
{
  "title": "A concise title for the artifact",
  "content": {
    "type": "doc",
    "content": [
      { "type": "heading", "attrs": { "level": 2 }, "content": [{ "type": "text", "text": "Section Title" }] },
      { "type": "paragraph", "content": [{ "type": "text", "text": "Paragraph content..." }] }
    ]
  }
}

Use heading level 2 for main sections. Be specific, actionable, and evidence-based.`;
}

function formatSourcesForPrompt(sources: { title: string; content: string }[]): string {
  return sources.map((source, i) => {
    // Try to parse JSON content and extract text
    let textContent = source.content;
    try {
      const parsed = JSON.parse(source.content);
      if (parsed.content) {
        textContent = extractTextFromDoc(parsed);
      }
    } catch {
      // Content is already plain text
    }
    return `--- Source ${i + 1}: ${source.title} ---\n${textContent}\n`;
  }).join("\n");
}

function extractTextFromDoc(doc: any): string {
  if (!doc.content) return "";
  
  return doc.content.map((node: any) => {
    if (node.type === "heading" && node.content) {
      const text = node.content.map((c: any) => c.text || "").join("");
      return `\n## ${text}\n`;
    }
    if (node.type === "paragraph" && node.content) {
      return node.content.map((c: any) => c.text || "").join("");
    }
    if (node.type === "bulletList" && node.content) {
      return node.content.map((item: any) => {
        if (item.content?.[0]?.content) {
          return "• " + item.content[0].content.map((c: any) => c.text || "").join("");
        }
        return "";
      }).join("\n");
    }
    return "";
  }).join("\n");
}

export async function POST(request: NextRequest) {
  if (!PORTKEY_API_KEY || !PORTKEY_VIRTUAL_KEY) {
    return NextResponse.json(
      { error: "Portkey API key or virtual key not configured" },
      { status: 500 }
    );
  }

  try {
    const body: GenerateRequest = await request.json();
    const { type, artifactType, sources, prompt } = body;

    if (!type || !sources || sources.length === 0) {
      return NextResponse.json(
        { error: "type and sources are required" },
        { status: 400 }
      );
    }

    // Build the system prompt
    const systemPrompt = type === "synthesis" 
      ? SYNTHESIS_SYSTEM_PROMPT 
      : getArtifactSystemPrompt(artifactType || "decision-brief");

    // Build the user prompt
    const sourcesText = formatSourcesForPrompt(sources);
    let userPrompt = `Please analyze the following sources and generate a ${type}:\n\n${sourcesText}`;
    
    if (prompt) {
      userPrompt += `\n\nAdditional instructions: ${prompt}`;
    }

    console.log("[AI Generate] Calling OpenAI...");
    console.log("[AI Generate] Type:", type, "Artifact:", artifactType);
    console.log("[AI Generate] Sources:", sources.length);

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
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[AI Generate] OpenAI error:", errorText);
      
      // Parse the OpenAI error message
      let errorMessage = "OpenAI API error";
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.error?.message) {
          errorMessage = errorJson.error.message;
        }
      } catch {
        // Use default message
      }
      
      return NextResponse.json(
        { error: errorMessage, details: errorText, quota_exceeded: errorMessage.includes("quota") },
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

    console.log("[AI Generate] Success, parsing response...");

    // Strip markdown code blocks if present (Claude often wraps JSON in ```json ... ```)
    let jsonContent = content.trim();
    if (jsonContent.startsWith("```")) {
      // Remove opening ```json or ``` and closing ```
      jsonContent = jsonContent.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
    }

    // Parse the JSON response
    const generated = JSON.parse(jsonContent);

    return NextResponse.json({
      success: true,
      title: generated.title,
      content: generated.content,
    });
  } catch (error) {
    console.error("[AI Generate] Error:", error);
    return NextResponse.json(
      { error: "Failed to generate content", details: String(error) },
      { status: 500 }
    );
  }
}
