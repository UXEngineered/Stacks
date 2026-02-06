/**
 * Document Search API Route
 *
 * GET /api/documents/search?q=<query>&limit=<number>
 * 
 * Searches documents by title for mention/autocomplete functionality.
 * Returns lightweight results suitable for the autocomplete dropdown.
 */

import { NextRequest, NextResponse } from "next/server";
import { listDocuments } from "@/app/lib/document";

export interface DocumentSearchResult {
  id: string;
  title: string;
  updatedAt: string;
}

export interface DocumentSearchResponse {
  results: DocumentSearchResult[];
  query: string;
  total: number;
}

/**
 * GET /api/documents/search
 * 
 * Query params:
 * - q: search query (required, min 1 char)
 * - limit: max results (optional, default 10, max 50)
 * - exclude: comma-separated doc IDs to exclude (optional)
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("q") || "";
  const limitParam = searchParams.get("limit");
  const excludeParam = searchParams.get("exclude");
  
  // Parse limit
  let limit = 10;
  if (limitParam) {
    const parsed = parseInt(limitParam, 10);
    if (!isNaN(parsed) && parsed > 0) {
      limit = Math.min(parsed, 50); // Cap at 50
    }
  }
  
  // Parse excluded IDs
  const excludeIds = new Set(
    excludeParam ? excludeParam.split(",").filter(Boolean) : []
  );
  
  // Get all documents
  const allDocs = listDocuments();
  
  // Filter and search
  const queryLower = query.toLowerCase().trim();
  
  let results: DocumentSearchResult[];
  
  if (queryLower.length === 0) {
    // No query - return recent documents
    results = allDocs
      .filter(doc => !excludeIds.has(doc.id))
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, limit)
      .map(doc => ({
        id: doc.id,
        title: doc.title,
        updatedAt: doc.updatedAt,
      }));
  } else {
    // Search by title (case-insensitive substring match)
    results = allDocs
      .filter(doc => {
        if (excludeIds.has(doc.id)) return false;
        return doc.title.toLowerCase().includes(queryLower);
      })
      .sort((a, b) => {
        // Prioritize matches at the start of the title
        const aStartsWith = a.title.toLowerCase().startsWith(queryLower);
        const bStartsWith = b.title.toLowerCase().startsWith(queryLower);
        if (aStartsWith && !bStartsWith) return -1;
        if (!aStartsWith && bStartsWith) return 1;
        // Then sort alphabetically
        return a.title.localeCompare(b.title);
      })
      .slice(0, limit)
      .map(doc => ({
        id: doc.id,
        title: doc.title,
        updatedAt: doc.updatedAt,
      }));
  }
  
  const response: DocumentSearchResponse = {
    results,
    query,
    total: results.length,
  };
  
  return NextResponse.json(response);
}
