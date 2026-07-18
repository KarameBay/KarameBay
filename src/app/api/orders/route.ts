import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { getDrivingRoute } from "@/lib/routing";
import { rateLimit } from "@/lib/rate-limit";
import { notifyOrderPlaced, sendAdminNewOrderEmail } from "@/lib/order-notifications";
import { isStoreOpenInKigali } from "@/lib/store-hours";
import {
  computeRestaurantUnitPrice,
  validateRestaurantConfiguration,
} from "@/lib/restaurant-menu";

const schema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        catalogEngine: z.enum(["RESTAURANT", "MARKETPLACE"]),
        quantity: z.number().int().min(1).max(99),
        lineKey: z.string().optional(),
        priceRwf: z.number().int().nonnegative(),
        basePriceRwf: z.number().int().nonnegative().optional(),
        containerChargePerUnitRwf: z.number().int().nonnegative().optional(),
        containerChargeFlatRwf: z.number().int().nonnegative().optional(),
        variant: z
          .object({
            id: z.string(),
            name: z.string(),
            priceRwf: z.number().int().nonnegative(),
          })
          .nullable()
          .optional(),
        selections: z
          .array(
            z.object({
              groupId: z.string(),
              groupName: z.string(),
              optionIds: z.array(z.string()),
              optionNames: z.array(z.string()),
              selectionMode: z.enum(["SINGLE", "MULTIPLE"]),
              priceAdjustmentRwf: z.number().int(),
            }),
          )
          .optional(),
        addOns: z
          .array(
            z.object({
              id: z.string(),
              name: z.string(),
              priceRwf: z.number().int().nonnegative(),
              quantity: z.number().int().min(1).max(99),
              groupName: z.string().optional().nullable(),
              groupSelectionMode: z.enum(["SINGLE", "MULTIPLE"]).optional().nullable(),
              selectionMode: z.enum(["SINGLE", "MULTIPLE"]).optional(),
              optionIds: z.array(z.string()).optional(),
              optionNames: z.array(z.string()).optional(),
              optionPriceAdjustmentRwf: z.number().int().optional().nullable(),
              optionId: z.string().optional().nullable(),
              optionName: z.string().optional().nullable(),
            }),
          )
          .optional(),
        specialInstructions: z.string().max(240).optional(),
      }),
    )
    .min(1)
    .max(60),
  deliveryLatitude: z.number().min(-90).max(90),
  deliveryLongitude: z.number().min(-180).max(180),
  deliveryAddress: z.string().trim().min(5).max(240),
  expectedItemsSubtotalRwf: z.number().int().nonnegative(),
  expectedDeliveryFeeRwf: z.number().int().nonnegative(),
  paymentConfirmed: z.literal(true),
  ageConfirmed: z.boolean().default(false),
});
function orderNumber() {
  const date = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  return `KB-${date}-${randomBytes(3).toString("hex").toUpperCase()}`;
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser("CUSTOMER");
  if (!user)
    return NextResponse.json(
      { error: "Please sign in before placing your order." },
      { status: 401 },
    );
  if (user.role !== "CUSTOMER")
    return NextResponse.json(
      { error: "Only customer accounts can place orders." },
      { status: 403 },
    );
  if (!user.emailVerifiedAt)
    return NextResponse.json(
      { error: "Verify your email before placing an order.", verificationRequired: true },
      { status: 403 },
    );
  if (!rateLimit(`order:${user.id}`, 5, 60_000))
    return NextResponse.json(
      { error: "Please wait before submitting another order." },
      { status: 429 },
    );
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json(
      {
        error: "Please complete the delivery and payment confirmation details.",
      },
      { status: 400 },
    );
  const input = parsed.data;
  const uniqueKeys = [...new Set(input.items.map((item) => item.lineKey ?? item.productId))];
  if (uniqueKeys.length !== input.items.length)
    return NextResponse.json(
      { error: "Duplicate cart items are not allowed." },
      { status: 400 },
    );
  const uniqueIds = [...new Set(input.items.map((item) => item.productId))];
  const catalogEngine = input.items[0].catalogEngine;
  if (input.items.some((item) => item.catalogEngine !== catalogEngine))
    return NextResponse.json(
      { error: "A cart cannot mix restaurant and marketplace products." },
      { status: 400 },
    );
  const restaurantItems =
    catalogEngine === "RESTAURANT"
      ? await db.restaurantProduct.findMany({
          where: { id: { in: uniqueIds } },
          include: {
            store: { include: { storeType: true } },
            variants: {
              orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
            },
            choiceGroups: {
              orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
              include: {
                choices: {
                  orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
                },
              },
            },
            addOnLinks: {
              include: {
                addOn: {
                  include: {
                    options: {
                      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
                    },
                  },
                },
              },
            },
          },
        })
      : [];
  const marketplaceItems =
    catalogEngine === "MARKETPLACE"
      ? await db.marketplaceProduct.findMany({
          where: { id: { in: uniqueIds } },
          include: {
            store: { include: { storeType: true } },
            inventory: true,
            units: {
              where: { isDefault: true, isAvailable: true },
              take: 1,
            },
          },
        })
      : [];
  const products =
    catalogEngine === "RESTAURANT"
      ? restaurantItems.map((product) => ({
          id: product.id,
          storeId: product.storeId,
          name: product.name,
          imageUrl: product.imageUrl,
          basePriceRwf: product.basePriceRwf,
          containerChargePerUnitRwf: product.containerChargePerUnitRwf,
          containerChargeFlatRwf: product.containerChargeFlatRwf,
          unitLabel: null as string | null,
          isAvailable: product.isAvailable && !product.seasonal,
          store: product.store,
          variants: product.variants.map((variant) => ({
            id: variant.id,
            name: variant.name,
            priceRwf: variant.priceRwf,
            isDefault: variant.isDefault,
            isAvailable: variant.isAvailable,
            sortOrder: variant.sortOrder,
          })),
          choiceGroups: product.choiceGroups.map((group) => ({
            id: group.id,
            name: group.name,
            required: group.required,
            minChoices: group.minChoices,
            maxChoices: group.maxChoices,
            sortOrder: group.sortOrder,
            options: group.choices.map((choice) => ({
              id: choice.id,
              name: choice.name,
              priceAdjustmentRwf: choice.priceAdjustmentRwf,
              isAvailable: choice.isAvailable,
              sortOrder: choice.sortOrder,
            })),
          })),
          addOns: product.addOnLinks.map((link) => ({
            id: link.addOn.id,
            name: link.addOn.name,
            priceRwf: link.addOn.priceRwf,
            isAvailable: link.addOn.isAvailable,
            category: link.addOn.category,
            groupName: link.groupName,
            required: link.required ?? link.addOn.required,
            groupSelectionMode: (link.selectionMode === "MULTIPLE" ? "MULTIPLE" : "SINGLE") as
              | "SINGLE"
              | "MULTIPLE",
            selectionMode: link.addOn.selectionMode as "SINGLE" | "MULTIPLE" | undefined,
            minSelections: link.minSelections ?? link.addOn.minSelections,
            maxSelections: link.maxSelections ?? link.addOn.maxSelections,
            hiddenOptionIds: link.hiddenOptionIds,
            optionPriceOverrides: link.optionPriceOverrides,
            options: link.addOn.options
              .filter((option) => !(Array.isArray(link.hiddenOptionIds) && link.hiddenOptionIds.includes(option.id)))
              .map((option) => {
                const override =
                  link.optionPriceOverrides &&
                  typeof link.optionPriceOverrides === "object" &&
                  !Array.isArray(link.optionPriceOverrides)
                    ? (link.optionPriceOverrides as Record<string, unknown>)[option.id]
                    : undefined;
                return {
                  id: option.id,
                  name: option.name,
                  priceAdjustmentRwf:
                    typeof override === "number" && Number.isFinite(override)
                      ? Math.round(override)
                      : option.priceAdjustmentRwf,
                  isAvailable: option.isAvailable,
                  sortOrder: option.sortOrder,
                };
              }),
          })),
        }))
      : marketplaceItems.flatMap((product) => {
          const unit = product.units[0];
          if (!unit) return [];
          return [
            {
              id: product.id,
              storeId: product.storeId,
              name: product.name,
              imageUrl: product.imageUrl,
              priceRwf: unit.priceRwf,
              containerChargePerUnitRwf: product.containerChargePerUnitRwf,
              containerChargeFlatRwf: product.containerChargeFlatRwf,
              unitLabel: unit.label,
              isAvailable:
                product.isAvailable &&
                (!(product.store.storeType?.stockTrackingRequired ?? true) ||
                  (product.inventory?.stockQuantity ?? 0) > 0),
              store: product.store,
            },
          ];
        });
  if (products.length !== uniqueIds.length)
    return NextResponse.json(
      { error: "One or more products no longer exist." },
      { status: 409 },
    );
  const storeId = products[0].storeId;
  if (products[0].store.catalogEngine !== catalogEngine)
    return NextResponse.json(
      { error: "The selected catalog does not match this store." },
      { status: 409 },
    );
  if (products.some((product) => product.storeId !== storeId))
    return NextResponse.json(
      { error: "Checkout supports one store at a time." },
      { status: 400 },
    );
  if (products.some((product) => !product.isAvailable))
    return NextResponse.json(
      { error: "One or more products are currently unavailable." },
      { status: 409 },
    );
  if (products[0].store.storeType?.ageConfirmationRequired && !input.ageConfirmed)
    return NextResponse.json(
      { error: "Confirm that you meet the age requirement before placing this order." },
      { status: 400 },
    );
  if (
    products[0].store.status !== "APPROVED" ||
    !products[0].store.storeType?.isActive ||
    !isStoreOpenInKigali(products[0].store)
  )
    return NextResponse.json(
      { error: "This store is not currently accepting orders." },
      { status: 409 },
    );
  const productById = new Map(
    products.map((product) => [product.id, product] as const),
  );
  let itemsSubtotalRwf = 0;
  for (const inputItem of input.items) {
    const product = productById.get(inputItem.productId);
    if (!product) continue;
    const normalizedAddOns = (inputItem.addOns ?? []).map((addOn) => ({
      ...addOn,
      groupName: addOn.groupName ?? null,
      groupSelectionMode: addOn.groupSelectionMode ?? undefined,
      selectionMode: addOn.selectionMode ?? "SINGLE",
    }));
    const configuration = {
      variant: inputItem.variant ?? null,
      selections: inputItem.selections ?? [],
      addOns: normalizedAddOns,
      specialInstructions: inputItem.specialInstructions,
    };
    const unitPrice =
      "basePriceRwf" in product
        ? computeRestaurantUnitPrice(product, configuration) + product.containerChargePerUnitRwf
        : product.priceRwf + product.containerChargePerUnitRwf;
    if ("basePriceRwf" in product) {
      const validationErrors = validateRestaurantConfiguration(product, {
        ...configuration,
      });
      if (validationErrors.length) {
        return NextResponse.json(
          { error: validationErrors[0] }, { status: 400 });
      }
    }
    if (unitPrice !== inputItem.priceRwf) {
      return NextResponse.json(
        {
          error: "A product price changed. Please review your cart again.",
          code: "QUOTE_CHANGED",
        },
        { status: 409 },
      );
    }
    const flatCharge = product.containerChargeFlatRwf;
    if (
      flatCharge !== (inputItem.containerChargeFlatRwf ?? 0) ||
      product.containerChargePerUnitRwf !== (inputItem.containerChargePerUnitRwf ?? 0)
    ) {
      return NextResponse.json(
        {
          error: "A product container charge changed. Please review your cart again.",
          code: "QUOTE_CHANGED",
        },
        { status: 409 },
      );
    }
    itemsSubtotalRwf += unitPrice * inputItem.quantity + flatCharge;
  }
  if (itemsSubtotalRwf !== input.expectedItemsSubtotalRwf)
    return NextResponse.json(
      {
        error: "A product price changed. Please review your cart again.",
        code: "QUOTE_CHANGED",
      },
      { status: 409 },
    );
  let route;
  try {
    route = await getDrivingRoute(
      {
        latitude: products[0].store.latitude,
        longitude: products[0].store.longitude,
      },
      { latitude: input.deliveryLatitude, longitude: input.deliveryLongitude },
    );
  } catch (error) {
    console.error("Order routing failed", error);
    return NextResponse.json(
      {
        error:
          "The delivery route could not be verified. Please return to the map and try again.",
      },
      { status: 502 },
    );
  }
  if (route.deliveryFeeRwf !== input.expectedDeliveryFeeRwf)
    return NextResponse.json(
      {
        error: "The delivery fee changed. Please confirm the route again.",
        code: "QUOTE_CHANGED",
      },
      { status: 409 },
    );
  const grandTotalRwf = itemsSubtotalRwf + route.deliveryFeeRwf;
  const order = await db.$transaction(async (tx) => {
    const created = await tx.order.create({
      data: {
        orderNumber: orderNumber(),
        customerId: user.id,
        storeId,
        status: "PENDING",
        itemsSubtotalRwf,
        deliveryFeeRwf: route.deliveryFeeRwf,
        grandTotalRwf,
        drivingDistanceM: route.distanceMeters,
        estimatedDurationS: route.durationSeconds,
        deliveryLatitude: input.deliveryLatitude,
        deliveryLongitude: input.deliveryLongitude,
        deliveryAddress: input.deliveryAddress,
        items: {
          create: input.items.map((inputItem) => {
            const product = productById.get(inputItem.productId)!;
            const normalizedAddOns = (inputItem.addOns ?? []).map((addOn) => ({
              ...addOn,
              groupName: addOn.groupName ?? null,
              groupSelectionMode: addOn.groupSelectionMode ?? undefined,
              selectionMode: addOn.selectionMode ?? "SINGLE",
            }));
            const unitPrice =
              "basePriceRwf" in product
                ? computeRestaurantUnitPrice(product, {
                    variant: inputItem.variant ?? null,
                    selections: inputItem.selections ?? [],
                    addOns: normalizedAddOns,
                    specialInstructions: inputItem.specialInstructions,
                  }) + product.containerChargePerUnitRwf
                : product.priceRwf + product.containerChargePerUnitRwf;
            const flatCharge = product.containerChargeFlatRwf;
            return {
              catalogEngine,
              restaurantProductId:
                catalogEngine === "RESTAURANT" ? product.id : null,
              marketplaceProductId:
                catalogEngine === "MARKETPLACE" ? product.id : null,
              productName: product.name,
              productImageUrl: product.imageUrl,
              unitPriceRwf: unitPrice,
              quantity: inputItem.quantity,
              lineTotalRwf: unitPrice * inputItem.quantity + flatCharge,
              unitLabel: product.unitLabel,
              variantName: inputItem.variant?.name ?? null,
              specialInstructions: inputItem.specialInstructions ?? null,
              customizationsJson: JSON.stringify({
                lineKey: inputItem.lineKey ?? inputItem.productId,
                variant: inputItem.variant ?? null,
                selections: inputItem.selections ?? [],
                addOns: normalizedAddOns,
                containerChargePerUnitRwf: product.containerChargePerUnitRwf,
                containerChargeFlatRwf: flatCharge,
                addOnOptions: normalizedAddOns.map((addOn) => ({
                  id: addOn.id,
                  groupName: addOn.groupName ?? null,
                  groupSelectionMode: addOn.groupSelectionMode ?? null,
                  selectionMode: addOn.selectionMode ?? "SINGLE",
                  optionIds: addOn.optionIds ?? (addOn.optionId ? [addOn.optionId] : []),
                  optionNames: addOn.optionNames ?? (addOn.optionName ? [addOn.optionName] : []),
                  optionPriceAdjustmentRwf: addOn.optionPriceAdjustmentRwf ?? null,
                })),
              }),
            };
          }),
        },
        payment: {
          create: {
            provider: "MTN_MOMO",
            payeeName: "Theo",
            status: "PENDING_VERIFICATION",
            amountRwf: grandTotalRwf,
            confirmedAt: new Date(),
          },
        },
        events: {
          create: {
            status: "PENDING",
            note: "Order placed; payment awaiting admin verification.",
            actorId: user.id,
          },
        },
      },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        grandTotalRwf: true,
        customerId: true,
      },
    });
    await notifyOrderPlaced(tx, {
      order: {
        id: created.id,
        customerId: created.customerId,
        orderNumber: created.orderNumber,
        grandTotalRwf: created.grandTotalRwf,
      },
      store: {
        id: storeId,
        name: products[0].store.name,
        ownerId: products[0].store.ownerId,
      },
    });
    return {
      id: created.id,
      orderNumber: created.orderNumber,
      status: created.status,
      grandTotalRwf: created.grandTotalRwf,
      payment: { status: "PENDING_VERIFICATION" },
    };
  });

  try {
    const adminEmail = await sendAdminNewOrderEmail({
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        grandTotalRwf: order.grandTotalRwf,
      },
      store: {
        name: products[0].store.name,
      },
    });
    if (!adminEmail.ok) {
      console.warn("Admin new order email failed", {
        orderId: order.id,
        error: adminEmail.error,
      });
    }
  } catch (error) {
    console.warn("Admin new order email failed", {
      orderId: order.id,
      error: error instanceof Error ? error.message : "Unknown email error",
    });
  }

  return NextResponse.json({ order }, { status: 201 });
}
