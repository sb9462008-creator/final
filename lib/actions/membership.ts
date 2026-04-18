"use server";

import { prisma } from "@/lib/prisma";
import { stackServerApp } from "@/stack/server";
import { getOrgContext, requireRole, invalidateOrgContext } from "@/lib/org";
import { invalidateCache } from "@/lib/redis";
import { MembershipAction, Role } from "@prisma/client";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ActionResult {
  error?: string;
  success?: boolean;
}

export interface MembershipRequestWithDetails {
  id: string;
  action: MembershipAction;
  status: string;
  newRole: Role | null;
  requesterId: string;
  requesterName: string | null;
  requesterEmail: string | null;
  targetUserId: string;
  targetName: string | null;
  targetEmail: string | null;
  createdAt: Date;
}

// ─── submitMembershipRequest ─────────────────────────────────────────────────

export async function submitMembershipRequest(
  formData: FormData
): Promise<ActionResult> {
  const ctx = await getOrgContext();

  const targetUserId = String(formData.get("targetUserId") || "");
  const action = String(formData.get("action") || "") as MembershipAction;
  const newRole = (formData.get("newRole") as Role | null) || null;

  if (!targetUserId || !action) {
    return { error: "Missing required fields." };
  }

  // Prevent self-targeting
  if (targetUserId === ctx.userId) {
    return { error: "You cannot submit a membership request targeting yourself." };
  }

  // Validate action value
  if (!["ADD", "REMOVE", "UPDATE_ROLE"].includes(action)) {
    return { error: "Invalid action type." };
  }

  // For UPDATE_ROLE, newRole is required
  if (action === "UPDATE_ROLE" && !newRole) {
    return { error: "New role is required for role update requests." };
  }

  // Check for duplicate PENDING request
  const existing = await prisma.membershipRequest.findFirst({
    where: {
      organizationId: ctx.organizationId,
      targetUserId,
      action,
      status: "PENDING",
    },
  });
  if (existing) {
    return {
      error: "A pending request for this member and action already exists.",
    };
  }

  await prisma.membershipRequest.create({
    data: {
      organizationId: ctx.organizationId,
      requesterId: ctx.userId,
      targetUserId,
      action,
      newRole: action === "UPDATE_ROLE" ? newRole : null,
      status: "PENDING",
    },
  });

  return { success: true };
}

// ─── approveMembershipRequest ────────────────────────────────────────────────

export async function approveMembershipRequest(
  requestId: string
): Promise<ActionResult> {
  const ctx = await getOrgContext();
  requireRole(ctx, "MANAGER");

  // Fetch request — must belong to this org
  const req = await prisma.membershipRequest.findFirst({
    where: { id: requestId, organizationId: ctx.organizationId, status: "PENDING" },
    include: { organization: true },
  });
  if (!req) {
    return { error: "Request not found." };
  }

  try {
    await prisma.$transaction(async (tx) => {
      // Mark as approved
      await tx.membershipRequest.update({
        where: { id: requestId },
        data: {
          status: "APPROVED",
          approverId: ctx.userId,
          resolvedAt: new Date(),
        },
      });

      if (req.action === "ADD") {
        // Create member record
        await tx.member.upsert({
          where: {
            userId_organizationId: {
              userId: req.targetUserId,
              organizationId: ctx.organizationId,
            },
          },
          create: {
            userId: req.targetUserId,
            organizationId: ctx.organizationId,
            role: req.newRole ?? "STAFF",
          },
          update: { role: req.newRole ?? "STAFF" },
        });
        // Add to Stack Auth team
        const team = await stackServerApp.getTeam(req.organization.stackTeamId);
        await team?.addMember(req.targetUserId);
      } else if (req.action === "REMOVE") {
        // Delete member record
        await tx.member.deleteMany({
          where: {
            userId: req.targetUserId,
            organizationId: ctx.organizationId,
          },
        });
        // Remove from Stack Auth team
        const team = await stackServerApp.getTeam(req.organization.stackTeamId);
        await team?.removeMember(req.targetUserId);
      } else if (req.action === "UPDATE_ROLE" && req.newRole) {
        // Update role
        await tx.member.updateMany({
          where: {
            userId: req.targetUserId,
            organizationId: ctx.organizationId,
          },
          data: { role: req.newRole },
        });
      }
    });

    // Invalidate org member cache + target user's org context
    await invalidateCache([`org:${ctx.organizationId}:members*`]);
    await invalidateOrgContext(req.targetUserId);

    return { success: true };
  } catch (err) {
    console.error("[approveMembershipRequest] Failed:", err);
    return { error: "Failed to approve request. Please try again." };
  }
}

// ─── rejectMembershipRequest ─────────────────────────────────────────────────

export async function rejectMembershipRequest(
  requestId: string
): Promise<ActionResult> {
  const ctx = await getOrgContext();
  requireRole(ctx, "MANAGER");

  const req = await prisma.membershipRequest.findFirst({
    where: { id: requestId, organizationId: ctx.organizationId, status: "PENDING" },
  });
  if (!req) {
    return { error: "Request not found." };
  }

  await prisma.membershipRequest.update({
    where: { id: requestId },
    data: {
      status: "REJECTED",
      approverId: ctx.userId,
      resolvedAt: new Date(),
    },
  });

  return { success: true };
}

// ─── getPendingRequests ──────────────────────────────────────────────────────

export async function getPendingRequests(): Promise<MembershipRequestWithDetails[]> {
  const ctx = await getOrgContext();
  requireRole(ctx, "MANAGER");

  const requests = await prisma.membershipRequest.findMany({
    where: { organizationId: ctx.organizationId, status: "PENDING" },
    orderBy: { createdAt: "desc" },
  });

  if (requests.length === 0) return [];

  // Collect unique user IDs to batch fetch
  const userIds = [...new Set(requests.flatMap((r) => [r.requesterId, r.targetUserId]))];

  // Batch fetch all profiles in parallel
  const profileResults = await Promise.allSettled(
    userIds.map((id) => stackServerApp.getUser(id))
  );
  const profileMap = new Map<string, { displayName: string | null; primaryEmail: string | null }>();
  userIds.forEach((id, i) => {
    const result = profileResults[i];
    const u = result.status === "fulfilled" ? result.value : null;
    profileMap.set(id, { displayName: u?.displayName ?? null, primaryEmail: u?.primaryEmail ?? null });
  });

  return requests.map((r) => {
    const requester = profileMap.get(r.requesterId);
    const target = profileMap.get(r.targetUserId);
    return {
      id: r.id,
      action: r.action,
      status: r.status,
      newRole: r.newRole,
      requesterId: r.requesterId,
      requesterName: requester?.displayName ?? null,
      requesterEmail: requester?.primaryEmail ?? null,
      targetUserId: r.targetUserId,
      targetName: target?.displayName ?? null,
      targetEmail: target?.primaryEmail ?? null,
      createdAt: r.createdAt,
    };
  });
}
