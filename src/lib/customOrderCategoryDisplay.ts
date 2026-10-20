export const CANDY_BAR_GROUP_LABEL = "Candy bar";

type CategoryLike = {
  _id: string;
  name: string;
  categoryType?: string;
  imageUrl?: string;
};

export function partitionCustomOrderCategories<T extends CategoryLike>(categories: T[]) {
  const visible = categories.filter((c) => c.categoryType !== "combo");
  const setCategories = visible.filter((c) => c.categoryType === "set");
  const rootCategories = visible.filter((c) => c.categoryType !== "set");
  return { rootCategories, setCategories };
}

/** Up to four image URLs for a 2×2 collage (stable order by name). */
export function collageImageUrlsFromSets<T extends CategoryLike>(
  setCategories: T[],
  limit = 4
): string[] {
  return [...setCategories]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((c) => c.imageUrl?.trim())
    .filter((url): url is string => Boolean(url))
    .slice(0, limit);
}
