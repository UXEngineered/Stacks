/**
 * Field Book Members API
 * 
 * GET /api/fieldbooks/[id]/members - List members and pending invitations
 * POST /api/fieldbooks/[id]/members - Invite a new member
 * DELETE /api/fieldbooks/[id]/members - Remove a member
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  getFieldBookMembers,
  getFieldBookInvitations,
  getMember,
  createInvitation,
  getInvitationByEmail,
  getUserByEmail,
  removeMember,
  ensureFieldBook,
  isMember,
} from "@/app/lib/auth";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET - List members and invitations
export async function GET(request: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: fieldBookId } = await params;

  // Check if user is a member
  if (!isMember(fieldBookId, session.user.id)) {
    return NextResponse.json({ error: "Not a member" }, { status: 403 });
  }

  const members = getFieldBookMembers(fieldBookId);
  const invitations = getFieldBookInvitations(fieldBookId);

  return NextResponse.json({ members, invitations });
}

// POST - Invite a new member
export async function POST(request: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: fieldBookId } = await params;

  // Check if user is a member (both owner and editor can invite)
  if (!isMember(fieldBookId, session.user.id)) {
    return NextResponse.json({ error: "Not a member" }, { status: 403 });
  }

  const body = await request.json();
  const { email } = body;

  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  // Normalize email
  const normalizedEmail = email.toLowerCase().trim();

  // Check if already a member
  const existingUser = getUserByEmail(normalizedEmail);
  if (existingUser && isMember(fieldBookId, existingUser.id)) {
    return NextResponse.json({ error: "User is already a member" }, { status: 400 });
  }

  // Check if already invited
  const existingInvitation = getInvitationByEmail(fieldBookId, normalizedEmail);
  if (existingInvitation) {
    return NextResponse.json({ error: "User has already been invited" }, { status: 400 });
  }

  // Create invitation
  const invitation = createInvitation({
    fieldBookId,
    email: normalizedEmail,
    invitedBy: session.user.id,
  });

  return NextResponse.json({ success: true, invitation });
}

// DELETE - Remove a member
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: fieldBookId } = await params;
  const { searchParams } = new URL(request.url);
  const userIdToRemove = searchParams.get("userId");

  if (!userIdToRemove) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  // Check if requester is owner
  const requesterMember = getMember(fieldBookId, session.user.id);
  if (!requesterMember || requesterMember.role !== "owner") {
    return NextResponse.json({ error: "Only owners can remove members" }, { status: 403 });
  }

  // Can't remove owner
  const targetMember = getMember(fieldBookId, userIdToRemove);
  if (targetMember?.role === "owner") {
    return NextResponse.json({ error: "Cannot remove owner" }, { status: 400 });
  }

  const removed = removeMember(fieldBookId, userIdToRemove);

  return NextResponse.json({ success: removed });
}
