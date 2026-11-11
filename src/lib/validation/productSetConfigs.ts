import { Db, ObjectId } from "mongodb";

export interface StoredSetConfig {
  setId: ObjectId;
  price: number;
}

type Result =
  | { ok: true; data: StoredSetConfig[] }
  | { ok: false; error: string };

/**
 * Validates the catalog sets assigned to a product: each set must exist and belong to
 * the product's category, and each price must be a number above 0. Returns the
 * configs in piece-count order with only `setId` and `price`, so a product can never
 * override a set's flavor limit.
 *
 * `dropOutsideCategory` silently drops sets outside the category instead of rejecting
 * them, for configs already stored on a product whose category is changing.
 */
export async function normalizeProductSetConfigs(
  db: Db,
  raw: unknown,
  categoryId: string | ObjectId | undefined,
  { dropOutsideCategory = false }: { dropOutsideCategory?: boolean } = {}
): Promise<Result> {
  if (raw === undefined || raw === null) return { ok: true, data: [] };
  if (!Array.isArray(raw)) {
    return { ok: false, error: "Assigned sets must be a list." };
  }

  const prices = new Map<string, number>();
  for (const entry of raw) {
    const setId = String((entry as { setId?: unknown })?.setId ?? "");
    const price = (entry as { price?: unknown })?.price;
    if (!ObjectId.isValid(setId)) {
      return { ok: false, error: "Each assigned set needs a valid set id." };
    }
    if (typeof price !== "number" || !Number.isFinite(price) || price <= 0) {
      return { ok: false, error: "Each assigned set needs a price above 0." };
    }
    if (prices.has(setId)) {
      return { ok: false, error: "A set can only be assigned once." };
    }
    prices.set(setId, price);
  }
  if (prices.size === 0) return { ok: true, data: [] };

  const sets = await db
    .collection("sets")
    .find(
      { _id: { $in: [...prices.keys()].map((id) => new ObjectId(id)) } },
      { projection: { name: 1, pieceCount: 1, categoryIds: 1 } }
    )
    .toArray();

  if (sets.length !== prices.size) {
    return { ok: false, error: "One of the assigned sets no longer exists." };
  }
  const category = categoryId ? String(categoryId) : "";
  const inCategory = (set: (typeof sets)[number]) =>
    (set.categoryIds as string[] | undefined)?.includes(category) ?? false;
  const outside = sets.find((set) => !inCategory(set));
  if (outside && !dropOutsideCategory) {
    return {
      ok: false,
      error: `The set "${outside.name}" is not linked to this product's category.`,
    };
  }

  const data = sets
    .filter(inCategory)
    .sort((a, b) => (a.pieceCount ?? 0) - (b.pieceCount ?? 0))
    .map((set) => ({
      setId: set._id,
      price: prices.get(set._id.toString())!,
    }));
  return { ok: true, data };
}
