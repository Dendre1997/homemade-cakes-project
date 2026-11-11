import { findCategoryForCustomOrderItem } from "@/lib/customOrderCategory";
import type { ProductCategory } from "@/types";

type DesignLine = {
  categoryId?: string;
  category?: string;
  details?: { designNotes?: string };
  referenceImages?: string[];
};

type DesignCategory = {
  _id: unknown;
  name?: string;
  categoryType?: string;
};

function catalogCategoryType(
  value: string | undefined
): ProductCategory["categoryType"] | undefined {
  if (value === "single" || value === "set" || value === "combo") return value;
  return undefined;
}

/** Drop design the customer did not confirm after a line becomes a set. */
export function clearSetLineDesign(
  setValue: (name: any, value: any) => void,
  index: number
) {
  setValue(`items.${index}.details.flavorNote`, "");
  setValue(`items.${index}.details.designNotes`, "");
  setValue(`items.${index}.details.textOnCake`, "");
  setValue(`items.${index}.referenceImages`, []);
  setValue(`items.${index}.addons`, []);
}

/**
 * A set category may omit design notes and reference images.
 * Every other category, including a combo, still needs both.
 * An unknown category is treated as still needing them.
 */
export function nonSetLineMissingDesign(
  items: DesignLine[],
  categories: DesignCategory[]
): string | null {
  const known = categories.map((category) => ({
    _id: String(category._id),
    name: String(category.name ?? ""),
    categoryType: catalogCategoryType(category.categoryType),
  }));

  for (const item of items) {
    const category = findCategoryForCustomOrderItem(
      { categoryId: item.categoryId, category: item.category },
      known
    );
    if (category?.categoryType === "set") continue;

    const notes = String(item.details?.designNotes ?? "").trim();
    const images = Array.isArray(item.referenceImages) ? item.referenceImages : [];
    if (!notes || images.length < 1) {
      return "Please add a reference image and design notes for each cake.";
    }
  }

  return null;
}
