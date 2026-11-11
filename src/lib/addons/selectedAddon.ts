import { ObjectId, type Db } from "mongodb";
import type { Addon, SelectedAddon } from "@/types";
import { normalizeSelectedAddons } from "@/lib/addons/selectedAddonMath";

export async function normalizeCartItemAddons<T extends { addons?: SelectedAddon[] }>(
  db: Db,
  items: T[]
): Promise<T[]> {
  const objectIds: ObjectId[] = [];
  for (const item of items) {
    for (const addon of item.addons ?? []) {
      if (ObjectId.isValid(addon.addonId)) objectIds.push(new ObjectId(addon.addonId));
    }
  }

  const catalogById = new Map<string, Addon>();
  if (objectIds.length > 0) {
    const docs = await db
      .collection<Addon>("addons")
      .find({ _id: { $in: objectIds } as any })
      .toArray();
    for (const doc of docs) catalogById.set(String(doc._id), doc);
  }

  return items.map((item) => ({
    ...item,
    addons: item.addons ? normalizeSelectedAddons(catalogById, item.addons) : item.addons,
  }));
}
