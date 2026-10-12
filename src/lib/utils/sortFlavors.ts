import type { Flavor } from "@/types";

/**
 * Visual order only. Does not change flavor ids used for selection or submission.
 * Missing or empty displayOrder keeps the incoming array order.
 * Ids not listed in displayOrder are appended, sorted by name.
 */
export function sortFlavorsByDisplayOrder<T extends Pick<Flavor, "_id" | "name">>(
  flavors: T[],
  displayOrder?: string[],
): T[] {
  if (!displayOrder || displayOrder.length === 0) {
    return flavors;
  }

  const indexById = new Map(displayOrder.map((id, index) => [id, index]));
  const listed: T[] = [];
  const unlisted: T[] = [];

  for (const flavor of flavors) {
    if (indexById.has(String(flavor._id))) {
      listed.push(flavor);
    } else {
      unlisted.push(flavor);
    }
  }

  listed.sort(
    (a, b) =>
      (indexById.get(String(a._id)) ?? 0) - (indexById.get(String(b._id)) ?? 0),
  );
  unlisted.sort((a, b) => a.name.localeCompare(b.name));

  return [...listed, ...unlisted];
}
