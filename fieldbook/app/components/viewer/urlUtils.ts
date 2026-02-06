/**
 * URL utilities for normalizing and detecting embeddable URLs
 * Handles Google Drive, Docs, Sheets, Slides, and other common services
 * 
 * Internal-first: For Sparq internal documents, we use the standard edit URL
 * to allow full editing within Fieldbook.
 */

export interface UrlInfo {
  originalUrl: string;
  embedUrl: string;
  fallbackUrl: string; // Fallback URL if primary embed fails
  service: "google-drive" | "google-docs" | "google-sheets" | "google-slides" | "google-forms" | "youtube" | "vimeo" | "figma" | "generic";
  canEmbed: boolean;
  allowsEditing: boolean; // Whether the embed mode supports editing
  title?: string;
}

/**
 * Extract file ID from various Google URL formats
 */
function extractGoogleFileId(url: string): string | null {
  // Google Drive file: https://drive.google.com/file/d/FILE_ID/view
  const driveFileMatch = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (driveFileMatch) return driveFileMatch[1];

  // Google Drive open: https://drive.google.com/open?id=FILE_ID
  const driveOpenMatch = url.match(/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/);
  if (driveOpenMatch) return driveOpenMatch[1];

  // Google Docs/Sheets/Slides: https://docs.google.com/document/d/DOC_ID/edit
  const docsMatch = url.match(/docs\.google\.com\/(?:document|spreadsheets|presentation)\/d\/([a-zA-Z0-9_-]+)/);
  if (docsMatch) return docsMatch[1];

  // Google Forms: https://docs.google.com/forms/d/FORM_ID/viewform
  const formsMatch = url.match(/docs\.google\.com\/forms\/d\/([a-zA-Z0-9_-]+)/);
  if (formsMatch) return formsMatch[1];

  return null;
}

/**
 * Detect the service type from URL
 */
function detectService(url: string): UrlInfo["service"] {
  const urlLower = url.toLowerCase();
  
  if (urlLower.includes("drive.google.com")) return "google-drive";
  if (urlLower.includes("docs.google.com/document")) return "google-docs";
  if (urlLower.includes("docs.google.com/spreadsheets")) return "google-sheets";
  if (urlLower.includes("docs.google.com/presentation")) return "google-slides";
  if (urlLower.includes("docs.google.com/forms")) return "google-forms";
  if (urlLower.includes("youtube.com") || urlLower.includes("youtu.be")) return "youtube";
  if (urlLower.includes("vimeo.com")) return "vimeo";
  if (urlLower.includes("figma.com")) return "figma";
  
  return "generic";
}

/**
 * Convert a URL to its embeddable version
 * 
 * For internal Sparq documents:
 * - Google Docs/Sheets use the standard /edit URL for full editing capability
 * - Falls back to /preview if editing doesn't work
 */
export function normalizeForEmbed(url: string): UrlInfo {
  const service = detectService(url);
  
  switch (service) {
    case "google-drive": {
      const fileId = extractGoogleFileId(url);
      if (fileId) {
        return {
          originalUrl: url,
          embedUrl: `https://drive.google.com/file/d/${fileId}/preview`,
          fallbackUrl: `https://drive.google.com/file/d/${fileId}/view`,
          service,
          canEmbed: true,
          allowsEditing: false,
        };
      }
      break;
    }
    
    case "google-docs": {
      const docId = extractGoogleFileId(url);
      if (docId) {
        // Use standard /edit URL for full editing capability
        // The embedded param helps with iframe embedding
        return {
          originalUrl: url,
          embedUrl: `https://docs.google.com/document/d/${docId}/edit?embedded=true`,
          fallbackUrl: `https://docs.google.com/document/d/${docId}/preview`,
          service,
          canEmbed: true,
          allowsEditing: true,
        };
      }
      break;
    }
    
    case "google-sheets": {
      const sheetId = extractGoogleFileId(url);
      if (sheetId) {
        // Use standard /edit URL for full editing capability
        return {
          originalUrl: url,
          embedUrl: `https://docs.google.com/spreadsheets/d/${sheetId}/edit?embedded=true`,
          fallbackUrl: `https://docs.google.com/spreadsheets/d/${sheetId}/preview`,
          service,
          canEmbed: true,
          allowsEditing: true,
        };
      }
      break;
    }
    
    case "google-slides": {
      const slideId = extractGoogleFileId(url);
      if (slideId) {
        // Use standard /edit URL for full editing capability
        return {
          originalUrl: url,
          embedUrl: `https://docs.google.com/presentation/d/${slideId}/edit?embedded=true`,
          fallbackUrl: `https://docs.google.com/presentation/d/${slideId}/embed?start=false&loop=false&delayms=3000`,
          service,
          canEmbed: true,
          allowsEditing: true,
        };
      }
      break;
    }
    
    case "google-forms": {
      const formId = extractGoogleFileId(url);
      if (formId) {
        return {
          originalUrl: url,
          embedUrl: `https://docs.google.com/forms/d/${formId}/viewform?embedded=true`,
          fallbackUrl: `https://docs.google.com/forms/d/${formId}/viewform`,
          service,
          canEmbed: true,
          allowsEditing: false,
        };
      }
      break;
    }
    
    case "youtube": {
      let videoId: string | null = null;
      
      const standardMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
      if (standardMatch) videoId = standardMatch[1];
      
      const embedMatch = url.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/);
      if (embedMatch) videoId = embedMatch[1];
      
      if (videoId) {
        return {
          originalUrl: url,
          embedUrl: `https://www.youtube.com/embed/${videoId}`,
          fallbackUrl: `https://www.youtube.com/watch?v=${videoId}`,
          service,
          canEmbed: true,
          allowsEditing: false,
        };
      }
      break;
    }
    
    case "vimeo": {
      const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
      if (vimeoMatch) {
        return {
          originalUrl: url,
          embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}`,
          fallbackUrl: `https://vimeo.com/${vimeoMatch[1]}`,
          service,
          canEmbed: true,
          allowsEditing: false,
        };
      }
      break;
    }
    
    case "figma": {
      if (url.includes("/file/") || url.includes("/proto/")) {
        return {
          originalUrl: url,
          embedUrl: `https://www.figma.com/embed?embed_host=fieldbook&url=${encodeURIComponent(url)}`,
          fallbackUrl: url,
          service,
          canEmbed: true,
          allowsEditing: false,
        };
      }
      break;
    }
  }
  
  // Generic URL - try to embed directly
  return {
    originalUrl: url,
    embedUrl: url,
    fallbackUrl: url,
    service: "generic",
    canEmbed: true,
    allowsEditing: false,
  };
}

/**
 * Get a human-readable service name
 */
export function getServiceLabel(service: UrlInfo["service"]): string {
  switch (service) {
    case "google-drive": return "Google Drive";
    case "google-docs": return "Google Docs";
    case "google-sheets": return "Google Sheets";
    case "google-slides": return "Google Slides";
    case "google-forms": return "Google Forms";
    case "youtube": return "YouTube";
    case "vimeo": return "Vimeo";
    case "figma": return "Figma";
    default: return "Link";
  }
}

/**
 * Check if service is a Google service
 */
export function isGoogleService(service: UrlInfo["service"]): boolean {
  return service.startsWith("google-");
}

/**
 * Check if service is an editable Google document type
 */
export function isEditableGoogleDoc(service: UrlInfo["service"]): boolean {
  return service === "google-docs" || service === "google-sheets" || service === "google-slides";
}

/**
 * Extract domain from URL for display
 */
export function getDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace("www.", "");
  } catch {
    return url;
  }
}
