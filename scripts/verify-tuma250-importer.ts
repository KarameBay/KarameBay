import assert from "node:assert/strict";
import { parseTumaProductRow } from "../src/lib/tuma250-importer";

const observedAt = new Date("2026-07-14T09:00:00.000Z");
const simple = parseTumaProductRow({
  product: {
    id: 101,
    name: "Fresh Tomatoes 1kg &amp; Local",
    type: "simple",
    prices: { price: "1750", currency_code: "RWF", currency_minor_unit: 0 },
  },
  categoryName: "Fruits & Vegetables",
  marketName: "Kimironko Market",
  observedAt,
});
assert(simple);
assert.equal(simple.commodityName, "Fresh Tomatoes 1kg & Local");
assert.equal(simple.unit, "1kg");
assert.equal(simple.price, 1750);
assert.equal(simple.externalSourceId, "101:2026-07-14");
assert.equal(simple.externalCommodityId, "101");
assert(!("image" in simple.raw));
assert(!("description" in simple.raw));

const variation = parseTumaProductRow({
  product: {
    id: 202,
    name: "Cassava",
    type: "variation",
    prices: { price: "1500", currency_code: "RWF", currency_minor_unit: 0 },
    attributes: [{ name: "Size", value: "1kg" }],
  },
  parentId: 200,
  inheritedName: "Peeled &amp; Chopped Cassava",
  categoryName: "Fruits & Vegetables",
  marketName: "Zinia Kicukiro Market",
  observedAt,
});
assert(variation);
assert.equal(variation.commodityName, "Peeled & Chopped Cassava — 1kg");
assert.equal(variation.price, 1500);
assert.equal(variation.unit, "1kg");

assert.equal(parseTumaProductRow({
  product: { id: 303, name: "Wrong currency", prices: { price: "10", currency_code: "USD", currency_minor_unit: 2 } },
  categoryName: "Groceries",
  marketName: "Kimironko Market",
  observedAt,
}), null);

console.log("Tuma250 importer checks passed.");
