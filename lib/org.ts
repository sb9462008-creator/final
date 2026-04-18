import { redirect } from "next/navigation";
import { stackServerApp } from "@/stack/server";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";

export type OrgRole = "SUPER_ADMIN" | "MANAGER" | "STAFF";

export interface OrgContext {
  organizationId: string;
  role: OrgRole;
  userId: string;
  orgName?: string;
}

export const ROLE_HIERARCHY: Record<OrgRole, number> = {
  STAFF: 0,
  MANAGER: 1,
  SUPER_ADMIN: 2,
};

const ORG_CONTEXT_TTL = 300; // 5 minutes

/**
 * Resolves org context — cached in Redis for 5 minutes.
 */
export async function getOrgContext(): Promise<OrgContext> {
  const user = await stackServerApp.getUser();
  if (!user) redirect("/sign-in");

  const cacheKey = `user:${user.id}:orgContext`;

  // Try Redis cache first
  try {
    const cached = await redis.get<OrgContext>(cacheKey);
    if (cached) return cached;
  } catch {}

  // Fetch from DB
  const member = await prisma.member.findFirst({
    where: { userId: user.id },
    include: { organization: { select: { id: true, name: true } } },
  });

  // Orphaned member — org was deleted
  if (member && !member.organization) {
    await prisma.member.delete({ where: { id: member.id } }).catch(() => {});
    redirect("/onboarding");
  }

  if (!member) redirect("/onboarding");

  const ctx: OrgContext = {
    organizationId: member.organizationId,
    role: member.role as OrgRole,
    userId: user.id,
    orgName: member.organization?.name,
  };

  // Cache in Redis
  try {
    await redis.setex(cacheKey, ORG_CONTEXT_TTL, JSON.stringify(ctx));
  } catch {}

  return ctx;
}

/**
 * Invalidates the org context cache for a user.
 * Call this when membership changes.
 */
export async function invalidateOrgContext(userId: string) {
  try {
    await redis.del(`user:${userId}:orgContext`);
  } catch {}
}

export function requireRole(ctx: OrgContext, required: OrgRole | OrgRole[]): void {
  const requiredRoles = Array.isArray(required) ? required : [required];
  const hasPermission = requiredRoles.some(
    (r) => ROLE_HIERARCHY[ctx.role] >= ROLE_HIERARCHY[r]
  );
  if (!hasPermission) {
    throw new Error(`Unauthorized: requires [${requiredRoles.join(", ")}], got ${ctx.role}`);
  }
}

export function hasRole(ctx: OrgContext, required: OrgRole): boolean {
  return ROLE_HIERARCHY[ctx.role] >= ROLE_HIERARCHY[required];
}
