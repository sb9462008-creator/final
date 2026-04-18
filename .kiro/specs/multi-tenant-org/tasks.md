# Implementation Plan: Multi-Tenant Organization Support

## Overview

Transform the inventory app from a single-user system into a multi-tenant SaaS platform. Each organization is a fully isolated tenant. Stack Auth Teams handle identity and invitations; Prisma handles roles, product ownership, and the approval workflow; Redis cache keys are namespaced by `organizationId`.

## Tasks

- [x] 1. Update Prisma schema with multi-tenant models
  - Add `Organization`, `Member`, `Invitation`, `MembershipRequest` models and `Role`, `MembershipAction`, `ApprovalStatus` enums to `prisma/schema.prisma` exactly as specified in the design
  - Replace `userId` with `organizationId` (non-nullable FK to `Organization`) on the `Product` model and update the `@@index` accordingly
  - Remove the `userId` field from `Product`
  - _Requirements: 1.1, 1.3, 2.1, 4.1, 4.5, 5.1, 8.1_

- [x] 2. Create and run database migration
  - [x] 2.1 Write data migration script `prisma/migrations/migrate_products_to_org.ts`
    - Create a default "Legacy" `Organization` record and corresponding Stack Auth team stub
    - Assign every existing `Product.userId` to a `Member` record and set `Product.organizationId` to the new org
    - Verify no `Product` row has a null `organizationId` after migration
    - _Requirements: 4.1, 4.5_
  - [x] 2.2 Generate and apply Prisma migration
    - Run `prisma migrate dev --name add_multi_tenant_org` against the dev database
    - Confirm `prisma generate` succeeds with zero type errors
    - _Requirements: 4.1, 4.5_

- [x] 3. Implement `lib/org.ts` — OrgContext helper
  - Define `OrgRole` type and `OrgContext` interface as specified in the design
  - Implement `getOrgContext()` — reads `x-org-id` and `x-org-role` headers from `next/headers`, throws if missing
  - Implement `requireRole(ctx, required)` — throws a 403-style error if `ctx.role` is not in the required set; respect the hierarchy `SUPER_ADMIN > MANAGER > STAFF`
  - Export a `ROLE_HIERARCHY` map for use in middleware and actions
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 4. Implement `middleware.ts` — org context resolution and RBAC
  - Create `middleware.ts` at the project root
  - Authenticate via `stackServerApp.getUser()`; redirect to `/sign-in` if unauthenticated
  - Look up the `Member` record for the user in Prisma; redirect to `/onboarding` if none found
  - Inject `x-org-id` and `x-org-role` response headers on every matched request
  - Protect path patterns: `/dashboard`, `/inventory`, `/add-product`, `/settings`, `/org/:path*`
  - Return 500 (not a redirect) if the Prisma lookup itself throws
  - Export a `config` matcher that excludes `/sign-in`, `/onboarding`, `/handler/:path*`, and static assets
  - _Requirements: 3.1, 3.5, 3.6, 6.1, 6.2, 6.3_

- [x] 5. Implement `lib/actions/org.ts` — organization server actions
  - [x] 5.1 Implement `createOrganization(formData)`
    - Validate org name: reject if empty, whitespace-only, or > 100 characters (Requirement 1.5)
    - Reject if the user already holds `MANAGER` in any org (Requirement 1.4)
    - Call `stackServerApp.createTeam(...)` to create the Stack Auth team
    - In a Prisma transaction: create `Organization` (storing `stackTeamId`) and `Member` with `role = MANAGER`
    - If the Prisma write fails after Stack Auth succeeds, delete the Stack Auth team to avoid orphans
    - Redirect to `/dashboard` on success
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_
  - [ ]* 5.2 Write property test for `createOrganization` — Property 1
    - **Property 1: Organization creator always receives MANAGER role**
    - Generate random valid user IDs and org names with `fc.string()`; assert the created `Member.role === "MANAGER"`
    - **Validates: Requirements 1.2**
  - [ ]* 5.3 Write property test for `createOrganization` — Property 2
    - **Property 2: Organization name validation rejects invalid inputs**
    - Generate empty strings, whitespace-only strings, and strings longer than 100 chars; assert a validation error is returned and no `Organization` row is created
    - **Validates: Requirements 1.5**
  - [ ]* 5.4 Write property test for `createOrganization` — Property 3
    - **Property 3: Duplicate manager creation is rejected**
    - Seed a user with an existing `MANAGER` membership; generate new org names; assert creation is rejected and no new `Organization` row is created
    - **Validates: Requirements 1.4**
  - [x] 5.5 Implement `inviteMember(formData)`
    - Validate email format (RFC 5322 via `zod`); reject invalid emails (Requirement 2.3)
    - Call `requireRole(ctx, "MANAGER")` (Requirement 2.6)
    - Reject if a `PENDING` `Invitation` already exists for the same email + org (Requirement 2.4)
    - Reject if the email belongs to an active `Member` of the org (Requirement 2.5)
    - Call `stackServerApp.sendTeamInvitation(...)` and create an `Invitation` record with `status = "PENDING"`
    - _Requirements: 2.1, 2.3, 2.4, 2.5, 2.6_
  - [ ]* 5.6 Write property test for `inviteMember` — Property 4
    - **Property 4: Invalid email invitation is rejected**
    - Generate strings that are not valid RFC 5322 emails; assert a validation error is returned and no `Invitation` row is created
    - **Validates: Requirements 2.3**
  - [ ]* 5.7 Write property test for `inviteMember` — Property 5
    - **Property 5: Duplicate invitation is rejected**
    - Seed an org with an existing `PENDING` invitation; generate the same email; assert rejection and no duplicate `Invitation` row
    - **Validates: Requirements 2.4**
  - [ ]* 5.8 Write property test for `inviteMember` — Property 6
    - **Property 6: Existing member invitation is rejected**
    - Seed an org with an active `Member`; attempt to invite that member's email; assert rejection
    - **Validates: Requirements 2.5**
  - [ ]* 5.9 Write property test for `inviteMember` — Property 7
    - **Property 7: Non-manager invitation is denied**
    - Generate users with `STAFF` role; assert all invite attempts return an authorization error
    - **Validates: Requirements 2.6, 3.2**
  - [x] 5.10 Implement `getMembers()`
    - Call `requireRole(ctx, ["MANAGER", "STAFF"])` 
    - Query all `Member` records for `ctx.organizationId`
    - Enrich each member with display name and email from Stack Auth user profiles
    - _Requirements: 3.3, 5.1_

- [x] 6. Checkpoint — org actions baseline
  - Ensure all tests written so far pass; confirm `createOrganization` and `inviteMember` type-check cleanly with `tsc --noEmit`

- [x] 7. Implement `lib/actions/membership.ts` — membership request server actions
  - [x] 7.1 Implement `submitMembershipRequest(formData)`
    - Parse `targetUserId`, `action` (`ADD | REMOVE | UPDATE_ROLE`), and optional `newRole` from form data
    - Reject if `targetUserId === ctx.userId` (self-targeting, Requirement 5.7)
    - Reject if a `PENDING` request for the same `[organizationId, targetUserId, action]` already exists (Requirement 8.6)
    - Create a `MembershipRequest` with `status = PENDING`; do NOT apply the membership change
    - _Requirements: 5.2, 5.7, 8.1, 8.2, 8.6, 8.8_
  - [ ]* 7.2 Write property test for `submitMembershipRequest` — Property 11
    - **Property 11: Membership actions create PENDING requests without immediate effect**
    - Generate valid ADD/REMOVE/UPDATE_ROLE actions; assert a `MembershipRequest` with `status = PENDING` is created and the `Member` table is unchanged
    - **Validates: Requirements 5.2, 8.1, 8.2, 8.8**
  - [ ]* 7.3 Write property test for `submitMembershipRequest` — Property 12
    - **Property 12: Self-targeting membership actions are rejected**
    - Generate manager user IDs; submit requests where `targetUserId === requesterId`; assert rejection and no `MembershipRequest` row created
    - **Validates: Requirements 5.7**
  - [ ]* 7.4 Write property test for `submitMembershipRequest` — Property 14
    - **Property 14: Duplicate pending requests are rejected**
    - Seed an existing `PENDING` request; submit the same `[targetUserId, action]` again; assert rejection and no duplicate row
    - **Validates: Requirements 8.6**
  - [x] 7.5 Implement `approveMembershipRequest(requestId)`
    - Call `requireRole(ctx, "MANAGER")`
    - Fetch the request; return not-found if it doesn't belong to `ctx.organizationId` (Requirement 8.7)
    - In a Prisma transaction:
      - Set `status = APPROVED`, record `approverId` and `resolvedAt`
      - For `ADD`: create `Member` record + call `stackServerApp.addTeamMember(...)`
      - For `REMOVE`: delete `Member` record + call `stackServerApp.removeTeamMember(...)`
      - For `UPDATE_ROLE`: update `Member.role` to `newRole`
    - Invalidate `org:{organizationId}:members:*` cache keys
    - _Requirements: 5.3, 5.4, 5.5, 8.4, 8.9_
  - [x] 7.6 Implement `rejectMembershipRequest(requestId)`
    - Call `requireRole(ctx, "MANAGER")`
    - Fetch the request; return not-found if it doesn't belong to `ctx.organizationId` (Requirement 8.7)
    - Set `status = REJECTED`, record `approverId` and `resolvedAt`; leave membership unchanged
    - _Requirements: 5.6, 8.5, 8.9_
  - [ ]* 7.7 Write property test for `approveMembershipRequest` / `rejectMembershipRequest` — Property 15
    - **Property 15: Cross-org approval returns not-found**
    - Generate requests belonging to org B; attempt approval/rejection as a manager of org A; assert not-found response
    - **Validates: Requirements 8.7**
  - [ ]* 7.8 Write property test for approval queue access — Property 16
    - **Property 16: Non-manager approval queue access is denied**
    - Generate users with `STAFF` role; assert all `approveMembershipRequest`, `rejectMembershipRequest`, and `getPendingRequests` calls return an authorization error
    - **Validates: Requirements 5.9, 8.10**
  - [x] 7.9 Implement `getPendingRequests()`
    - Call `requireRole(ctx, "MANAGER")`
    - Query `MembershipRequest` where `organizationId = ctx.organizationId AND status = PENDING`
    - Enrich with requester and target user details from Stack Auth
    - _Requirements: 8.3_
  - [ ]* 7.10 Write property test for `getPendingRequests` — Property 13
    - **Property 13: Approval queue is org-scoped**
    - Seed two orgs each with pending requests; assert a manager of org A only sees org A's requests
    - **Validates: Requirements 8.3**

- [x] 8. Update `lib/actions/products.ts` to use org context
  - Replace all `userId` references with `organizationId` sourced from `getOrgContext()`
  - Update `deleteProduct`: scope `where` clause to `{ id, organizationId }`
  - Update `createProduct`: use `{ ...parsed.data, organizationId }` in `prisma.product.create`
  - Replace cache keys `dashboard:${userId}` and `inventory:${userId}:*` with `org:${organizationId}:dashboard` and `org:${organizationId}:inventory:*`
  - _Requirements: 4.1, 4.2, 4.4, 7.1, 7.2_

- [x] 9. Update Redis cache keys to org-scoped namespace
  - [x] 9.1 Update `app/inventory/page.tsx` cache key from `inventory:${userId}:${q}:${page}` to `org:${organizationId}:inventory:${q}:${page}`
    - Read org context via `getOrgContext()` instead of `getCurrentUser()`
    - Update the Prisma `where` clause to use `organizationId`
    - _Requirements: 4.2, 7.1, 7.4_
  - [x] 9.2 Update `app/dashboard/page.tsx` cache key from `dashboard:${userId}` to `org:${organizationId}:dashboard`
    - Read org context via `getOrgContext()` instead of `getCurrentUser()`
    - Update all Prisma `where` clauses to use `organizationId`
    - _Requirements: 4.2, 7.1, 7.4_
  - [ ]* 9.3 Write property test for cache key namespacing — Property 17
    - **Property 17: Cache keys are org-namespaced**
    - Generate arbitrary `organizationId` strings; call the cache key builder functions; assert every key starts with `org:{organizationId}:`
    - **Validates: Requirements 7.1**
  - [ ]* 9.4 Write property test for cache invalidation — Property 18
    - **Property 18: Product mutations invalidate org cache**
    - Seed two orgs with cached data; perform a product mutation in org A; assert org A's `org:{orgAId}:*` keys are invalidated and org B's keys remain
    - **Validates: Requirements 7.2**

- [x] 10. Checkpoint — data layer complete
  - Ensure all tests pass; run `tsc --noEmit` to confirm zero type errors across `lib/`

- [x] 11. Implement `app/onboarding/page.tsx` — onboarding flow
  - Create `app/onboarding/page.tsx` with two options: "Create Organization" and "Wait for Invitation"
  - Include a form that calls `createOrganization` server action with an org name input
  - Show a confirmation message when waiting for an invitation
  - Apply the dark theme (bg `#0a0a0f`, cyan `#38bdf8`, purple `#a855f7`) consistent with existing pages
  - Do NOT render `<Sidebar>` on this page (user has no org yet)
  - _Requirements: 6.1, 6.4_

- [x] 12. Implement `app/org/members/page.tsx` — member list and invite form
  - Create `app/org/members/page.tsx`
  - Fetch members via `getMembers()` and display name, email, and role in a table matching the existing card/table style
  - Include an invite form (email input + submit button) that calls `inviteMember` — visible only to `MANAGER`
  - Show a "Remove" button per member that calls `submitMembershipRequest` with `action = REMOVE` — visible only to `MANAGER`
  - _Requirements: 2.1, 3.3, 5.1_

- [x] 13. Implement `app/org/approvals/page.tsx` — approval queue
  - Create `app/org/approvals/page.tsx`
  - Fetch pending requests via `getPendingRequests()` and display requester, target, action, and requested role
  - Include "Approve" and "Reject" buttons per request that call `approveMembershipRequest` and `rejectMembershipRequest`
  - Redirect non-managers away (middleware handles this, but add a `requireRole` guard in the page as defense-in-depth)
  - _Requirements: 8.2, 8.3, 8.4, 8.5_

- [x] 14. Implement `app/org/settings/page.tsx` — organization settings
  - Create `app/org/settings/page.tsx`
  - Display the current organization name (read from `Organization` record via `getOrgContext()`)
  - Include a form to update the org name (validate same rules as creation: non-empty, ≤ 100 chars)
  - Restrict to `MANAGER` role via `requireRole`
  - _Requirements: 3.3_

- [x] 15. Update `components/sidebar.tsx` to show org name and org nav links
  - Accept an optional `orgName` prop and render it below the logo area
  - Add navigation links for "Members" (`/org/members`), "Approvals" (`/org/approvals`), and "Org Settings" (`/org/settings`) — visible only when the user is a `MANAGER`
  - Pass `orgName` and `role` from the parent page components (read via `getOrgContext()`)
  - _Requirements: 6.4_

- [x] 16. Wire org context into dashboard and inventory pages
  - Update `app/dashboard/page.tsx` to call `getOrgContext()` and pass `orgName` and `role` to `<Sidebar>`
  - Update `app/inventory/page.tsx` to call `getOrgContext()` and pass `orgName` and `role` to `<Sidebar>`
  - Update `app/add-product/page.tsx` similarly
  - Update `app/settings/page.tsx` similarly
  - _Requirements: 6.2, 6.4_

- [ ] 17. Property-based tests for data isolation
  - [ ]* 17.1 Write property test — Property 8: Product queries are org-scoped
    - **Property 8: Product queries are org-scoped**
    - Generate two orgs each with random products; query products as a member of org A; assert no org B products appear
    - **Validates: Requirements 4.2**
  - [ ]* 17.2 Write property test — Property 9: Member queries are org-scoped
    - **Property 9: Member queries are org-scoped**
    - Generate two orgs each with random members; query members as a member of org A; assert no org B members appear
    - **Validates: Requirements 4.3**
  - [ ]* 17.3 Write property test — Property 10: Cross-tenant product access returns not-found
    - **Property 10: Cross-tenant product access returns not-found**
    - Generate product IDs belonging to org B; request them as a member of org A; assert not-found response with no data leakage
    - **Validates: Requirements 4.4, 3.5**

- [x] 18. Final checkpoint — full test suite
  - Ensure all non-optional tests pass
  - Run `tsc --noEmit` to confirm zero TypeScript errors across the entire project
  - Verify middleware correctly redirects unauthenticated requests to `/sign-in` and org-less users to `/onboarding`

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Property tests use [fast-check](https://github.com/dubzzz/fast-check) with a minimum of 100 iterations each
- Each property test references the property number from the design document for traceability
- The Stack Auth team operations in tasks 5 and 7 should be mocked in unit/property tests; only integration tests hit the real Stack Auth API
- The data migration in task 2 must be run before any other task that touches the `Product` table
- Cache invalidation uses wildcard patterns via the existing `invalidateCache` helper in `lib/redis.ts`
