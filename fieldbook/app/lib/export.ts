/**
 * Document Export Utilities
 * 
 * Exports Fieldbook content to various formats for client-facing documents.
 * Supports: .docx (Word), .txt (plain text), .md (Markdown)
 * 
 * Handles both legacy block format and TipTap document format.
 */

import type { FieldbookDocument } from "./blocks";

// TipTap document types
interface TipTapNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: TipTapNode[];
  text?: string;
  marks?: { type: string }[];
}

interface TipTapDoc {
  type: "doc";
  content: TipTapNode[];
}

// Extract plain text from TipTap node (recursively)
function extractText(node: TipTapNode): string {
  if (node.text) return node.text;
  if (node.content) {
    return node.content.map(extractText).join("");
  }
  return "";
}

// Convert TipTap document to plain text
function tiptapToText(doc: TipTapDoc): string {
  if (!doc?.content) return "";
  
  return doc.content.map(node => {
    switch (node.type) {
      case "heading": {
        const level = (node.attrs?.level as number) || 1;
        const text = extractText(node);
        return `${"#".repeat(level)} ${text}\n`;
      }
      case "paragraph": {
        const text = extractText(node);
        return text ? `${text}\n` : "\n";
      }
      case "bulletList":
      case "orderedList": {
        const items = (node.content || []).map((item, i) => {
          const text = item.content ? item.content.map(extractText).join("") : "";
          return node.type === "orderedList" ? `${i + 1}. ${text}` : `• ${text}`;
        });
        return items.join("\n") + "\n";
      }
      case "blockquote": {
        const text = node.content?.map(p => extractText(p)).join("\n") || "";
        return `> ${text}\n`;
      }
      case "codeBlock": {
        const text = extractText(node);
        const lang = (node.attrs?.language as string) || "";
        return `\`\`\`${lang}\n${text}\n\`\`\`\n`;
      }
      case "hardBreak":
        return "\n";
      default:
        return "";
    }
  }).join("\n");
}

// Convert TipTap document to HTML
function tiptapToHtml(doc: TipTapDoc, title?: string): string {
  if (!doc?.content) return "";
  
  function nodeToHtml(node: TipTapNode): string {
    switch (node.type) {
      case "text": {
        let text = escapeHtml(node.text || "");
        if (node.marks) {
          for (const mark of node.marks) {
            if (mark.type === "bold") text = `<strong>${text}</strong>`;
            if (mark.type === "italic") text = `<em>${text}</em>`;
            if (mark.type === "code") text = `<code>${text}</code>`;
          }
        }
        return text;
      }
      case "heading": {
        const level = (node.attrs?.level as number) || 1;
        const content = node.content?.map(nodeToHtml).join("") || "";
        return `<h${level}>${content}</h${level}>`;
      }
      case "paragraph": {
        const content = node.content?.map(nodeToHtml).join("") || "";
        return `<p>${content}</p>`;
      }
      case "bulletList": {
        const items = node.content?.map(item => {
          const content = item.content?.map(p => p.content?.map(nodeToHtml).join("") || "").join("") || "";
          return `<li>${content}</li>`;
        }).join("") || "";
        return `<ul>${items}</ul>`;
      }
      case "orderedList": {
        const items = node.content?.map(item => {
          const content = item.content?.map(p => p.content?.map(nodeToHtml).join("") || "").join("") || "";
          return `<li>${content}</li>`;
        }).join("") || "";
        return `<ol>${items}</ol>`;
      }
      case "blockquote": {
        const content = node.content?.map(nodeToHtml).join("") || "";
        return `<blockquote>${content}</blockquote>`;
      }
      case "codeBlock": {
        const text = extractText(node);
        return `<pre><code>${escapeHtml(text)}</code></pre>`;
      }
      case "hardBreak":
        return "<br>";
      default:
        if (node.content) {
          return node.content.map(nodeToHtml).join("");
        }
        return "";
    }
  }
  
  const bodyHtml = doc.content.map(nodeToHtml).join("\n");
  
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(title || "Document")}</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 40px; }
    h1 { font-size: 24px; margin-top: 32px; }
    h2 { font-size: 20px; margin-top: 28px; }
    h3 { font-size: 16px; margin-top: 24px; }
    p { margin: 12px 0; }
    blockquote { border-left: 3px solid #ddd; margin-left: 0; padding-left: 16px; color: #666; }
    pre { background: #f5f5f5; padding: 12px; overflow-x: auto; }
    code { background: #f5f5f5; padding: 2px 4px; }
    ul, ol { margin: 12px 0; padding-left: 24px; }
    li { margin: 4px 0; }
  </style>
</head>
<body>
  ${title ? `<h1>${escapeHtml(title)}</h1>` : ""}
  ${bodyHtml}
</body>
</html>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Generate a sanitized filename
function sanitizeFilename(name: string): string {
  return name
    .replace(/[^a-z0-9\s-]/gi, "")
    .replace(/\s+/g, "-")
    .toLowerCase()
    .slice(0, 50) || "document";
}

// Download a file in the browser
function downloadFile(content: Blob | string, filename: string, mimeType: string) {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export type ExportFormat = "docx" | "txt" | "md" | "html";

export interface ExportOptions {
  title: string;
  content: FieldbookDocument | string;
  format: ExportFormat;
}

/**
 * Export document content to a downloadable file
 */
export async function exportDocument({ title, content, format }: ExportOptions): Promise<void> {
  const filename = sanitizeFilename(title);
  
  // Parse content if it's a string
  let parsed: unknown;
  if (typeof content === "string") {
    try {
      parsed = JSON.parse(content);
    } catch {
      // If not valid JSON, treat as plain text
      parsed = { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: content }] }] };
    }
  } else {
    parsed = content;
  }
  
  // Check if it's TipTap format (has type: "doc" and content array)
  const isTipTap = parsed && typeof parsed === "object" && "type" in parsed && (parsed as TipTapDoc).type === "doc";
  const doc = parsed as TipTapDoc;
  
  // Convert to text/html based on format
  let text = "";
  let html = "";
  
  if (isTipTap) {
    text = tiptapToText(doc);
    html = tiptapToHtml(doc, title);
  } else {
    // Fallback: if we somehow have non-TipTap content, convert to plain text
    text = JSON.stringify(parsed, null, 2);
    html = `<!DOCTYPE html><html><head><title>${escapeHtml(title)}</title></head><body><pre>${escapeHtml(text)}</pre></body></html>`;
  }
  
  switch (format) {
    case "txt": {
      downloadFile(text, `${filename}.txt`, "text/plain");
      break;
    }
    
    case "md": {
      downloadFile(text, `${filename}.md`, "text/markdown");
      break;
    }
    
    case "html": {
      downloadFile(html, `${filename}.html`, "text/html");
      break;
    }
    
    case "docx": {
      // For DOCX, we create an HTML blob and use the mhtml trick
      // This creates a Word-compatible file
      const docContent = `MIME-Version: 1.0
Content-Type: multipart/related; boundary="----=_NextPart_01"

------=_NextPart_01
Content-Type: text/html; charset="utf-8"
Content-Transfer-Encoding: quoted-printable

${html}

------=_NextPart_01--
`;
      downloadFile(docContent, `${filename}.doc`, "application/msword");
      break;
    }
  }
}
