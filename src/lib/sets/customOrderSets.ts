import { Db } from "mongodb";
import { findCategoryForCustomOrderItem } from "@/lib/customOrderCategory";
import { calculateCustomOrderTotal } from "@/lib/pricing/customOrderPricing";

export interface CustomOrderCatalogSet {
  _id: unknown;
  name?: string;
  pieceCount?: number;
  maxFlavors?: number;
  basePrice?: unknown;
  categoryIds?: unknown[];
}

/**
 * The set portion of a custom-order estimate: the set's own base price when it
 * has one, otherwise the category price per piece times the piece count.
 */
export function catalogSetPortion(
  set: { basePrice?: unknown; pieceCount: number },
  categoryPricePerPiece: number
): number {
  return typeof set.basePrice === "number" ? set.basePrice : categoryPricePerPiece * set.pieceCount;
}

/**
 * Estimate for one custom-order line (one creation, so nothing is multiplied by a
 * line quantity). A set line is the set portion. A combo line is the cake — the
 * category base price, once — plus the set portion. Addons are added by the caller.
 */
export function customOrderSetEstimate(input: {
  categoryType: "set" | "combo";
  categoryBasePrice: number;
  set: { basePrice?: unknown; pieceCount: number };
}): number {
  const portion = catalogSetPortion(input.set, input.categoryBasePrice);
  return input.categoryType === "combo" ? input.categoryBasePrice + portion : portion;
}

/** Size text admins already read, with the set name appended. */
export function customOrderSetSizeText(
  set: { name: string; pieceCount: number },
  categoryType: "set" | "combo"
): string {
  if (categoryType === "combo") {
    return `Combo Box: ${set.pieceCount} pieces + 4" Pick (${set.name})`;
  }
  return `Quantity: ${set.pieceCount} (${set.name})`;
}

/** Flavor names chosen for the set. A combo counts its treats; the cake is one flavor of its own. */
export function customOrderFlavorNames(flavorText: string, categoryType: "set" | "combo"): string[] {
  const source =
    categoryType === "combo"
      ? flavorText.match(/Treats:\s*\[([^\]]*)\]/)?.[1] ?? ""
      : flavorText;
  const names = source
    .split(",")
    .map((name) => name.trim())
    .filter((name) => name && name !== "None");
  return [...new Set(names)];
}

/** The cake flavor named on a combo custom-order line. */
export function customOrderCakeFlavorName(flavorText: string): string | undefined {
  const cake = flavorText.match(/Treats:\s*\[[^\]]*\]\.\s*Cake:\s*(.*)$/)?.[1]?.trim();
  return cake && cake !== "None" ? cake : undefined;
}

export type ResolvedCustomOrderSet =
  | { status: "legacy" }
  | { status: "error"; error: string }
  | {
      status: "ok";
      setId: string;
      setName: string;
      pieceCount: number;
      sizeText: string;
      baseCakePrice: number;
    };

/**
 * Checks one custom-order line against its category's catalog sets.
 * A category with no sets, and any other category type, keeps today's rules.
 */
export function resolveCustomOrderSetLine(input: {
  categoryName: string;
  categoryType: string | undefined;
  categoryBasePrice: number;
  sets: CustomOrderCatalogSet[];
  setId: unknown;
  flavorText: string;
}): ResolvedCustomOrderSet {
  const categoryType = input.categoryType;
  if ((categoryType !== "set" && categoryType !== "combo") || input.sets.length === 0) {
    return { status: "legacy" };
  }

  const set = input.sets.find((candidate) => String(candidate._id) === String(input.setId ?? ""));
  if (!set || typeof set.pieceCount !== "number") {
    return {
      status: "error",
      error: `Please choose a set offered for ${input.categoryName}.`,
    };
  }

  const names = customOrderFlavorNames(input.flavorText, categoryType);
  const limit = set.maxFlavors ?? 1;
  if (names.length > limit) {
    const setName = set.name ?? "This set";
    return {
      status: "error",
      error: `${input.categoryName} (${setName}) allows up to ${limit} ${limit === 1 ? "flavor" : "flavors"}.`,
    };
  }

  const pieceCount = set.pieceCount;
  const setName = set.name ?? "";
  return {
    status: "ok",
    setId: String(set._id),
    setName,
    pieceCount,
    sizeText: customOrderSetSizeText({ name: setName, pieceCount }, categoryType),
    baseCakePrice: customOrderSetEstimate({
      categoryType,
      categoryBasePrice: input.categoryBasePrice,
      set: { basePrice: set.basePrice, pieceCount },
    }),
  };
}

interface CustomOrderLine {
  categoryId?: string;
  category?: string;
  details?: { size?: string; flavor?: string; setId?: string; [key: string]: unknown };
  addons?: { price: number; quantity?: number }[];
  priceBreakdown?: {
    baseCakePrice: number;
    flavorUpcharge: number;
    addonsCost: number;
    grandTotal: number;
  };
  approximatePrice?: number;
}

type AppliedLines<T> = { ok: true; items: T[] } | { ok: false; error: string };

/**
 * For every line whose category has catalog sets, checks the chosen set and the
 * flavor count, then rewrites the size text and the estimate from the catalog.
 * Every other line is returned untouched.
 */
export async function applyCustomOrderCatalogSets<T extends CustomOrderLine>(
  db: Db,
  items: T[]
): Promise<AppliedLines<T>> {
  const categories = await db
    .collection("categories")
    .find({}, { projection: { name: 1, categoryType: 1, basePrice: 1 } })
    .toArray();

  const setCategoryIds = categories
    .filter((category) => category.categoryType === "set" || category.categoryType === "combo")
    .map((category) => String(category._id));
  const sets: CustomOrderCatalogSet[] =
    setCategoryIds.length === 0
      ? []
      : await db
          .collection("sets")
          .find(
            { categoryIds: { $in: setCategoryIds } },
            { projection: { name: 1, pieceCount: 1, maxFlavors: 1, basePrice: 1, categoryIds: 1 } }
          )
          .toArray();

  const knownCategories = categories.map((category) => ({
    _id: String(category._id),
    name: String(category.name ?? ""),
    categoryType: category.categoryType as "single" | "set" | "combo" | undefined,
    basePrice: Number(category.basePrice) || 0,
  }));

  const applied: T[] = [];
  for (const item of items) {
    const category = findCategoryForCustomOrderItem(
      { categoryId: item.categoryId, category: item.category },
      knownCategories
    );
    const categorySets = sets
      .filter((set) => (set.categoryIds ?? []).map(String).includes(String(category?._id)))
      .sort(
        (a, b) =>
          (a.pieceCount ?? 0) - (b.pieceCount ?? 0) ||
          String(a.name ?? "").localeCompare(String(b.name ?? ""))
      );

    const resolved = resolveCustomOrderSetLine({
      categoryName: category?.name || item.category || "this category",
      categoryType: category?.categoryType,
      categoryBasePrice: category?.basePrice ?? 0,
      sets: categorySets,
      setId: item.details?.setId,
      flavorText: String(item.details?.flavor ?? ""),
    });
    if (resolved.status === "error") return { ok: false, error: resolved.error };
    if (resolved.status === "legacy") {
      applied.push(item);
      continue;
    }

    const priceBreakdown = calculateCustomOrderTotal({
      cakeSizePrice: resolved.baseCakePrice,
      flavorPrice: 0,
      addons: item.addons ?? [],
    });
    applied.push({
      ...item,
      details: { ...item.details, setId: resolved.setId, size: resolved.sizeText },
      priceBreakdown,
      approximatePrice: priceBreakdown.grandTotal,
    });
  }
  return { ok: true, items: applied };
}
