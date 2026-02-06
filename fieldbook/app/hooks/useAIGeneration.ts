/**
 * Hook for AI content generation with streaming support
 */

import { useState, useCallback, useRef } from "react";

export interface SourceDocument {
  title: string;
  content: string;
  type: string;
}

export interface UseAIGenerationOptions {
  onChunk?: (chunk: string) => void;
  onComplete?: (fullText: string) => void;
  onError?: (error: Error) => void;
}

export interface UseAIGenerationReturn {
  generate: (sources: SourceDocument[], prompt: string, documentType?: string) => Promise<void>;
  isGenerating: boolean;
  error: string | null;
  generatedText: string;
  abort: () => void;
}

export function useAIGeneration(options: UseAIGenerationOptions = {}): UseAIGenerationReturn {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedText, setGeneratedText] = useState("");
  const abortControllerRef = useRef<AbortController | null>(null);

  const abort = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsGenerating(false);
  }, []);

  const generate = useCallback(async (
    sources: SourceDocument[],
    prompt: string,
    documentType?: string
  ) => {
    // Abort any existing generation
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setIsGenerating(true);
    setError(null);
    setGeneratedText("");

    try {
      const response = await fetch("/api/ai/synthesize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sources, prompt, documentType }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error: ${response.status}`);
      }

      if (!response.body) {
        throw new Error("No response body");
      }

      // Read the stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          break;
        }

        // Decode the chunk
        const chunk = decoder.decode(value, { stream: true });
        
        // Parse SSE data - the AI SDK sends data in a specific format
        const lines = chunk.split("\n");
        for (const line of lines) {
          if (line.startsWith("0:")) {
            // Text chunk - format is 0:"text content"
            try {
              const textContent = JSON.parse(line.slice(2));
              if (typeof textContent === "string") {
                fullText += textContent;
                setGeneratedText(fullText);
                options.onChunk?.(textContent);
              }
            } catch {
              // Not valid JSON, skip
            }
          }
        }
      }

      options.onComplete?.(fullText);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        // Aborted, don't treat as error
        return;
      }
      
      const errorMessage = err instanceof Error ? err.message : "Generation failed";
      setError(errorMessage);
      options.onError?.(err instanceof Error ? err : new Error(errorMessage));
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  }, [options]);

  return {
    generate,
    isGenerating,
    error,
    generatedText,
    abort,
  };
}
