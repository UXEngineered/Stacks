"use client";

/**
 * TipTapPreview - Renders TipTap JSON or raw markdown content as formatted HTML
 * 
 * Supports:
 * - TipTap JSON format ({"type":"doc","content":[...]})
 * - Raw markdown text (# Heading, **bold**, tables, etc.)
 */

import { useTheme } from "./ThemeProvider";
import { useId, useMemo } from "react";
import { marked } from "marked";

// Configure marked for GitHub Flavored Markdown
marked.setOptions({
  gfm: true,
  breaks: true,
});

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

interface TipTapPreviewProps {
  content: TipTapDoc | string | null;
  className?: string;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function nodeToHtml(node: TipTapNode): string {
  switch (node.type) {
    case "text": {
      let text = escapeHtml(node.text || "");
      if (node.marks) {
        for (const mark of node.marks) {
          if (mark.type === "bold") text = `<strong>${text}</strong>`;
          if (mark.type === "italic") text = `<em>${text}</em>`;
          if (mark.type === "code") text = `<code class="inline-code">${text}</code>`;
          if (mark.type === "strike") text = `<del>${text}</del>`;
          if (mark.type === "underline") text = `<u>${text}</u>`;
          if (mark.type === "link") {
            const href = (mark as unknown as { attrs?: { href?: string } }).attrs?.href || "#";
            text = `<a href="${escapeHtml(href)}" target="_blank" rel="noopener">${text}</a>`;
          }
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
      return content ? `<p>${content}</p>` : `<p><br></p>`;
    }
    case "bulletList": {
      const items = node.content?.map(item => {
        const content = item.content?.map(nodeToHtml).join("") || "";
        return `<li>${content}</li>`;
      }).join("") || "";
      return `<ul>${items}</ul>`;
    }
    case "orderedList": {
      const start = (node.attrs?.start as number) || 1;
      const items = node.content?.map(item => {
        const content = item.content?.map(nodeToHtml).join("") || "";
        return `<li>${content}</li>`;
      }).join("") || "";
      return `<ol${start !== 1 ? ` start="${start}"` : ""}>${items}</ol>`;
    }
    case "listItem": {
      const content = node.content?.map(nodeToHtml).join("") || "";
      return content;
    }
    case "blockquote": {
      const content = node.content?.map(nodeToHtml).join("") || "";
      return `<blockquote>${content}</blockquote>`;
    }
    case "codeBlock": {
      const text = node.content?.map(n => n.text || "").join("") || "";
      const lang = (node.attrs?.language as string) || "";
      return `<pre${lang ? ` class="language-${lang}"` : ""}><code>${escapeHtml(text)}</code></pre>`;
    }
    case "table": {
      const rows = node.content?.map(nodeToHtml).join("") || "";
      return `<table>${rows}</table>`;
    }
    case "tableRow": {
      const cells = node.content?.map(nodeToHtml).join("") || "";
      return `<tr>${cells}</tr>`;
    }
    case "tableHeader": {
      const content = node.content?.map(nodeToHtml).join("") || "";
      const colspan = (node.attrs?.colspan as number) || 1;
      const rowspan = (node.attrs?.rowspan as number) || 1;
      const attrs = [];
      if (colspan > 1) attrs.push(`colspan="${colspan}"`);
      if (rowspan > 1) attrs.push(`rowspan="${rowspan}"`);
      return `<th${attrs.length ? " " + attrs.join(" ") : ""}>${content}</th>`;
    }
    case "tableCell": {
      const content = node.content?.map(nodeToHtml).join("") || "";
      const colspan = (node.attrs?.colspan as number) || 1;
      const rowspan = (node.attrs?.rowspan as number) || 1;
      const attrs = [];
      if (colspan > 1) attrs.push(`colspan="${colspan}"`);
      if (rowspan > 1) attrs.push(`rowspan="${rowspan}"`);
      return `<td${attrs.length ? " " + attrs.join(" ") : ""}>${content}</td>`;
    }
    case "horizontalRule":
      return "<hr>";
    case "hardBreak":
      return "<br>";
    case "taskList": {
      const items = node.content?.map(item => {
        const checked = item.attrs?.checked ? "checked" : "";
        const content = item.content?.map(nodeToHtml).join("") || "";
        return `<li class="task-item"><input type="checkbox" ${checked} disabled />${content}</li>`;
      }).join("") || "";
      return `<ul class="task-list">${items}</ul>`;
    }
    case "image": {
      const src = (node.attrs?.src as string) || "";
      const alt = (node.attrs?.alt as string) || "";
      const title = (node.attrs?.title as string) || "";
      return `<img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}"${title ? ` title="${escapeHtml(title)}"` : ""} />`;
    }
    default:
      if (node.content) {
        return node.content.map(nodeToHtml).join("");
      }
      return "";
  }
}

function getPreviewStyles(isDark: boolean, scopeId: string): string {
  return `
    .${scopeId} {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 15px;
      line-height: 1.7;
      padding: 32px;
      overflow-y: auto;
      color: ${isDark ? "#e5e5e5" : "#171717"};
      background-color: ${isDark ? "#1a1a1a" : "#fafafa"};
    }
    .${scopeId} h1 {
      font-size: 2em;
      font-weight: 700;
      margin: 1.5em 0 0.5em;
      line-height: 1.2;
      letter-spacing: -0.02em;
      color: ${isDark ? "#ffffff" : "#000000"};
    }
    .${scopeId} h2 {
      font-size: 1.5em;
      font-weight: 600;
      margin: 1.25em 0 0.5em;
      line-height: 1.25;
      letter-spacing: -0.01em;
      color: ${isDark ? "#ffffff" : "#000000"};
    }
    .${scopeId} h3 {
      font-size: 1.25em;
      font-weight: 600;
      margin: 1em 0 0.5em;
      line-height: 1.3;
      color: ${isDark ? "#f5f5f5" : "#171717"};
    }
    .${scopeId} h4 {
      font-size: 1.1em;
      font-weight: 600;
      margin: 1em 0 0.5em;
      color: ${isDark ? "#e5e5e5" : "#262626"};
    }
    .${scopeId} h1:first-child,
    .${scopeId} h2:first-child,
    .${scopeId} h3:first-child,
    .${scopeId} h4:first-child {
      margin-top: 0;
    }
    .${scopeId} p {
      margin: 0.75em 0;
    }
    .${scopeId} p:first-child {
      margin-top: 0;
    }
    .${scopeId} ul,
    .${scopeId} ol {
      margin: 0.75em 0;
      padding-left: 1.75em;
    }
    .${scopeId} li {
      margin: 0.35em 0;
    }
    .${scopeId} li p {
      margin: 0.25em 0;
    }
    .${scopeId} ul ul,
    .${scopeId} ol ol,
    .${scopeId} ul ol,
    .${scopeId} ol ul {
      margin: 0.25em 0;
    }
    .${scopeId} blockquote {
      border-left: 4px solid ${isDark ? "#525252" : "#d4d4d4"};
      margin: 1em 0;
      padding: 0.5em 0 0.5em 1em;
      color: ${isDark ? "#a3a3a3" : "#525252"};
      font-style: italic;
    }
    .${scopeId} blockquote p {
      margin: 0.5em 0;
    }
    .${scopeId} pre {
      background: ${isDark ? "#262626" : "#f5f5f5"};
      border: 1px solid ${isDark ? "#404040" : "#e5e5e5"};
      border-radius: 8px;
      padding: 16px 20px;
      overflow-x: auto;
      margin: 1em 0;
      font-family: "SF Mono", Monaco, Consolas, "Liberation Mono", monospace;
      font-size: 13px;
      line-height: 1.5;
    }
    .${scopeId} code {
      font-family: "SF Mono", Monaco, Consolas, "Liberation Mono", monospace;
      font-size: 0.875em;
    }
    .${scopeId} :not(pre) > code {
      background: ${isDark ? "#262626" : "#f0f0f0"};
      padding: 2px 6px;
      border-radius: 4px;
      border: 1px solid ${isDark ? "#404040" : "#e5e5e5"};
    }
    .${scopeId} .inline-code {
      background: ${isDark ? "#262626" : "#f0f0f0"};
      padding: 2px 6px;
      border-radius: 4px;
      border: 1px solid ${isDark ? "#404040" : "#e5e5e5"};
    }
    .${scopeId} hr {
      border: none;
      border-top: 1px solid ${isDark ? "#404040" : "#e5e5e5"};
      margin: 2em 0;
    }
    .${scopeId} strong {
      font-weight: 600;
    }
    .${scopeId} em {
      font-style: italic;
    }
    .${scopeId} .task-list {
      list-style: none;
      padding-left: 0;
    }
    .${scopeId} .task-item {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      margin: 0.5em 0;
    }
    .${scopeId} .task-item input {
      margin-top: 5px;
      accent-color: ${isDark ? "#8b5cf6" : "#7c3aed"};
    }
    .${scopeId} table {
      width: 100%;
      border-collapse: collapse;
      margin: 1.5em 0;
      font-size: 14px;
    }
    .${scopeId} thead {
      background: ${isDark ? "#262626" : "#f5f5f5"};
    }
    .${scopeId} th,
    .${scopeId} td {
      border: 1px solid ${isDark ? "#404040" : "#d4d4d4"};
      padding: 10px 14px;
      text-align: left;
    }
    .${scopeId} th {
      background: ${isDark ? "#262626" : "#f5f5f5"};
      font-weight: 600;
    }
    .${scopeId} tbody tr:nth-child(even) td {
      background: ${isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)"};
    }
    .${scopeId} img {
      max-width: 100%;
      height: auto;
      border-radius: 8px;
      margin: 1em 0;
    }
    .${scopeId} a {
      color: ${isDark ? "#a78bfa" : "#7c3aed"};
      text-decoration: none;
    }
    .${scopeId} a:hover {
      text-decoration: underline;
    }
    .${scopeId} del {
      text-decoration: line-through;
      opacity: 0.7;
    }
  `;
}

export function TipTapPreview({ content, className = "" }: TipTapPreviewProps) {
  const { isDark } = useTheme();
  const scopeId = useId().replace(/:/g, "");
  
  // Parse and render content
  const html = useMemo(() => {
    if (!content) return "";
    
    // Try to parse as TipTap JSON first
    let doc: TipTapDoc | null = null;
    
    if (typeof content === "string") {
      // Check if it's JSON (starts with { and contains "type":"doc")
      const trimmed = content.trim();
      if (trimmed.startsWith("{") && trimmed.includes('"type"')) {
        try {
          const parsed = JSON.parse(trimmed);
          if (parsed?.type === "doc" && Array.isArray(parsed.content)) {
            doc = parsed;
          }
        } catch {
          // Not valid JSON, treat as markdown
        }
      }
      
      // If not TipTap JSON, parse as markdown
      if (!doc) {
        return marked.parse(content) as string;
      }
    } else if (content && typeof content === "object" && "type" in content && content.type === "doc") {
      doc = content as TipTapDoc;
    }
    
    // Render TipTap JSON
    if (doc?.content) {
      return doc.content.map(nodeToHtml).join("\n");
    }
    
    return "";
  }, [content]);
  
  if (!html) {
    return (
      <div 
        className={`${className} flex items-center justify-center`}
        style={{ color: isDark ? "#737373" : "#a3a3a3" }}
      >
        No content to preview
      </div>
    );
  }
  
  const scopeClass = `preview-${scopeId}`;
  
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: getPreviewStyles(isDark, scopeClass) }} />
      <div 
        className={`${className} ${scopeClass}`}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </>
  );
}
