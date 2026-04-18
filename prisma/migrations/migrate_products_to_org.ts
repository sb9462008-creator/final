/**
 * Data migration: move existing Product.userId → organizationId
 *
 * Run with:  npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/migrations/migrate_products_to_org.ts
 *
 * What it does:
 * 1. Groups existing products by userId
 * 2. For each unique userId, creates an Organization + Member(MANAGER) record
 * 3. Updates all products for that userId to point to the new organizationId
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting migration: userId → organizationId on Product...");

  // Get all distinct userIds from products
  const distinctUsers = await prisma.$queryRaw<{ userId: string }[]>`
    SELECT DISTINCT "userId" FROM "Product"
  `;

  console.log(`Found ${distinctUsers.length} distinct user(s) with products.`);

  for (const { userId } of distinctUsers) {
    // Check if org already exists for this user (idempotent)
    const existingMember = await prisma.member.findFirst({
      where: { userId, role: "MANAGER" },
      include: { organization: true },
    });

    let organizationId: string;

    if (existingMember) {
      organizationId = existingMember.organizationId;
      console.log(`  User ${userId}: reusing existing org ${organizationId}`);
    } else {
      // Create a legacy org for this user
      const org = await prisma.organization.create({
        data: {
          name: `Legacy Org (${userId.slice(0, 8)})`,
          stackTeamId: `legacy_${userId}`, // placeholder — not a real Stack Auth team
          members: {
            create: {
              userId,
              role: "MANAGER",
            },
          },
        },
      });
      organizationId = org.id;
      console.log(`  User ${userId}: created org ${organizationId}`);
    }

    // Update all products for this user
    const updated = await prisma.$executeRaw`
      UPDATE "Product"
      SET "organizationId" = ${organizationId}
      WHERE "userId" = ${userId}
    `;
    console.log(`  Updated ${updated} product(s) for user ${userId}`);
  }

  // Verify no products have null organizationId
  const nullCount = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*) as count FROM "Product" WHERE "organizationId" IS NULL
  `;
  const remaining = Number(nullCount[0]?.count ?? 0);
  if (remaining > 0) {
    throw new Error(`Migration incomplete: ${remaining} product(s) still have null organizationId`);
  }

  console.log("Migration complete. All products have an organizationId.");
}

main()
  .catch((e) => {
    console.error("Migration failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
