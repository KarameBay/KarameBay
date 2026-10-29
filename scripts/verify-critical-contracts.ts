import assert from "node:assert/strict";
import {
  buildRestaurantConfigurationKey,
  computeRestaurantUnitPrice,
  validateRestaurantConfiguration,
} from "@/lib/restaurant-menu";
import { canTransitionOrder } from "@/lib/order-status";
import { customerOrderHref, operationsOrderHref } from "@/lib/order-notifications";

const product = {
  basePriceRwf: 4000,
  variants: [{ id: "large", name: "Large", priceRwf: 5000, isDefault: true, isAvailable: true, sortOrder: 0 }],
  choiceGroups: [{ id: "sauce", name: "Sauce", required: true, minChoices: 1, maxChoices: 1, sortOrder: 0, options: [] }],
  addOns: [{ id: "cheese", name: "Cheese", priceRwf: 500, isAvailable: true, minSelections: 0, maxSelections: 1, options: [] }],
};
const configuration = {
  variant: { id: "large", name: "Large", priceRwf: 5000 },
  selections: [{ groupId: "sauce", groupName: "Sauce", optionIds: ["tomato"], optionNames: ["Tomato"], selectionMode: "SINGLE" as const, priceAdjustmentRwf: 0 }],
  addOns: [{ id: "cheese", name: "Cheese", priceRwf: 500, quantity: 1, optionIds: [], optionNames: [], optionPriceAdjustmentRwf: 0 }],
};

assert.equal(computeRestaurantUnitPrice(product, configuration), 5500);
assert.deepEqual(validateRestaurantConfiguration(product, configuration), []);
assert.equal(buildRestaurantConfigurationKey("meal-1", configuration).includes("meal-1::"), true);
assert.equal(canTransitionOrder("PENDING", "ACCEPTED"), true);
assert.equal(canTransitionOrder("DELIVERED", "PREPARING"), false);
assert.equal(customerOrderHref("KB-100"), "/orders/KB-100/track");
assert.equal(operationsOrderHref("RIDER", "order-1"), "/rider?orderId=order-1");
assert.equal(operationsOrderHref("ADMIN", "order-1"), "/admin?orderId=order-1");

console.log("PASS: menu pricing/validation, order transitions, and customer/operations notification links.");
