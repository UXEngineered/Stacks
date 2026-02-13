/**
 * API Response Envelope
 *
 * Standard wrapper for all v2 API responses.
 * Every response is either `{ ok: true, data, meta }` or `{ ok: false, error }`.
 */

import { NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ApiMeta {
  /** ISO timestamp of the response */
  ts: string;
  /** API version */
  v: "2";
}

export interface ApiOk<T> {
  ok: true;
  data: T;
  meta: ApiMeta;
}

export interface ApiError {
  ok: false;
  error: {
    code: string;
    message: string;
  };
}

export type ApiResponse<T> = ApiOk<T> | ApiError;

// ---------------------------------------------------------------------------
// Helpers — return plain objects (for MCP / non-HTTP use)
// ---------------------------------------------------------------------------

/** Build a success envelope object */
export function okEnvelope<T>(data: T): ApiOk<T> {
  return {
    ok: true,
    data,
    meta: {
      ts: new Date().toISOString(),
      v: "2",
    },
  };
}

/** Build an error envelope object */
export function errEnvelope(code: string, message: string): ApiError {
  return {
    ok: false,
    error: { code, message },
  };
}

// ---------------------------------------------------------------------------
// Helpers — return NextResponse (for REST API routes)
// ---------------------------------------------------------------------------

/** Return a JSON NextResponse with success envelope */
export function ok<T>(data: T, status = 200): NextResponse<ApiOk<T>> {
  return NextResponse.json(okEnvelope(data), { status });
}

/** Return a JSON NextResponse with error envelope */
export function err(
  code: string,
  message: string,
  status = 400,
): NextResponse<ApiError> {
  return NextResponse.json(errEnvelope(code, message), { status });
}

// ---------------------------------------------------------------------------
// Actor parsing (from X-Actor header)
// ---------------------------------------------------------------------------

export type Actor =
  | { kind: "user"; id: string }
  | { kind: "agent"; id: string; name?: string };

/**
 * Parse the `X-Actor` header value into an Actor object.
 *
 * Format:
 *   - `user:<id>`            → { kind: "user", id }
 *   - `agent:<id>`           → { kind: "agent", id }
 *   - `agent:<id>:<name>`    → { kind: "agent", id, name }
 *
 * Returns a default user actor if the header is missing or malformed.
 */
export function parseActor(header: string | null): Actor {
  if (!header) return { kind: "user", id: "anonymous" };

  const parts = header.split(":");
  if (parts.length < 2) return { kind: "user", id: "anonymous" };

  const kind = parts[0];
  const id = parts[1];

  if (kind === "agent") {
    return {
      kind: "agent",
      id,
      name: parts.length > 2 ? parts.slice(2).join(":") : undefined,
    };
  }

  return { kind: "user", id };
}
