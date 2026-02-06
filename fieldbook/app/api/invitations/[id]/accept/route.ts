/**
 * Accept Invitation API
 * 
 * POST /api/invitations/[id]/accept - Accept an invitation
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { acceptInvitation, getInvitation } from "@/app/lib/auth";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: invitationId } = await params;

  // Get invitation
  const invitation = getInvitation(invitationId);
  if (!invitation) {
    return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
  }

  // Check email matches
  if (invitation.email !== session.user.email?.toLowerCase()) {
    return NextResponse.json(
      { error: "This invitation is for a different email address" },
      { status: 403 }
    );
  }

  // Check if expired
  if (invitation.expiresAt < new Date()) {
    return NextResponse.json({ error: "Invitation has expired" }, { status: 400 });
  }

  // Accept invitation
  const member = acceptInvitation(invitationId, session.user.id);
  if (!member) {
    return NextResponse.json({ error: "Could not accept invitation" }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    fieldBookId: invitation.fieldBookId,
    member,
  });
}
