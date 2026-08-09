import type { ProductCategory } from "@/types";

/** Legacy client displayName: strip one trailing "s" from the DB category name. */
export function legacyCategoryDisplayName(name: string): string {
  if (!name) return "";
  return name.endsWith("s") || name.endsWith("S")
    ? name.slice(0, -1)
    : name;
}

/** Find a catalog category by stored custom-order item fields (id first, then legacy string). */
export function findCategoryForCustomOrderItem<
  T extends Pick<ProductCategory, "_id" | "name"> & Partial<Pick<ProductCategory, "categoryType">>
>(
  item: { categoryId?: string; category?: string },
  categories: T[]
): T | null {
  if (!categories.length) return null;

  const storedId = item.categoryId?.trim();
  if (storedId) {
    const byId = categories.find((c) => String(c._id) === String(storedId));
    if (byId) return byId;
  }

  const storedName = item.category?.trim();
  if (!storedName) return null;

  return (
    categories.find((c) => {
      const displayName = legacyCategoryDisplayName(c.name);
      return (
        c.name === storedName ||
        displayName === storedName ||
        c.name === storedName + "s" ||
        c.name === storedName + "S"
      );
    }) ?? null
  );
}

export function resolveCustomOrderItemCategoryId(
  item: { categoryId?: string; category?: string },
  categories: Pick<ProductCategory, "_id" | "name">[]
): string | null {
  const match = findCategoryForCustomOrderItem(item, categories);
  return match ? String(match._id) : null;
}

export function resolveCustomOrderItemCategoryName(
  item: { categoryId?: string; category?: string },
  categories: Pick<ProductCategory, "_id" | "name">[]
): string {
  const match = findCategoryForCustomOrderItem(item, categories);
  return match?.name ?? item.category?.trim() ?? "";
}

/** Pick a primary category label for order-level UI (multi-item safe). */
export function summarizeCustomOrderCategories(
  items: { categoryId?: string; category?: string }[],
  categories: Pick<ProductCategory, "_id" | "name">[] = []
): string {
  const labels = Array.from(
    new Set(
      items
        .map((item) => resolveCustomOrderItemCategoryName(item, categories))
        .filter(Boolean)
    )
  );
  return labels.join(", ");
}
