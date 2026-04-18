# Requirements Document

## Introduction

This feature adds multi-tenant organization support to the inventory management application. Each organization (company) is a fully isolated tenant: its products, members, and data are never visible to other organizations. Authentication is handled by Stack Auth (which provides a Teams API), while organization metadata, membership roles, and product ownership are persisted in Postgres via Prisma.

Three roles exist within the platform:

- **Super Admin** – the platform owner; can view and manage all organizations.
- **Manager** – creates and owns an organization; can invite Staff members and manage the organization's inventory.
- **Staff** – a member of an organization; can view and manage inventory within their organization.

---

## Glossary

- **System**: The inventory management application as a whole.
- **Auth_Provider**: Stack Auth, the external authentication and identity service.
- **Organization**: A tenant entity representing a single company. Corresponds to a Stack Auth Team.
- **Member**: A user who belongs to an Organization with an assigned Role.
- **Role**: One of three values — `SUPER_ADMIN`, `MANAGER`, or `STAFF`.
- **Manager**: A Member whose Role is `MANAGER`; the creator and administrator of an Organization.
- **Staff**: A Member whose Role is `STAFF`; a regular collaborator within an Organization.
- **Super_Admin**: A platform-level administrator whose Role is `SUPER_ADMIN`.
- **Invitation**: A pending email-based request for a user to join an Organization as Staff.
- **Membership_Request**: A pending request to add, remove, or update the Role of a Member, which requires Manager approval before the action takes effect.
- **Approval_Status**: The state of a Membership_Request — one of `PENDING`, `APPROVED`, or `REJECTED`.
- **Organization_Context**: The currently active Organization associated with an authenticated request.
- **Product**: An inventory item that belongs to exactly one Organization.
- **Cache**: The Upstash Redis cache layer used to reduce database load.

---

## Requirements

### Requirement 1: Organization Creation

**User Story:** As a Manager, I want to create an organization for my company, so that I can manage my team's inventory in an isolated workspace.

#### Acceptance Criteria

1. WHEN an authenticated user submits a valid organization name, THE System SHALL create an Organization record in the database and a corresponding Team in the Auth_Provider.
2. WHEN an Organization is created, THE System SHALL assign the creating user the `MANAGER` Role within that Organization.
3. WHEN an Organization is created, THE System SHALL store the Auth_Provider Team ID alongside the Organization record for future Team API calls.
4. IF an authenticated user already holds the `MANAGER` Role in an existing Organization, THEN THE System SHALL reject the creation request with a descriptive error message.
5. IF the submitted organization name is empty or exceeds 100 characters, THEN THE System SHALL reject the request with a validation error before contacting the Auth_Provider.

---

### Requirement 2: Member Invitation

**User Story:** As a Manager, I want to invite staff members by email, so that my team can collaborate on inventory management within our organization.

#### Acceptance Criteria

1. WHEN a Manager submits a valid email address for invitation, THE System SHALL send an invitation via the Auth_Provider Team invite API and record a pending Invitation in the database.
2. WHEN an invited user accepts the invitation and signs in, THE System SHALL create a Member record with the `STAFF` Role in the Organization.
3. IF the submitted email address does not conform to a valid email format, THEN THE System SHALL reject the invitation request with a validation error.
4. IF a pending Invitation for the same email address already exists within the Organization, THEN THE System SHALL reject the duplicate invitation with a descriptive error message.
5. IF a user with the submitted email address is already an active Member of the Organization, THEN THE System SHALL reject the invitation with a descriptive error message.
6. WHILE a user does not hold the `MANAGER` Role in the Organization, THE System SHALL deny the invitation request with an authorization error.

---

### Requirement 3: Role-Based Access Control

**User Story:** As a platform owner, I want role-based access control enforced on every action, so that users can only perform operations permitted by their role.

#### Acceptance Criteria

1. WHEN an authenticated request is received for any organization-scoped resource, THE System SHALL verify that the requesting user is an active Member of the Organization_Context before processing the request.
2. WHILE a user holds the `STAFF` Role, THE System SHALL permit the user to read and write Products within their Organization and deny all organization management operations.
3. WHILE a user holds the `MANAGER` Role, THE System SHALL permit the user to read and write Products, invite Members, view the member list, and remove Members from their Organization.
4. WHILE a user holds the `SUPER_ADMIN` Role, THE System SHALL permit the user to read all Organizations and all Products across all tenants.
5. IF an authenticated user attempts an operation outside their Role's permissions, THEN THE System SHALL return an authorization error without exposing data from other Organizations.
6. IF an unauthenticated request is received for any protected route, THEN THE System SHALL redirect the request to the sign-in page.

---

### Requirement 4: Data Isolation

**User Story:** As a company manager, I want my organization's inventory data to be completely isolated from other companies, so that confidential business data is never exposed to other tenants.

#### Acceptance Criteria

1. THE System SHALL associate every Product with exactly one Organization via a non-nullable `organizationId` foreign key.
2. WHEN a Member queries Products, THE System SHALL scope all database queries to the Member's Organization_Context and return only Products belonging to that Organization.
3. WHEN a Member queries the member list, THE System SHALL return only Members belonging to the Member's Organization_Context.
4. IF a request references a Product ID that does not belong to the requesting user's Organization_Context, THEN THE System SHALL return a not-found response without revealing that the Product exists in another Organization.
5. THE System SHALL remove the `userId` field from the Product model and replace it with `organizationId` as the sole tenant-scoping key.

---

### Requirement 5: Organization Membership Management

**User Story:** As a Manager, I want to review and approve membership actions for my organization, so that I have full control over who is added, removed, or updated within our workspace.

#### Acceptance Criteria

1. WHEN a Manager requests the member list, THE System SHALL return all active Members of the Organization including their Role, display name, and email address sourced from the Auth_Provider.
2. WHEN a user submits a request to add, remove, or update the Role of a Member, THE System SHALL create a Membership_Request record with Approval_Status `PENDING` and notify the Manager, without applying the action immediately.
3. WHEN a Manager approves a Membership_Request to add a Member, THE System SHALL create the Member record in the database and add the user to the Auth_Provider Team.
4. WHEN a Manager approves a Membership_Request to remove a Member, THE System SHALL delete the Member record from the database and remove the user from the Auth_Provider Team.
5. WHEN a Manager approves a Membership_Request to update a Member's Role, THE System SHALL update the Member record with the new Role.
6. WHEN a Manager rejects a Membership_Request, THE System SHALL set the Approval_Status to `REJECTED` and leave the Member's current state unchanged.
7. IF a Manager attempts to submit a membership action that targets themselves, THEN THE System SHALL reject the request with a descriptive error message.
8. IF a Membership_Request references a Member who does not belong to the Manager's Organization_Context, THEN THE System SHALL return a not-found response.
9. WHILE a user does not hold the `MANAGER` Role in the Organization, THE System SHALL deny membership approval and rejection actions with an authorization error.

---

### Requirement 6: Organization Onboarding Flow

**User Story:** As a new user, I want a clear onboarding experience after signing in, so that I can either create or join an organization before accessing the inventory.

#### Acceptance Criteria

1. WHEN an authenticated user has no Organization membership, THE System SHALL redirect the user to an onboarding page that presents options to create a new Organization or wait for an invitation.
2. WHEN an authenticated user belongs to exactly one Organization, THE System SHALL automatically set that Organization as the Organization_Context for the session.
3. IF an authenticated user attempts to access an inventory or dashboard route without an Organization_Context, THEN THE System SHALL redirect the user to the onboarding page.
4. THE System SHALL display the active Organization name in the sidebar for all authenticated Members.

---

### Requirement 7: Cache Invalidation for Multi-Tenant Data

**User Story:** As a developer, I want the caching layer to be tenant-aware, so that cached data from one organization is never served to members of another organization.

#### Acceptance Criteria

1. THE System SHALL namespace all Cache keys with the `organizationId` of the Organization_Context, replacing the existing `userId`-based cache key scheme.
2. WHEN a Product is created, updated, or deleted, THE System SHALL invalidate all Cache keys scoped to the affected Organization.
3. WHEN a Member is added or removed, THE System SHALL invalidate all Cache keys scoped to the affected Organization.
4. IF a Cache miss occurs, THE System SHALL populate the Cache only with data scoped to the requesting user's Organization_Context.

---

### Requirement 8: Membership Approval Workflow

**User Story:** As a Manager, I want a dedicated approval queue for membership actions, so that I can review, approve, or reject pending requests before any changes take effect in the organization.

#### Acceptance Criteria

1. THE System SHALL maintain a Membership_Request record for every add, remove, and Role-update action, storing the requester identity, target Member, action type, and Approval_Status.
2. WHEN a Membership_Request is created, THE System SHALL set its initial Approval_Status to `PENDING` and make it visible in the Manager's approval queue.
3. WHEN a Manager views the approval queue, THE System SHALL return all Membership_Requests with Approval_Status `PENDING` for the Manager's Organization_Context, including the requester identity, target Member details, and requested action.
4. WHEN a Manager approves a Membership_Request, THE System SHALL set the Approval_Status to `APPROVED`, execute the corresponding membership action, and record the approving Manager's identity and approval timestamp on the request.
5. WHEN a Manager rejects a Membership_Request, THE System SHALL set the Approval_Status to `REJECTED`, leave the Organization's membership unchanged, and record the rejecting Manager's identity and rejection timestamp on the request.
6. IF a Membership_Request with Approval_Status `PENDING` already exists for the same target Member and action type within the Organization, THEN THE System SHALL reject the duplicate submission with a descriptive error message.
7. IF a Manager attempts to approve or reject a Membership_Request that does not belong to their Organization_Context, THEN THE System SHALL return a not-found response.
8. WHILE a Membership_Request has Approval_Status `PENDING`, THE System SHALL prevent the underlying membership action from being applied by any other code path.
9. WHEN a Membership_Request transitions to Approval_Status `APPROVED` or `REJECTED`, THE System SHALL notify the original requester of the outcome.
10. WHILE a user does not hold the `MANAGER` Role in the Organization, THE System SHALL deny all approval queue read and write operations with an authorization error.
