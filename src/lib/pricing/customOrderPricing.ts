/**
 * Forward Math Pricing Engine for Custom Orders
 * ═══════════════════════════════════════════════
 *
 * This is the single source of truth for all custom-order pricing.
 * It is a PURE function — it has no side effects and makes no API calls.
 *
 * Architecture — strictly forward addition:
 *   baseCakePrice   = category.basePrice × size-multiplier (already computed by Step 3)
 *   flavorUpcharge  = flavor.price for the selected premium flavor (0 if standard)
 *   addonsCost      = sum of every selectedAddon.price
 *   ─────────────────────────────────────────────────────
 *   grandTotal      = baseCakePrice + flavorUpcharge + addonsCost
 *
 * Usage:
 *   import { calculateCustomOrderTotal } from "@/lib/pricing/customOrderPricing";
 *
 *   const result = calculateCustomOrderTotal({
 *     cakeSizePrice: 120,   // from Step 3's approximatePrice useMemo
 *     flavorPrice: 10,      // from filteredFlavors.find(id)?.price
 *     addons: selectedAddons,
 *   });
 *   // result.grandTotal → write to form as approximatePrice
 *   // result            → write to form as priceBreakdown
 */

export interface PriceBreakdown {
  /** Size-adjusted cake price (category.basePrice × diameter multiplier, rounded). */
  baseCakePrice: number;
  /** Extra cost from a premium flavor selection — 0 for standard free flavors. */
  flavorUpcharge: number;
  /** Sum of all selected addon variant prices. Mirrors addons[].price. */
  addonsCost: number;
  /** The final grand total: baseCakePrice + flavorUpcharge + addonsCost. */
  grandTotal: number;
}

export function calculateCustomOrderTotal({
  cakeSizePrice,
  flavorPrice = 0,
  addons = [],
}: {
  /** The size-adjusted cake price computed by Step 3 (already rounded). */
  cakeSizePrice: number;
  /** The price field from the selected Flavor document. Defaults to 0. */
  flavorPrice?: number;
  /** The current addons array from form state. Defaults to empty array. */
  addons?: Array<{ price: number }>;
}): PriceBreakdown {
  const baseCakePrice = cakeSizePrice;
  const flavorUpcharge = flavorPrice;
  const addonsCost = addons.reduce((sum, a) => sum + (a.price ?? 0), 0);
  const grandTotal = baseCakePrice + flavorUpcharge + addonsCost;

  return { baseCakePrice, flavorUpcharge, addonsCost, grandTotal };
}
