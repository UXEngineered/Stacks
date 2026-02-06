/**
 * Google Drive Document API
 * 
 * Fetches document content from Google Drive using the Docs API.
 * This route is called after the user selects a document via the Picker.
 */

import { NextRequest, NextResponse } from "next/server";

const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;

export async function POST(request: NextRequest) {
  try {
    const { documentId, accessToken } = await request.json();

    if (!documentId) {
      return NextResponse.json({ error: "Document ID is required" }, { status: 400 });
    }

    // For Google Docs, we need to export as plain text
    // The Picker gives us the document ID, we fetch via export
    const exportUrl = `https://www.googleapis.com/drive/v3/files/${documentId}/export?mimeType=text/plain&key=${GOOGLE_API_KEY}`;
    
    const headers: HeadersInit = {};
    if (accessToken) {
      headers["Authorization"] = `Bearer ${accessToken}`;
    }

    const response = await fetch(exportUrl, { headers });

    if (!response.ok) {
      // Try fetching file metadata to get the name at least
      const metaUrl = `https://www.googleapis.com/drive/v3/files/${documentId}?fields=name,mimeType&key=${GOOGLE_API_KEY}`;
      const metaResponse = await fetch(metaUrl, { headers });
      
      if (metaResponse.ok) {
        const meta = await metaResponse.json();
        
        // If it's not a Google Doc, try direct download
        if (!meta.mimeType?.includes("google-apps.document")) {
          const downloadUrl = `https://www.googleapis.com/drive/v3/files/${documentId}?alt=media&key=${GOOGLE_API_KEY}`;
          const downloadResponse = await fetch(downloadUrl, { headers });
          
          if (downloadResponse.ok) {
            const content = await downloadResponse.text();
            return NextResponse.json({ title: meta.name, content });
          }
        }
        
        return NextResponse.json({
          error: "Could not export document",
          details: "Only Google Docs and text files can be imported",
        }, { status: 400 });
      }
      
      return NextResponse.json({
        error: "Failed to fetch document",
        details: response.statusText,
      }, { status: response.status });
    }

    const content = await response.text();

    // Get document metadata for title
    const metaUrl = `https://www.googleapis.com/drive/v3/files/${documentId}?fields=name&key=${GOOGLE_API_KEY}`;
    const metaResponse = await fetch(metaUrl, { headers });
    let title = "Imported Document";
    
    if (metaResponse.ok) {
      const meta = await metaResponse.json();
      title = meta.name || title;
    }

    return NextResponse.json({ title, content });
  } catch (error) {
    console.error("Google Drive import error:", error);
    return NextResponse.json({
      error: "Failed to import document",
      details: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}
