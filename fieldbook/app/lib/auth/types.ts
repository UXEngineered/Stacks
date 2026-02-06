/**
 * Authentication and Collaboration Types
 * 
 * Data models for users, memberships, invitations, and edit sessions.
 */

// =============================================================================
// User
// =============================================================================

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  createdAt: Date;
}

// =============================================================================
// Field Book Membership
// =============================================================================

export type MemberRole = "owner" | "editor";

export interface FieldBookMember {
  id: string;
  fieldBookId: string;
  userId: string;
  user?: User; // Populated on fetch
  role: MemberRole;
  invitedBy: string;
  joinedAt: Date;
}

// =============================================================================
// Invitation
// =============================================================================

export interface Invitation {
  id: string;
  fieldBookId: string;
  email: string;
  invitedBy: string;
  invitedByUser?: User; // Populated on fetch
  createdAt: Date;
  expiresAt: Date;
}

// =============================================================================
// Edit Session (Presence)
// =============================================================================

export interface EditSession {
  id: string;
  documentId: string; // Source, Synthesis, or Artifact ID
  documentType: "source" | "synthesis" | "artifact";
  userId: string;
  user?: User; // Populated on fetch
  startedAt: Date;
  lastHeartbeat: Date;
}

// =============================================================================
// Field Book (extends existing project concept)
// =============================================================================

export interface FieldBook {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
}

// =============================================================================
// API Request/Response Types
// =============================================================================

export interface InviteRequest {
  fieldBookId: string;
  email: string;
}

export interface InviteResponse {
  success: boolean;
  invitation?: Invitation;
  error?: string;
}

export interface HeartbeatRequest {
  documentId: string;
  documentType: "source" | "synthesis" | "artifact";
}

export interface HeartbeatResponse {
  success: boolean;
  session?: EditSession;
  error?: string;
}

export interface PresenceResponse {
  sessions: EditSession[];
}

export interface MembersResponse {
  members: FieldBookMember[];
  invitations: Invitation[];
}

// =============================================================================
// Session User (from NextAuth)
// =============================================================================

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  image?: string;
}
