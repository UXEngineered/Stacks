/**
 * AI Document Synthesis API
 * 
 * Generates synthesized documents from source materials using OpenAI.
 * Supports streaming for real-time content generation.
 */

import OpenAI from "openai";
import { PORTKEY_GATEWAY_URL, createHeaders } from "portkey-ai";

export const maxDuration = 60; // Allow up to 60 seconds for generation

const openai = new OpenAI({
  apiKey: "dummy", // Not used - Portkey virtual key handles auth
  baseURL: PORTKEY_GATEWAY_URL,
  defaultHeaders: createHeaders({
    apiKey: process.env.PORTKEY_API_KEY,
    virtualKey: process.env.PORTKEY_VIRTUAL_KEY,
  }),
});

export async function POST(req: Request) {
  try {
    // Check for Portkey configuration
    if (!process.env.PORTKEY_API_KEY || !process.env.PORTKEY_VIRTUAL_KEY) {
      console.error("PORTKEY_API_KEY or PORTKEY_VIRTUAL_KEY is not set");
      return Response.json(
        { error: "Portkey API key or virtual key not configured" },
        { status: 500 }
      );
    }

    const { sources, prompt, documentType } = await req.json();

    if (!sources || !Array.isArray(sources) || sources.length === 0) {
      return Response.json(
        { error: "At least one source document is required" },
        { status: 400 }
      );
    }

    console.log(`[AI Synthesis] Processing ${sources.length} sources with prompt: "${prompt?.slice(0, 50)}..."`);

    // Build context from source documents
    const sourceContext = sources
      .map((source: { title: string; content: string; type: string }, index: number) => {
        return `--- SOURCE ${index + 1}: ${source.title} (${source.type}) ---\n${source.content}\n`;
      })
      .join("\n");

    // Build the system prompt based on document type
    const systemPrompt = getSystemPrompt(documentType);
    
    // Build the user prompt
    const userPrompt = `
${prompt ? `USER REQUEST: ${prompt}\n\n` : ""}
SOURCE MATERIALS:
${sourceContext}

Please synthesize the above source materials into a well-structured document. Use markdown formatting with appropriate headings, bullet points, and emphasis where helpful.
`.trim();

    console.log("[AI Synthesis] Starting stream...");

    // Stream the response using OpenAI directly
    // Using gpt-4o-mini for higher rate limits and lower cost
    const stream = await openai.chat.completions.create({
        model: "gpt-4.1-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 4000,
      stream: true,
    });

    // Create a readable stream for the response
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content;
            if (content) {
              // Send in the format expected by the client: 0:"content"
              controller.enqueue(encoder.encode(`0:${JSON.stringify(content)}\n`));
            }
          }
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (error) {
    console.error("AI synthesis error:", error);
    
    // Provide more specific error messages
    let errorMessage = "Failed to generate content";
    let statusCode = 500;
    
    if (error instanceof Error) {
      errorMessage = error.message;
      
      // Check for common OpenAI errors
      if (error.message.includes("401") || error.message.includes("Unauthorized")) {
        errorMessage = "Invalid OpenAI API key";
        statusCode = 401;
      } else if (error.message.includes("429") || error.message.includes("rate limit")) {
        errorMessage = "Rate limit exceeded. Please try again in a moment.";
        statusCode = 429;
      } else if (error.message.includes("ECONNREFUSED") || error.message.includes("network")) {
        errorMessage = "Network error connecting to OpenAI";
        statusCode = 503;
      }
    }
    
    return Response.json({ error: errorMessage }, { status: statusCode });
  }
}

function getSystemPrompt(documentType?: string): string {
  const basePrompt = `You are Fieldbook, an AI assistant that helps synthesize and organize information from multiple source documents into clear, well-structured documents.

Your writing style is:
- Clear and concise
- Professional but approachable
- Well-organized with appropriate headings
- Focused on extracting key insights and patterns across sources

Always structure your output with:
1. A brief executive summary or overview
2. Key points organized by theme
3. Any notable patterns, decisions, or recommendations
4. Open questions or areas needing clarification (if any)`;

  const typeSpecificPrompts: Record<string, string> = {
    prd: `${basePrompt}

You are creating a Product Requirements Document (PRD). Focus on:
- Problem statement and user needs
- Proposed solution and key features
- Success metrics and acceptance criteria
- Dependencies and technical considerations
- Timeline and milestones`,

    rfc: `${basePrompt}

You are creating a Request for Comments (RFC) / Design Document. Focus on:
- Context and problem being solved
- Proposed solution with technical details
- Alternative approaches considered
- Trade-offs and risks
- Implementation plan`,

    summary: `${basePrompt}

You are creating a summary document. Focus on:
- Key takeaways from all sources
- Important decisions or conclusions
- Action items and next steps
- Any unresolved questions`,

    analysis: `${basePrompt}

You are creating an analysis document. Focus on:
- Patterns and themes across sources
- Comparative analysis where relevant
- Insights and implications
- Recommendations based on evidence`,
  };

  return typeSpecificPrompts[documentType || "summary"] || basePrompt;
}
