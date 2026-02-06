/**
 * In-Memory Auth Store
 * 
 * For MVP, we store users, memberships, invitations, and edit sessions in memory.
 * In production, this would be replaced with a database.
 */

import type {
  User,
  FieldBook,
  FieldBookMember,
  Invitation,
  EditSession,
} from "./types";

// =============================================================================
// In-Memory Storage
// =============================================================================

const users: Map<string, User> = new Map();
const fieldBooks: Map<string, FieldBook> = new Map();
const members: Map<string, FieldBookMember> = new Map(); // keyed by `${fieldBookId}:${userId}`
const invitations: Map<string, Invitation> = new Map();
const editSessions: Map<string, EditSession> = new Map(); // keyed by documentId

// Edit session timeout (5 minutes)
const SESSION_TIMEOUT_MS = 5 * 60 * 1000;

// =============================================================================
// User Operations
// =============================================================================

export function getUser(id: string): User | undefined {
  return users.get(id);
}

export function getUserByEmail(email: string): User | undefined {
  for (const user of users.values()) {
    if (user.email === email) {
      return user;
    }
  }
  return undefined;
}

export function createUser(data: Omit<User, "createdAt">): User {
  const user: User = {
    ...data,
    createdAt: new Date(),
  };
  users.set(user.id, user);
  return user;
}

export function upsertUser(data: Omit<User, "createdAt">): User {
  const existing = getUser(data.id);
  if (existing) {
    // Update name and avatar if changed
    existing.name = data.name;
    existing.avatarUrl = data.avatarUrl;
    return existing;
  }
  return createUser(data);
}

// =============================================================================
// Field Book Operations
// =============================================================================

export function getFieldBook(id: string): FieldBook | undefined {
  return fieldBooks.get(id);
}

export function createFieldBook(data: Omit<FieldBook, "createdAt" | "updatedAt">): FieldBook {
  const fieldBook: FieldBook = {
    ...data,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  fieldBooks.set(fieldBook.id, fieldBook);
  
  // Auto-add owner as member
  addMember({
    id: `member-${Date.now()}`,
    fieldBookId: fieldBook.id,
    userId: data.ownerId,
    role: "owner",
    invitedBy: data.ownerId,
  });
  
  return fieldBook;
}

export function ensureFieldBook(id: string, name: string, ownerId: string): FieldBook {
  let fieldBook = getFieldBook(id);
  if (!fieldBook) {
    fieldBook = createFieldBook({ id, name, ownerId });
  }
  return fieldBook;
}

// =============================================================================
// Membership Operations
// =============================================================================

function memberKey(fieldBookId: string, userId: string): string {
  return `${fieldBookId}:${userId}`;
}

export function getMember(fieldBookId: string, userId: string): FieldBookMember | undefined {
  const member = members.get(memberKey(fieldBookId, userId));
  if (member) {
    member.user = getUser(member.userId);
  }
  return member;
}

export function getFieldBookMembers(fieldBookId: string): FieldBookMember[] {
  const result: FieldBookMember[] = [];
  for (const member of members.values()) {
    if (member.fieldBookId === fieldBookId) {
      member.user = getUser(member.userId);
      result.push(member);
    }
  }
  return result;
}

export function addMember(data: Omit<FieldBookMember, "joinedAt">): FieldBookMember {
  const member: FieldBookMember = {
    ...data,
    joinedAt: new Date(),
  };
  members.set(memberKey(data.fieldBookId, data.userId), member);
  return member;
}

export function removeMember(fieldBookId: string, userId: string): boolean {
  return members.delete(memberKey(fieldBookId, userId));
}

export function isMember(fieldBookId: string, userId: string): boolean {
  return members.has(memberKey(fieldBookId, userId));
}

export function canEdit(fieldBookId: string, userId: string): boolean {
  const member = getMember(fieldBookId, userId);
  return member !== undefined; // Both owner and editor can edit
}

// =============================================================================
// Invitation Operations
// =============================================================================

export function getInvitation(id: string): Invitation | undefined {
  const invitation = invitations.get(id);
  if (invitation && invitation.invitedBy) {
    invitation.invitedByUser = getUser(invitation.invitedBy);
  }
  return invitation;
}

export function getInvitationByEmail(fieldBookId: string, email: string): Invitation | undefined {
  for (const invitation of invitations.values()) {
    if (invitation.fieldBookId === fieldBookId && invitation.email === email) {
      return invitation;
    }
  }
  return undefined;
}

export function getFieldBookInvitations(fieldBookId: string): Invitation[] {
  const result: Invitation[] = [];
  const now = new Date();
  for (const invitation of invitations.values()) {
    if (invitation.fieldBookId === fieldBookId && invitation.expiresAt > now) {
      invitation.invitedByUser = getUser(invitation.invitedBy);
      result.push(invitation);
    }
  }
  return result;
}

export function getPendingInvitationsForEmail(email: string): Invitation[] {
  const result: Invitation[] = [];
  const now = new Date();
  for (const invitation of invitations.values()) {
    if (invitation.email === email && invitation.expiresAt > now) {
      result.push(invitation);
    }
  }
  return result;
}

export function createInvitation(data: Omit<Invitation, "id" | "createdAt" | "expiresAt">): Invitation {
  const invitation: Invitation = {
    ...data,
    id: `inv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
  };
  invitations.set(invitation.id, invitation);
  return invitation;
}

export function deleteInvitation(id: string): boolean {
  return invitations.delete(id);
}

export function acceptInvitation(invitationId: string, userId: string): FieldBookMember | null {
  const invitation = getInvitation(invitationId);
  if (!invitation || invitation.expiresAt < new Date()) {
    return null;
  }
  
  const member = addMember({
    id: `member-${Date.now()}`,
    fieldBookId: invitation.fieldBookId,
    userId,
    role: "editor",
    invitedBy: invitation.invitedBy,
  });
  
  deleteInvitation(invitationId);
  return member;
}

// =============================================================================
// Edit Session (Presence) Operations
// =============================================================================

export function getEditSession(documentId: string): EditSession | undefined {
  const session = editSessions.get(documentId);
  if (!session) return undefined;
  
  // Check if session has expired
  const now = new Date();
  if (now.getTime() - session.lastHeartbeat.getTime() > SESSION_TIMEOUT_MS) {
    editSessions.delete(documentId);
    return undefined;
  }
  
  session.user = getUser(session.userId);
  return session;
}

export function getFieldBookEditSessions(fieldBookId: string, documentIds: string[]): EditSession[] {
  const result: EditSession[] = [];
  const now = new Date();
  
  for (const docId of documentIds) {
    const session = editSessions.get(docId);
    if (session) {
      // Check if session has expired
      if (now.getTime() - session.lastHeartbeat.getTime() > SESSION_TIMEOUT_MS) {
        editSessions.delete(docId);
      } else {
        session.user = getUser(session.userId);
        result.push(session);
      }
    }
  }
  
  return result;
}

export function startEditSession(
  documentId: string,
  documentType: "source" | "synthesis" | "artifact",
  userId: string
): EditSession | null {
  const existing = getEditSession(documentId);
  
  // If someone else is editing, don't allow
  if (existing && existing.userId !== userId) {
    return null;
  }
  
  // Create or update session
  const session: EditSession = {
    id: `session-${Date.now()}`,
    documentId,
    documentType,
    userId,
    startedAt: existing?.startedAt || new Date(),
    lastHeartbeat: new Date(),
  };
  
  editSessions.set(documentId, session);
  session.user = getUser(userId);
  return session;
}

export function heartbeat(documentId: string, userId: string): EditSession | null {
  const session = editSessions.get(documentId);
  
  if (!session || session.userId !== userId) {
    return null;
  }
  
  session.lastHeartbeat = new Date();
  session.user = getUser(userId);
  return session;
}

export function endEditSession(documentId: string, userId: string): boolean {
  const session = editSessions.get(documentId);
  
  if (!session || session.userId !== userId) {
    return false;
  }
  
  editSessions.delete(documentId);
  return true;
}

// =============================================================================
// Cleanup expired sessions (call periodically)
// =============================================================================

export function cleanupExpiredSessions(): number {
  const now = new Date();
  let cleaned = 0;
  
  for (const [docId, session] of editSessions.entries()) {
    if (now.getTime() - session.lastHeartbeat.getTime() > SESSION_TIMEOUT_MS) {
      editSessions.delete(docId);
      cleaned++;
    }
  }
  
  return cleaned;
}
