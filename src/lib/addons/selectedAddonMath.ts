import type { Addon, SelectedAddon } from "@/types";

/**
 * Cost of one addon on a single cake.
 * A missing quantity is one, so older cart lines stay priced as before.
 */
/** How many of this addon belong to one cake. A missing quantity is one. */
export function addonCount(quantity?: number): number {
  const raw = quantity ?? 1;
  return Number.isFinite(raw) && raw > 0 ? raw : 1;
}

/** Shown only when the customer picked more than one. One stays unmarked. */
export function addonQuantityMark(quantity?: number): string {
  const count = addonCount(quantity);
  return count > 1 ? ` × ${count}` : "";
}

export function addonUnitCost(addon: { price?: number; quantity?: number }): number {
  const price = Number(addon.price);
  const unit = Number.isFinite(price) ? price : 0;
  return unit * addonCount(addon.quantity);
}

/** Addon cost for one cake, then multiplied by how many cakes are on the line. */
export function addonLineCost(
  addon: { price?: number; quantity?: number },
  lineQuantity?: number
): number {
  const lines = lineQuantity ?? 1;
  const count = Number.isFinite(lines) && lines > 0 ? lines : 1;
  return addonUnitCost(addon) * count;
}

/** Sum of addon costs for one cake or product. Line quantity is applied by the caller. */
export function addonsUnitCost(
  addons?: Array<{ price?: number; quantity?: number }> | null
): number {
  return (addons ?? []).reduce((sum, addon) => sum + addonUnitCost(addon), 0);
}

/**
 * Catalog quantity for one cake.
 * When the catalog addon does not allow a quantity, the count is always 1.
 */
export function clampAddonQuantity(
  catalog: { allowQuantity?: boolean; maxQuantity?: number } | null | undefined,
  submitted: unknown
): number {
  if (!catalog || catalog.allowQuantity !== true) return 1;
  const max = catalog.maxQuantity;
  if (typeof max !== "number" || !Number.isInteger(max) || max < 1) return 1;
  const raw = Math.floor(Number(submitted));
  const qty = Number.isFinite(raw) ? raw : 1;
  return Math.min(Math.max(1, qty), max);
}

export function catalogAllowsQuantity(
  catalog: { allowQuantity?: boolean; maxQuantity?: number } | null | undefined
): boolean {
  if (!catalog || catalog.allowQuantity !== true) return false;
  const max = catalog.maxQuantity;
  return typeof max === "number" && Number.isInteger(max) && max >= 1;
}

function variantMatches(
  variant: Addon["variants"][number],
  submitted: Pick<SelectedAddon, "variantId" | "variantName">
): boolean {
  if (submitted.variantId && variant._id) {
    return String(variant._id) === String(submitted.variantId);
  }
  return variant.name === submitted.variantName;
}

/**
 * Replace client prices with the catalog variant price and clamp quantity.
 * Selections that are not in the catalog are dropped.
 */
export function normalizeSelectedAddons(
  catalogById: Map<string, Addon>,
  submitted: SelectedAddon[] | undefined
): SelectedAddon[] {
  if (!submitted?.length) return [];
  const out: SelectedAddon[] = [];

  for (const add of submitted) {
    const catalog = catalogById.get(String(add.addonId));
    if (!catalog) continue;
    const variant = catalog.variants.find((v) => variantMatches(v, add));
    if (!variant) continue;

    const quantity = clampAddonQuantity(catalog, add.quantity);
    const snapshot: SelectedAddon = {
      addonId: String(catalog._id),
      name: catalog.name,
      variantName: variant.name,
      price: Number((Number(variant.price) || 0).toFixed(2)),
      imageUrl: variant.imageUrl || catalog.imageUrl || add.imageUrl,
    };
    if (variant._id) snapshot.variantId = String(variant._id);
    if (catalog.allowQuantity === true) snapshot.quantity = quantity;
    out.push(snapshot);
  }

  return out;
}
