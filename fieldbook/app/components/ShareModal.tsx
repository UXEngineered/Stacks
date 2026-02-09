"use client";

/**
 * ShareModal - Invite collaborators to a Field Book
 * 
 * Features:
 * - List current members with roles
 * - List pending invitations
 * - Invite by email
 * - Remove members (owner only)
 * - Create read-only shareable links with content visibility controls
 */

import { useState, useEffect, useCallback } from "react";
import { useTheme } from "./ThemeProvider";
import { Button } from "./Button";
import type { FieldBookMember, Invitation } from "../lib/auth";

type ShareMode = "invite" | "readonly";
type ContentVisibility = {
  sources: boolean;
  syntheses: boolean;
  artifacts: boolean;
};

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
  
  // Share mode: invite by email or create read-only link
  const [shareMode, setShareMode] = useState<ShareMode>("invite");
  
  // Read-only link options
  const [visibility, setVisibility] = useState<ContentVisibility>({
    sources: true,
    syntheses: true,
    artifacts: true,
  });
  const [linkCopied, setLinkCopied] = useState(false);

  // Current user's role
  const currentUserRole = members.find((m) => m.userId === currentUserId)?.role;
  const isOwner = currentUserRole === "owner";
  
  // Generate read-only link based on visibility settings
  const generateReadOnlyLink = useCallback(() => {
    if (typeof window === "undefined") return "";
    
    const baseUrl = `${window.location.origin}/projects/${fieldBookId}`;
    const params = new URLSearchParams();
    params.set("readonly", "true");
    
    // Only add show param if not all are visible
    const showItems: string[] = [];
    if (visibility.sources) showItems.push("sources");
    if (visibility.syntheses) showItems.push("syntheses");
    if (visibility.artifacts) showItems.push("artifacts");
    
    // If not all visible, encode which ones are
    if (showItems.length < 3 && showItems.length > 0) {
      params.set("show", showItems.join(","));
    }
    
    return `${baseUrl}?${params.toString()}`;
  }, [fieldBookId, visibility]);
  
  const handleCopyLink = useCallback(async () => {
    const link = generateReadOnlyLink();
    try {
      await navigator.clipboard.writeText(link);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy link:", err);
    }
  }, [generateReadOnlyLink]);
  
  const toggleVisibility = (key: keyof ContentVisibility) => {
    setVisibility(prev => ({ ...prev, [key]: !prev[key] }));
  };

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
      {/* Backdrop - subtle blur */}
      <div
        className="absolute inset-0 cursor-pointer"
        style={{ 
          backgroundColor: isDark ? "rgba(0,0,0,0.4)" : "rgba(0,0,0,0.2)",
          backdropFilter: "blur(4px)",
          WebkitBackdropFilter: "blur(4px)",
        }}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-md mx-4 rounded-lg"
        style={{
          backgroundColor: isDark ? "#1c1c1c" : "#ffffff",
          border: `1px solid ${isDark ? "#333333" : "#e5e5e5"}`,
          boxShadow: isDark 
            ? "0 25px 50px -12px rgba(0, 0, 0, 0.7)" 
            : "0 25px 50px -12px rgba(0, 0, 0, 0.2)",
          transformOrigin: 'center',
          animation: 'modalIn 150ms cubic-bezier(0.16, 1, 0.3, 1) forwards',
        }}
      >
        <style>{`
          @keyframes modalIn {
            from {
              opacity: 0;
              transform: scale(0.95);
            }
            to {
              opacity: 1;
              transform: scale(1);
            }
          }
        `}</style>
        
        {/* Header */}
        <div
          className="px-5 py-4 flex items-center justify-between"
          style={{ borderBottom: `1px solid ${isDark ? "#333333" : "#e5e5e5"}` }}
        >
          <h2
            className="text-sm font-medium"
            style={{ color: isDark ? "#fafafa" : "#171717" }}
          >
            Share "{fieldBookName}"
          </h2>
          <Button
            variant="tertiary"
            onClick={onClose}
            style={{ padding: '4px' }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </Button>
        </div>

        {/* Content */}
        <div className="p-5">
          {/* Mode Toggle */}
          <div 
            className="flex mb-5 p-0.5 rounded-md"
            style={{ backgroundColor: isDark ? "#262626" : "#f5f5f5" }}
          >
            <button
              onClick={() => setShareMode("invite")}
              className="flex-1 px-3 py-1.5 font-medium rounded-md transition-all cursor-pointer"
              style={{
                fontSize: "12.5px",
                backgroundColor: shareMode === "invite" 
                  ? (isDark ? "#333333" : "#ffffff") 
                  : "transparent",
                color: shareMode === "invite"
                  ? (isDark ? "#fafafa" : "#171717")
                  : (isDark ? "#737373" : "#a3a3a3"),
                boxShadow: shareMode === "invite" 
                  ? (isDark ? "0 1px 3px rgba(0,0,0,0.4)" : "0 1px 2px rgba(0,0,0,0.1)") 
                  : "none",
              }}
            >
              Invite collaborator
            </button>
            <button
              onClick={() => setShareMode("readonly")}
              className="flex-1 px-3 py-1.5 font-medium rounded-md transition-all cursor-pointer"
              style={{
                fontSize: "12.5px",
                backgroundColor: shareMode === "readonly" 
                  ? (isDark ? "#333333" : "#ffffff") 
                  : "transparent",
                color: shareMode === "readonly"
                  ? (isDark ? "#fafafa" : "#171717")
                  : (isDark ? "#737373" : "#a3a3a3"),
                boxShadow: shareMode === "readonly" 
                  ? (isDark ? "0 1px 3px rgba(0,0,0,0.4)" : "0 1px 2px rgba(0,0,0,0.1)") 
                  : "none",
              }}
            >
              Read-only link
            </button>
          </div>
          
          {shareMode === "invite" ? (
            <>
              {/* Members List */}
              <div className="mb-6">
                <h3
                  className="text-[10px] font-medium tracking-wider uppercase mb-3"
                  style={{ color: isDark ? "#d4d4d4" : "#525252" }}
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
                  className="text-[10px] font-medium tracking-wider uppercase mb-3"
                  style={{ color: isDark ? "#d4d4d4" : "#525252" }}
                >
                  Invite by email
                </h3>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="colleague@example.com"
                    className="flex-1 px-3 py-2 text-[12px] outline-none rounded-md transition-colors"
                    style={{
                      backgroundColor: isDark ? "#262626" : "#f5f5f5",
                      color: isDark ? "#fafafa" : "#171717",
                      border: `1px solid ${isDark ? "#333333" : "#e5e5e5"}`,
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = isDark ? "#525252" : "#a3a3a3";
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = isDark ? "#333333" : "#e5e5e5";
                    }}
                  />
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={isLoading || !email.trim()}
                  >
                    {isLoading ? "Sending..." : "Invite"}
                  </Button>
                </div>

                {error && (
                  <p className="mt-2 text-[11px] text-red-500">{error}</p>
                )}
                {success && (
                  <p className="mt-2 text-[11px] text-green-500">{success}</p>
                )}
              </form>

              {/* Note */}
              <p
                className="mt-4 text-[11px]"
                style={{ color: isDark ? "#525252" : "#a3a3a3" }}
              >
                Invitees must sign in with Google to access this Field Book.
              </p>
            </>
          ) : (
            <>
              {/* Read-only Link Section */}
              <div className="mb-5">
                <h3
                  className="text-[10px] font-medium tracking-wider uppercase mb-3"
                  style={{ color: isDark ? "#d4d4d4" : "#525252" }}
                >
                  What to include
                </h3>
                <div className="space-y-2">
                  <VisibilityCheckbox
                    label="Sources"
                    description="Research inputs and references"
                    checked={visibility.sources}
                    onChange={() => toggleVisibility("sources")}
                    isDark={isDark}
                  />
                  <VisibilityCheckbox
                    label="Syntheses"
                    description="Analysis and insights"
                    checked={visibility.syntheses}
                    onChange={() => toggleVisibility("syntheses")}
                    isDark={isDark}
                  />
                  <VisibilityCheckbox
                    label="Artifacts"
                    description="Deliverables and outputs"
                    checked={visibility.artifacts}
                    onChange={() => toggleVisibility("artifacts")}
                    isDark={isDark}
                  />
                </div>
              </div>
              
              {/* Generated Link */}
              <div>
                <h3
                  className="text-[10px] font-medium tracking-wider uppercase mb-3"
                  style={{ color: isDark ? "#d4d4d4" : "#525252" }}
                >
                  Shareable link
                </h3>
                <div 
                  className="flex items-center gap-2 p-2 rounded-md text-[11px] font-mono"
                  style={{ 
                    backgroundColor: isDark ? "#262626" : "#f5f5f5",
                    border: `1px solid ${isDark ? "#333333" : "#e5e5e5"}`,
                  }}
                >
                  <span 
                    className="flex-1 truncate"
                    style={{ color: isDark ? "#a3a3a3" : "#525252" }}
                  >
                    {generateReadOnlyLink()}
                  </span>
                  <Button
                    variant={linkCopied ? "primary" : "secondary"}
                    onClick={handleCopyLink}
                    style={linkCopied ? {
                      backgroundColor: isDark ? "#166534" : "#166534",
                      color: "#ffffff",
                      border: "none",
                    } : {}}
                  >
                    {linkCopied ? "Copied!" : "Copy"}
                  </Button>
                </div>
              </div>
              
              {/* Read-only notes */}
              <div 
                className="mt-4 p-3 rounded-md text-[11px]"
                style={{ 
                  backgroundColor: isDark ? "#1a1a1a" : "#fefce8",
                  border: `1px solid ${isDark ? "#333333" : "#fef08a"}`,
                  color: isDark ? "#a3a3a3" : "#854d0e",
                  lineHeight: '1.4',
                }}
              >
                <p className="mb-2">
                  <span style={{ color: isDark ? "#e5e5e5" : "#854d0e", fontWeight: 500 }}>Anyone with this link</span> can view the selected content without signing in.
                </p>
                <p>
                  Lineage relationships are always visible, but hidden items show as "Not included" 
                  and cannot be opened.
                </p>
              </div>
            </>
          )}
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
              backgroundColor: isDark ? "#333333" : "#e5e5e5",
              color: isDark ? "#d4d4d4" : "#525252",
            }}
          >
            {initials}
          </div>
        )}
        <div>
          <div
            className="text-[12px]"
            style={{ color: isDark ? "#fafafa" : "#171717" }}
          >
            {user?.name || "Unknown"}{isCurrentUser && " (you)"}
          </div>
          <div
            className="text-[11px]"
            style={{ color: isDark ? "#737373" : "#a3a3a3" }}
          >
            {user?.email}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span
          className="text-[11px] capitalize"
          style={{ color: isDark ? "#737373" : "#a3a3a3" }}
        >
          {member.role}
        </span>
        {canRemove && (
          <button
            onClick={onRemove}
            className="p-1 cursor-pointer transition-colors rounded"
            style={{ color: isDark ? "#737373" : "#a3a3a3" }}
            title="Remove member"
            onMouseEnter={(e) => {
              e.currentTarget.style.color = isDark ? "#fafafa" : "#171717";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = isDark ? "#737373" : "#a3a3a3";
            }}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
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
            backgroundColor: isDark ? "#262626" : "#f5f5f5",
            color: isDark ? "#d4d4d4" : "#525252",
            border: `1px dashed ${isDark ? "#525252" : "#d4d4d4"}`,
          }}
        >
          {initial}
        </div>
        <div>
          <div
            className="text-[12px]"
            style={{ color: isDark ? "#a3a3a3" : "#525252" }}
          >
            {invitation.email}
          </div>
          <div
            className="text-[11px] italic"
            style={{ color: isDark ? "#525252" : "#a3a3a3" }}
          >
            Invitation pending
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Visibility Checkbox
// =============================================================================

interface VisibilityCheckboxProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: () => void;
  isDark: boolean;
}

function VisibilityCheckbox({ label, description, checked, onChange, isDark }: VisibilityCheckboxProps) {
  return (
    <label 
      className="flex items-start gap-3 cursor-pointer group"
      style={{ opacity: checked ? 1 : 0.6 }}
    >
      <div 
        className="mt-0.5 w-4 h-4 rounded-[4px] flex items-center justify-center shrink-0 transition-colors"
        style={{ 
          backgroundColor: checked 
            ? (isDark ? "#fafafa" : "#171717") 
            : "transparent",
          border: `1.5px solid ${checked 
            ? (isDark ? "#fafafa" : "#171717") 
            : (isDark ? "#525252" : "#d4d4d4")}`,
        }}
      >
        {checked && (
          <svg 
            className="w-2.5 h-2.5" 
            fill="none" 
            stroke={isDark ? "#171717" : "#ffffff"} 
            viewBox="0 0 24 24" 
            strokeWidth={3}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        )}
      </div>
      <input 
        type="checkbox" 
        checked={checked} 
        onChange={onChange}
        className="sr-only"
      />
      <div>
        <div 
          className="text-[12px] font-medium"
          style={{ color: isDark ? "#fafafa" : "#171717" }}
        >
          {label}
        </div>
        <div 
          className="text-[11px]"
          style={{ color: isDark ? "#737373" : "#a3a3a3" }}
        >
          {description}
        </div>
      </div>
    </label>
  );
}
