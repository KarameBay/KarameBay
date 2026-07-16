import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";

const money = z.number().int().min(0).max(10_000_000);
const positiveMeasure = z.number().finite().positive().max(100_000);
const sortOrder = z.number().int().min(0).max(100_000);
const optionalDescription = z.string().trim().max(1_000).nullable().optional();

const pricingSchema = z.object({
  action: z.literal("UPDATE_PRICING"),
  expectedVersion: z.number().int().min(0),
  baseFeeRwf: money,
  perKmRwf: money,
  roundingIncrementRwf: z.number().int().min(1).max(100_000),
  sizeSurchargeEnabled: z.boolean(),
  weightSurchargeEnabled: z.boolean(),
  weightFreeAllowanceKg: z.number().finite().min(0).max(10_000),
  weightSurchargePerKgRwf: money,
  fragileSurchargeEnabled: z.boolean(),
  fragileSurchargeRwf: money,
  carefulHandlingEnabled: z.boolean(),
  carefulHandlingRwf: money,
  waitingTimeChargeEnabled: z.boolean(),
  waitingGraceMinutes: z.number().int().min(0).max(1_440),
  waitingPerMinuteRwf: money,
  scheduledSurchargeEnabled: z.boolean(),
  scheduledSurchargeRwf: money,
  isActive: z.boolean(),
});

const sizeSchema = z.object({
  action: z.literal("SAVE_SIZE"),
  id: z.string().min(1).optional(),
  code: z.string().trim().toUpperCase().regex(/^[A-Z][A-Z0-9_]{1,39}$/),
  name: z.string().trim().min(2).max(80),
  description: optionalDescription,
  examples: z.array(z.string().trim().min(1).max(100)).max(20),
  maxWeightKg: positiveMeasure,
  maxLengthCm: positiveMeasure,
  maxWidthCm: positiveMeasure,
  maxHeightCm: positiveMeasure,
  surchargeRwf: money,
  sortOrder,
  isActive: z.boolean(),
});

const capacitySchema = z.object({
  action: z.literal("SAVE_CAPACITY"),
  id: z.string().min(1).optional(),
  vehicleType: z.string().trim().toUpperCase().regex(/^[A-Z][A-Z0-9_]{1,39}$/),
  maxWeightKg: positiveMeasure,
  maxLengthCm: positiveMeasure,
  maxWidthCm: positiveMeasure,
  maxHeightCm: positiveMeasure,
  isActive: z.boolean(),
});

const categorySchema = z.object({
  action: z.literal("SAVE_CATEGORY"),
  id: z.string().min(1).optional(),
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(80),
  name: z.string().trim().min(2).max(80),
  description: optionalDescription,
  sortOrder,
  isActive: z.boolean(),
});

const prohibitedRuleSchema = z.object({
  action: z.literal("SAVE_PROHIBITED_RULE"),
  id: z.string().min(1).optional(),
  title: z.string().trim().min(2).max(160),
  description: optionalDescription,
  sortOrder,
  isActive: z.boolean(),
});

const requestSchema = z.discriminatedUnion("action", [
  pricingSchema,
  sizeSchema,
  capacitySchema,
  categorySchema,
  prohibitedRuleSchema,
]);

async function requireAdmin() {
  const user = await getCurrentUser("ADMIN");
  if (!user) return { error: "Unauthenticated", status: 401 as const };
  if (user.role !== "ADMIN")
    return { error: "Administrator access required", status: 403 as const };
  return { user };
}

export async function GET() {
  const context = await requireAdmin();
  if ("error" in context)
    return NextResponse.json(
      { error: context.error },
      { status: context.status },
    );

  const [pricing, sizes, capacities, categories, prohibitedRules] =
    await Promise.all([
      db.parcelPricingSetting.findUnique({ where: { id: "parcel" } }),
      db.parcelSizeDefinition.findMany({
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      }),
      db.parcelVehicleCapacity.findMany({
        orderBy: [{ isActive: "desc" }, { vehicleType: "asc" }],
      }),
      db.parcelCategory.findMany({
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      }),
      db.parcelProhibitedItemRule.findMany({
        orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
      }),
    ]);
  return NextResponse.json({
    pricing,
    sizes: sizes.map((size) => ({
      ...size,
      examples: parseExamples(size.examplesJson),
    })),
    capacities,
    categories,
    prohibitedRules,
  });
}

export async function PATCH(request: Request) {
  const context = await requireAdmin();
  if ("error" in context)
    return NextResponse.json(
      { error: context.error },
      { status: context.status },
    );

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json(
      { error: "Review the parcel settings and correct the highlighted values." },
      { status: 400 },
    );

  try {
    const input = parsed.data;
    if (input.action === "UPDATE_PRICING") {
      const pricing = await db.$transaction(async (tx) => {
        const existing = await tx.parcelPricingSetting.findUnique({
          where: { id: "parcel" },
          select: { version: true },
        });
        const data = {
          baseFeeRwf: input.baseFeeRwf,
          perKmRwf: input.perKmRwf,
          roundingIncrementRwf: input.roundingIncrementRwf,
          sizeSurchargeEnabled: input.sizeSurchargeEnabled,
          weightSurchargeEnabled: input.weightSurchargeEnabled,
          weightFreeAllowanceKg: input.weightFreeAllowanceKg,
          weightSurchargePerKgRwf: input.weightSurchargePerKgRwf,
          fragileSurchargeEnabled: input.fragileSurchargeEnabled,
          fragileSurchargeRwf: input.fragileSurchargeRwf,
          carefulHandlingEnabled: input.carefulHandlingEnabled,
          carefulHandlingRwf: input.carefulHandlingRwf,
          waitingTimeChargeEnabled: input.waitingTimeChargeEnabled,
          waitingGraceMinutes: input.waitingGraceMinutes,
          waitingPerMinuteRwf: input.waitingPerMinuteRwf,
          scheduledSurchargeEnabled: input.scheduledSurchargeEnabled,
          scheduledSurchargeRwf: input.scheduledSurchargeRwf,
          isActive: input.isActive,
          updatedById: context.user.id,
        };
        if (!existing) {
          if (input.expectedVersion !== 0) throw new Error("VERSION_CONFLICT");
          return tx.parcelPricingSetting.create({
            data: { id: "parcel", version: 1, ...data },
          });
        }
        const changed = await tx.parcelPricingSetting.updateMany({
          where: { id: "parcel", version: input.expectedVersion },
          data: { ...data, version: { increment: 1 } },
        });
        if (changed.count !== 1) throw new Error("VERSION_CONFLICT");
        return tx.parcelPricingSetting.findUniqueOrThrow({
          where: { id: "parcel" },
        });
      });
      return NextResponse.json({ pricing });
    }

    if (input.action === "SAVE_SIZE") {
      const data = {
        code: input.code,
        name: input.name,
        description: input.description || null,
        examplesJson: JSON.stringify(input.examples),
        maxWeightKg: input.maxWeightKg,
        maxLengthCm: input.maxLengthCm,
        maxWidthCm: input.maxWidthCm,
        maxHeightCm: input.maxHeightCm,
        surchargeRwf: input.surchargeRwf,
        sortOrder: input.sortOrder,
        isActive: input.isActive,
      };
      const size = input.id
        ? await updateExisting(
            () => db.parcelSizeDefinition.updateMany({ where: { id: input.id }, data }),
            () => db.parcelSizeDefinition.findUniqueOrThrow({ where: { id: input.id } }),
          )
        : await db.parcelSizeDefinition.create({ data });
      return NextResponse.json({
        size: { ...size, examples: parseExamples(size.examplesJson) },
      });
    }

    if (input.action === "SAVE_CAPACITY") {
      const data = {
        vehicleType: input.vehicleType,
        maxWeightKg: input.maxWeightKg,
        maxLengthCm: input.maxLengthCm,
        maxWidthCm: input.maxWidthCm,
        maxHeightCm: input.maxHeightCm,
        isActive: input.isActive,
      };
      const capacity = input.id
        ? await updateExisting(
            () => db.parcelVehicleCapacity.updateMany({ where: { id: input.id }, data }),
            () => db.parcelVehicleCapacity.findUniqueOrThrow({ where: { id: input.id } }),
          )
        : await db.parcelVehicleCapacity.create({ data });
      return NextResponse.json({ capacity });
    }

    if (input.action === "SAVE_CATEGORY") {
      const data = {
        slug: input.slug,
        name: input.name,
        description: input.description || null,
        sortOrder: input.sortOrder,
        isActive: input.isActive,
      };
      const category = input.id
        ? await updateExisting(
            () => db.parcelCategory.updateMany({ where: { id: input.id }, data }),
            () => db.parcelCategory.findUniqueOrThrow({ where: { id: input.id } }),
          )
        : await db.parcelCategory.create({ data });
      return NextResponse.json({ category });
    }

    const data = {
      title: input.title,
      description: input.description || null,
      sortOrder: input.sortOrder,
      isActive: input.isActive,
    };
    const prohibitedRule = input.id
      ? await updateExisting(
          () => db.parcelProhibitedItemRule.updateMany({ where: { id: input.id }, data }),
          () => db.parcelProhibitedItemRule.findUniqueOrThrow({ where: { id: input.id } }),
        )
      : await db.parcelProhibitedItemRule.create({ data });
    return NextResponse.json({ prohibitedRule });
  } catch (error) {
    if (error instanceof Error && error.message === "VERSION_CONFLICT")
      return NextResponse.json(
        { error: "Parcel pricing changed in another Admin session. Refresh and try again." },
        { status: 409 },
      );
    if ((error as { code?: string }).code === "P2002")
      return NextResponse.json(
        { error: "That code, vehicle type, or category slug is already in use." },
        { status: 409 },
      );
    if ((error as { code?: string }).code === "P2025")
      return NextResponse.json(
        { error: "This parcel setting no longer exists. Refresh and try again." },
        { status: 404 },
      );
    console.error("Parcel settings update failed", error);
    return NextResponse.json(
      { error: "Could not save parcel settings." },
      { status: 500 },
    );
  }
}

function parseExamples(value: string) {
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

async function updateExisting<T>(
  update: () => Promise<{ count: number }>,
  read: () => Promise<T>,
) {
  const changed = await update();
  if (changed.count !== 1) {
    const error = new Error("Not found") as Error & { code?: string };
    error.code = "P2025";
    throw error;
  }
  return read();
}
