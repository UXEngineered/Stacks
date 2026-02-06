/**
 * Transcript Parser
 * 
 * Parses VTT, SRT, and plain text transcripts into clean prose.
 */

export interface ParsedTranscript {
  title: string;
  content: string;
  format: "vtt" | "srt" | "txt";
  speakerLabels: boolean;
}

/**
 * Detect transcript format from content
 */
export function detectFormat(content: string): "vtt" | "srt" | "txt" {
  const trimmed = content.trim();
  
  if (trimmed.startsWith("WEBVTT")) {
    return "vtt";
  }
  
  // SRT format: starts with "1" followed by timestamp pattern
  if (/^1\r?\n\d{2}:\d{2}:\d{2}/.test(trimmed)) {
    return "srt";
  }
  
  // VTT without header but with timestamp pattern
  if (/^\d{2}:\d{2}:\d{2}\.\d{3}\s*-->/.test(trimmed)) {
    return "vtt";
  }
  
  return "txt";
}

/**
 * Parse VTT (WebVTT) format
 */
export function parseVTT(content: string, preserveTimestamps = false): string {
  const lines = content.split(/\r?\n/);
  const output: string[] = [];
  let currentSpeaker = "";
  let currentText = "";
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip WEBVTT header and NOTE sections
    if (line === "WEBVTT" || line.startsWith("NOTE") || line === "") {
      continue;
    }
    
    // Skip cue identifiers (lines that are just numbers or identifiers)
    if (/^[\w-]+$/.test(line) && !line.includes(":")) {
      continue;
    }
    
    // Skip timestamp lines but optionally capture the time
    const timestampMatch = line.match(/^(\d{2}:\d{2}:\d{2})\.\d{3}\s*-->/);
    if (timestampMatch) {
      if (preserveTimestamps && currentText) {
        output.push(currentText.trim());
        currentText = `[${timestampMatch[1]}] `;
      }
      continue;
    }
    
    // Process content lines
    if (line) {
      // Check for speaker label (e.g., "Speaker 1:", "John:", "<v Speaker 1>")
      const speakerMatch = line.match(/^(?:<v\s+)?([^>:]+)(?:>|:)\s*(.*)$/);
      
      if (speakerMatch) {
        const [, speaker, text] = speakerMatch;
        
        // If speaker changed, start new paragraph
        if (speaker !== currentSpeaker && currentText) {
          output.push(currentText.trim());
          currentText = "";
        }
        
        currentSpeaker = speaker;
        
        if (text) {
          if (!currentText || currentText.endsWith("] ")) {
            currentText += `${speaker}: ${text} `;
          } else {
            currentText += `${text} `;
          }
        }
      } else {
        // Continuation of current speaker's text
        currentText += `${line} `;
      }
    }
  }
  
  // Add any remaining text
  if (currentText.trim()) {
    output.push(currentText.trim());
  }
  
  return output.join("\n\n");
}

/**
 * Parse SRT (SubRip) format
 */
export function parseSRT(content: string, preserveTimestamps = false): string {
  const lines = content.split(/\r?\n/);
  const output: string[] = [];
  let currentText = "";
  let currentTime = "";
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip sequence numbers (just digits)
    if (/^\d+$/.test(line)) {
      continue;
    }
    
    // Capture timestamp
    const timestampMatch = line.match(/^(\d{2}:\d{2}:\d{2}),\d{3}\s*-->/);
    if (timestampMatch) {
      if (preserveTimestamps) {
        currentTime = timestampMatch[1];
      }
      continue;
    }
    
    // Empty line = end of cue
    if (line === "") {
      if (currentText) {
        if (preserveTimestamps && currentTime) {
          output.push(`[${currentTime}] ${currentText.trim()}`);
        } else {
          output.push(currentText.trim());
        }
        currentText = "";
        currentTime = "";
      }
      continue;
    }
    
    // Content line
    currentText += (currentText ? " " : "") + line;
  }
  
  // Add any remaining text
  if (currentText.trim()) {
    if (preserveTimestamps && currentTime) {
      output.push(`[${currentTime}] ${currentText.trim()}`);
    } else {
      output.push(currentText.trim());
    }
  }
  
  // Merge consecutive lines from same speaker
  return mergeConsecutiveSpeakers(output.join("\n\n"));
}

/**
 * Merge consecutive paragraphs from the same speaker
 */
function mergeConsecutiveSpeakers(content: string): string {
  const paragraphs = content.split(/\n\n+/);
  const merged: string[] = [];
  let currentSpeaker = "";
  let currentContent = "";
  
  for (const para of paragraphs) {
    // Extract speaker from start of paragraph
    const speakerMatch = para.match(/^(?:\[\d{2}:\d{2}:\d{2}\]\s*)?([^:]+):\s*(.*)$/s);
    
    if (speakerMatch) {
      const [, speaker, text] = speakerMatch;
      
      if (speaker === currentSpeaker) {
        // Same speaker, append to current
        currentContent += " " + text;
      } else {
        // Different speaker, save current and start new
        if (currentContent) {
          merged.push(`${currentSpeaker}: ${currentContent.trim()}`);
        }
        currentSpeaker = speaker;
        currentContent = text;
      }
    } else {
      // No speaker label, treat as continuation or standalone
      if (currentContent) {
        merged.push(`${currentSpeaker}: ${currentContent.trim()}`);
        currentSpeaker = "";
        currentContent = "";
      }
      merged.push(para);
    }
  }
  
  // Add remaining content
  if (currentContent && currentSpeaker) {
    merged.push(`${currentSpeaker}: ${currentContent.trim()}`);
  }
  
  return merged.join("\n\n");
}

/**
 * Parse transcript file based on detected format
 */
export function parseTranscript(
  content: string,
  filename?: string,
  preserveTimestamps = false
): ParsedTranscript {
  const format = detectFormat(content);
  let parsedContent: string;
  
  switch (format) {
    case "vtt":
      parsedContent = parseVTT(content, preserveTimestamps);
      break;
    case "srt":
      parsedContent = parseSRT(content, preserveTimestamps);
      break;
    default:
      parsedContent = content;
  }
  
  // Generate title from filename or first line
  let title = "Imported Transcript";
  if (filename) {
    title = filename.replace(/\.(vtt|srt|txt)$/i, "");
  } else if (parsedContent) {
    const firstLine = parsedContent.split("\n")[0].trim();
    if (firstLine.length > 0 && firstLine.length < 100) {
      title = firstLine.replace(/^[^:]+:\s*/, "").slice(0, 50);
      if (firstLine.length > 50) title += "...";
    }
  }
  
  // Check if content has speaker labels
  const speakerLabels = /^[A-Z][^:]{0,30}:/m.test(parsedContent);
  
  return {
    title,
    content: parsedContent,
    format,
    speakerLabels,
  };
}
