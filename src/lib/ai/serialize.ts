import type { Document } from "mongodb";
import { resolveName, type LookupMaps } from "@/lib/db/lookupMaps";
import type { CustomOrderItem } from "@/types";

/**
 * Shared shaping helpers for the Baker AI endpoints.
 *
 * Every field an LLM does not need is dropped here rather than in each route,
 * so the prompt payload stays small and the two AI endpoints describe the same
 * order the same way.
 */

/** Strip undefined, null, blank strings and empty arrays. */
export function compact<T extends Record<string, unknown>>(
  input: T
): Partial<T> {
  const output: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined || value === null) continue;
    if (typeof value === "string" && !value.trim()) continue;
    if (Array.isArray(value) && value.length === 0) continue;
    output[key] = value;
  }
  return output as Partial<T>;
}

/** The 6-character code the baker sees in the UI, on receipts and in emails. */
export function shortId(id: string): string {
  return id.slice(-6).toUpperCase();
}

function formatAddons(addons: unknown): string[] | undefined {
  if (!Array.isArray(addons)) return undefined;
  return addons.map((addon: Document) =>
    addon.variantName ? `${addon.name} — ${addon.variantName}` : addon.name
  );
}

function formatTiers(tiers: unknown, maps: LookupMaps) {
  if (!Array.isArray(tiers)) return undefined;
  return tiers.map((tier: Document, index: number) =>
    compact({
      tier: (typeof tier.tierIndex === "number" ? tier.tierIndex : index) + 1,
      size: tier.sizeLabel,
      flavor: tier.flavorName ?? resolveName(maps.flavors, tier.flavorId),
    })
  );
}

/**
 * Shapes an `orders.items[]` entry. Denormalized names stored on the item win
 * over the lookup maps — they are a snapshot from when the order was placed.
 */
export function shapeOrderItem(item: Document, maps: LookupMaps) {
  return compact({
    name: item.name,
    quantity: item.quantity,
    price: item.price,
    rowTotal: item.rowTotal,
    category: resolveName(maps.categories, item.categoryId),
    flavor:
      item.flavor ?? item.customFlavor ?? resolveName(maps.flavors, item.flavorId),
    size: item.customSize ?? resolveName(maps.diameters, item.diameterId),
    shape: item.customShape ?? resolveName(maps.shapes, item.shapeId),
    inscription: item.inscription,
    designNotes: item.designInstructions,
    tiers: formatTiers(item.tiers, maps),
    addons: formatAddons(item.addons),
  });
}

export interface CustomOrderItemOptions {
  /** Cloudinary URLs are long; only include them where the caller needs them. */
  includeReferenceImages?: boolean;
}

/** Shapes a normalized `custom_orders.items[]` entry. */
export function shapeCustomOrderItem(
  item: CustomOrderItem,
  maps: LookupMaps,
  options: CustomOrderItemOptions = {}
) {
  const details = item.details ?? {};

  return compact({
    referenceImages: options.includeReferenceImages
      ? item.referenceImages
      : undefined,
    category: item.category || resolveName(maps.categories, item.categoryId),
    size: details.size ?? resolveName(maps.diameters, details.diameterId),
    flavor: details.flavor,
    flavorNote: details.flavorNote,
    shape: details.shape,
    textOnCake: details.textOnCake,
    designNotes: details.designNotes,
    tiers: formatTiers(details.tiers, maps),
    addons: formatAddons(item.addons),
    approximatePrice: item.approximatePrice,
    agreedPrice: item.agreedPrice,
    designQuote: item.designQuote,
  });
}

/** Shapes `customerInfo` from an order document. */
export function shapeCustomer(customerInfo: Document | undefined) {
  return compact({
    name: customerInfo?.name,
    phone: customerInfo?.phone,
    email: customerInfo?.email,
    social: customerInfo?.socialNickname,
    socialPlatform: customerInfo?.socialPlatform,
    notes: customerInfo?.notes,
  });
}
