import type {
  CustomOrder,
  CustomOrderItem,
  CustomOrderItemDetails,
  SelectedAddon,
} from "@/types";

/**
 * Raw shape as stored in MongoDB. Legacy documents keep item-level data at the
 * root (`category`, `details`, `referenceImages`, ...); new documents carry an
 * `items[]` array. This type intentionally allows both.
 */
type RawCustomOrder = Record<string, any>;

/** Generate a stable id for a synthesized legacy item. */
function generateItemId(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15);
}

/** Build a single CustomOrderItem from legacy flat root fields. */
function legacyItemFromRoot(raw: RawCustomOrder): CustomOrderItem {
  const details: CustomOrderItemDetails =
    raw.details && typeof raw.details === "object" ? { ...raw.details } : {};

  // Some very old documents used alternate field names for the same concepts.
  if (details.size === undefined && raw.servingSize !== undefined) {
    details.size = raw.servingSize;
  }
  if (details.flavor === undefined && raw.flavorPreferences !== undefined) {
    details.flavor = raw.flavorPreferences;
  }
  if (details.designNotes === undefined && raw.description !== undefined) {
    details.designNotes = raw.description;
  }

  const referenceImages: string[] = Array.isArray(raw.referenceImages)
    ? raw.referenceImages
    : Array.isArray(raw.referenceImageUrls)
      ? raw.referenceImageUrls
      : [];

  const item: CustomOrderItem = {
    id: typeof raw.itemId === "string" ? raw.itemId : generateItemId(),
    category: raw.category ?? "",
    details,
    referenceImages,
  };

  if (raw.categoryId != null && String(raw.categoryId).trim()) {
    item.categoryId = String(raw.categoryId);
  }

  if (Array.isArray(raw.addons)) item.addons = raw.addons as SelectedAddon[];
  if (raw.priceBreakdown) item.priceBreakdown = raw.priceBreakdown;
  if (typeof raw.approximatePrice === "number") item.approximatePrice = raw.approximatePrice;
  if (typeof raw.agreedPrice === "number") item.agreedPrice = raw.agreedPrice;
  if (typeof raw.designQuote === "number") item.designQuote = raw.designQuote;

  return item;
}

/** Coerce a raw stored item into a well-formed CustomOrderItem. */
function normalizeItem(rawItem: any): CustomOrderItem {
  const details: CustomOrderItemDetails =
    rawItem?.details && typeof rawItem.details === "object" ? { ...rawItem.details } : {};

  const item: CustomOrderItem = {
    id: typeof rawItem?.id === "string" && rawItem.id.length > 0 ? rawItem.id : generateItemId(),
    category: rawItem?.category ?? "",
    details,
    referenceImages: Array.isArray(rawItem?.referenceImages) ? rawItem.referenceImages : [],
  };

  if (rawItem?.categoryId != null && String(rawItem.categoryId).trim()) {
    item.categoryId = String(rawItem.categoryId);
  }

  if (Array.isArray(rawItem?.addons)) item.addons = rawItem.addons as SelectedAddon[];
  if (rawItem?.priceBreakdown) item.priceBreakdown = rawItem.priceBreakdown;
  if (typeof rawItem?.approximatePrice === "number") item.approximatePrice = rawItem.approximatePrice;
  if (typeof rawItem?.agreedPrice === "number") item.agreedPrice = rawItem.agreedPrice;
  if (typeof rawItem?.designQuote === "number") item.designQuote = rawItem.designQuote;

  return item;
}

/** Sum a numeric field across items, returning undefined when nothing is set. */
function sumItemField(
  items: CustomOrderItem[],
  key: "approximatePrice" | "agreedPrice"
): number | undefined {
  let total = 0;
  let found = false;
  for (const item of items) {
    const value = item[key];
    if (typeof value === "number") {
      total += value;
      found = true;
    }
  }
  return found ? total : undefined;
}

/**
 * Normalizes a raw custom order document (legacy flat OR new multi-item) into the
 * canonical `CustomOrder` shape that always exposes an `items[]` array.
 *
 * On-the-fly wrapping — never mutates the DB. Legacy root fields are preserved
 * on the returned object for any consumer still reading them during migration.
 */
export function normalizeCustomOrder(raw: RawCustomOrder): CustomOrder {
  const _id = raw?._id?.toString ? raw._id.toString() : raw?._id;

  let items: CustomOrderItem[];
  if (Array.isArray(raw?.items) && raw.items.length > 0) {
    items = raw.items.map(normalizeItem);
  } else {
    items = [legacyItemFromRoot(raw)];
  }

  const approximatePriceTotal =
    typeof raw?.approximatePriceTotal === "number"
      ? raw.approximatePriceTotal
      : sumItemField(items, "approximatePrice");

  const agreedPriceTotal =
    typeof raw?.agreedPriceTotal === "number"
      ? raw.agreedPriceTotal
      : sumItemField(items, "agreedPrice");

  return {
    ...raw,
    _id,
    items,
    ...(approximatePriceTotal !== undefined ? { approximatePriceTotal } : {}),
    ...(agreedPriceTotal !== undefined ? { agreedPriceTotal } : {}),
  } as CustomOrder;
}

/** Convenience helper to normalize an array of raw documents. */
export function normalizeCustomOrders(rawList: RawCustomOrder[]): CustomOrder[] {
  return Array.isArray(rawList) ? rawList.map(normalizeCustomOrder) : [];
}
