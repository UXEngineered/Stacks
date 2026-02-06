"use client";

/**
 * ShareModal - Invite collaborators to a Field Book
 * 
 * Features:
 * - List current members with roles
 * - List pending invitations
 * - Invite by email
 * - Remove members (owner only)
 */

import { useState, useEffect, useCallback } from "react";
import { useTheme } from "./ThemeProvider";
import type { FieldBookMember, Invitation } from "../lib/auth";

interface ShareModalProps {
  fieldBookId: string;
  fieldBookName: string;
  isOpen: boolean;
  onClose: () => void;
  currentUserId: string;
}

export function ShareModal({
  fieldBookId,
  fieldBookName,
  isOpen,
  onClose,
  currentUserId,
}: ShareModalProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [members, setMembers] = useState<FieldBookMember[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Current user's role
  const currentUserRole = members.find((m) => m.userId === currentUserId)?.role;
  const isOwner = currentUserRole === "owner";

  // Fetch members and invitations
  const fetchMembers = useCallback(async () => {
    try {
      const res = await fetch(`/api/fieldbooks/${fieldBookId}/members`);
      if (res.ok) {
        const data = await res.json();
        setMembers(data.members || []);
        setInvitations(data.invitations || []);
      }
    } catch (err) {
      console.error("Failed to fetch members:", err);
    }
  }, [fieldBookId]);

  useEffect(() => {
    if (isOpen) {
      fetchMembers();
    }
  }, [isOpen, fetchMembers]);

  // Send invitation
  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/fieldbooks/${fieldBookId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess(`Invitation sent to ${email}`);
        setEmail("");
        fetchMembers();
      } else {
        setError(data.error || "Failed to send invitation");
      }
    } catch (err) {
      setError("Failed to send invitation");
    } finally {
      setIsLoading(false);
    }
  };

  // Remove member
  const handleRemoveMember = async (userId: string) => {
    try {
      const res = await fetch(
        `/api/fieldbooks/${fieldBookId}/members?userId=${userId}`,
        { method: "DELETE" }
      );

      if (res.ok) {
        fetchMembers();
      }
    } catch (err) {
      console.error("Failed to remove member:", err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0"
        style={{ backgroundColor: isDark ? "rgba(0,0,0,0.7)" : "rgba(0,0,0,0.3)" }}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-md mx-4"
        style={{
          backgroundColor: isDark ? "#171717" : "#ffffff",
          border: `1px solid ${isDark ? "#404040" : "#e5e5e5"}`,
        }}
      >
        {/* Header */}
        <div
          className="px-5 py-4 flex items-center justify-between"
          style={{ borderBottom: `1px solid ${isDark ? "#404040" : "#e5e5e5"}` }}
        >
          <h2
            className="text-sm font-semibold"
            style={{ color: isDark ? "#fafafa" : "#171717" }}
          >
            Share "{fieldBookName}"
          </h2>
          <button
            onClick={onClose}
            className="p-1"
            style={{ color: isDark ? "#737373" : "#a3a3a3" }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-5">
          {/* Members List */}
          <div className="mb-6">
            <h3
              className="text-[10px] font-semibold tracking-wider uppercase mb-3"
              style={{ color: isDark ? "#737373" : "#737373" }}
            >
              People with access
            </h3>
            <div className="space-y-2">
              {members.map((member) => (
                <MemberRow
                  key={member.id}
                  member={member}
                  isCurrentUser={member.userId === currentUserId}
                  canRemove={isOwner && member.role !== "owner"}
                  onRemove={() => handleRemoveMember(member.userId)}
                  isDark={isDark}
                />
              ))}
              {invitations.map((invitation) => (
                <InvitationRow
                  key={invitation.id}
                  invitation={invitation}
                  isDark={isDark}
                />
              ))}
            </div>
          </div>

          {/* Invite Form */}
          <form onSubmit={handleInvite}>
            <h3
              className="text-[10px] font-semibold tracking-wider uppercase mb-3"
              style={{ color: isDark ? "#737373" : "#737373" }}
            >
              Invite by email
            </h3>
            <div className="flex gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="colleague@example.com"
                className="flex-1 px-3 py-2 text-sm outline-none"
                style={{
                  backgroundColor: isDark ? "#262626" : "#f5f5f5",
                  color: isDark ? "#fafafa" : "#171717",
                  border: `1px solid ${isDark ? "#404040" : "#e5e5e5"}`,
                }}
              />
              <button
                type="submit"
                disabled={isLoading || !email.trim()}
                className="px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
                style={{
                  backgroundColor: isDark ? "#fafafa" : "#171717",
                  color: isDark ? "#171717" : "#fafafa",
                }}
              >
                Invite
              </button>
            </div>

            {error && (
              <p className="mt-2 text-xs text-red-500">{error}</p>
            )}
            {success && (
              <p className="mt-2 text-xs text-green-500">{success}</p>
            )}
          </form>

          {/* Note */}
          <p
            className="mt-4 text-xs"
            style={{ color: isDark ? "#525252" : "#a3a3a3" }}
          >
            Invitees must sign in with Google to access this Field Book.
          </p>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Member Row
// =============================================================================

interface MemberRowProps {
  member: FieldBookMember;
  isCurrentUser: boolean;
  canRemove: boolean;
  onRemove: () => void;
  isDark: boolean;
}

function MemberRow({ member, isCurrentUser, canRemove, onRemove, isDark }: MemberRowProps) {
  const user = member.user;
  const initials = (user?.name || "?")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="flex items-center justify-between py-1.5">
      <div className="flex items-center gap-3">
        {user?.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt={user.name}
            className="w-7 h-7 rounded-full"
          />
        ) : (
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-medium"
            style={{
              backgroundColor: isDark ? "#404040" : "#e5e5e5",
              color: isDark ? "#d4d4d4" : "#525252",
            }}
          >
            {initials}
          </div>
        )}
        <div>
          <div
            className="text-sm"
            style={{ color: isDark ? "#fafafa" : "#171717" }}
          >
            {user?.name || "Unknown"}{isCurrentUser && " (you)"}
          </div>
          <div
            className="text-xs"
            style={{ color: isDark ? "#737373" : "#a3a3a3" }}
          >
            {user?.email}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span
          className="text-xs capitalize"
          style={{ color: isDark ? "#737373" : "#a3a3a3" }}
        >
          {member.role}
        </span>
        {canRemove && (
          <button
            onClick={onRemove}
            className="p-1"
            style={{ color: isDark ? "#737373" : "#a3a3a3" }}
            title="Remove member"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// Invitation Row
// =============================================================================

interface InvitationRowProps {
  invitation: Invitation;
  isDark: boolean;
}

function InvitationRow({ invitation, isDark }: InvitationRowProps) {
  const initial = invitation.email[0].toUpperCase();

  return (
    <div className="flex items-center justify-between py-1.5 opacity-60">
      <div className="flex items-center gap-3">
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-medium"
          style={{
            backgroundColor: isDark ? "#404040" : "#e5e5e5",
            color: isDark ? "#d4d4d4" : "#525252",
            border: `1px dashed ${isDark ? "#525252" : "#d4d4d4"}`,
          }}
        >
          {initial}
        </div>
        <div>
          <div
            className="text-sm"
            style={{ color: isDark ? "#a3a3a3" : "#525252" }}
          >
            {invitation.email}
          </div>
          <div
            className="text-xs italic"
            style={{ color: isDark ? "#525252" : "#a3a3a3" }}
          >
            Invitation pending
          </div>
        </div>
      </div>
    </div>
  );
}
