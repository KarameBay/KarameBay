import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  if (!process.argv.includes("--apply")) {
    throw new Error("No changes made. Run with --apply after creating a verified database backup.");
  }

  const admin = await db.user.findFirst({
    where: { role: "ADMIN", status: "ACTIVE" },
    orderBy: { createdAt: "asc" },
    select: { id: true, email: true },
  });
  if (!admin) throw new Error("An active administrator is required.");

  const legacyOwners = await db.user.findMany({
    where: {
      OR: [
        { role: "STORE_OWNER" },
        {
          email: {
            in: [
              "java.owner@karamebay.rw",
              "kimironko.owner@karamebay.rw",
              "zinia.owner@karamebay.rw",
            ],
          },
        },
      ],
    },
    select: { id: true, email: true },
  });
  const legacyOwnerIds = legacyOwners.map((owner) => owner.id);

  const result = await db.$transaction(
    async (tx) => {
      const requiredGroups = await tx.restaurantChoiceGroup.updateMany({
        where: { required: true, minChoices: 0 },
        data: { minChoices: 1 },
      });

      let storesReassigned = 0;
      let sessionsRevoked = 0;
      let accountsArchived = 0;
      if (legacyOwnerIds.length) {
        storesReassigned = (
          await tx.store.updateMany({
            where: { ownerId: { in: legacyOwnerIds } },
            data: { ownerId: admin.id },
          })
        ).count;
        sessionsRevoked = (
          await tx.session.deleteMany({ where: { userId: { in: legacyOwnerIds } } })
        ).count;
        accountsArchived = (
          await tx.user.updateMany({
            where: { id: { in: legacyOwnerIds } },
            data: { role: "CUSTOMER", status: "ARCHIVED" },
          })
        ).count;
      }

      return {
        requiredChoiceGroupsRepaired: requiredGroups.count,
        storesReassigned,
        sessionsRevoked,
        accountsArchived,
      };
    },
    { maxWait: 10_000, timeout: 30_000 },
  );

  console.log(
    JSON.stringify(
      {
        result: "APPLIED",
        managingAdmin: admin.email,
        archivedLegacyOwners: legacyOwners.map((owner) => owner.email),
        ...result,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
