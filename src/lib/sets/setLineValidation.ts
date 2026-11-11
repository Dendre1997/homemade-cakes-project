import { Db, ObjectId } from "mongodb";
import type { CartItem } from "@/types";
import { usesCatalogSets, type SetPriceProduct } from "@/lib/sets/setLinePrice";

export interface SetLineProduct extends SetPriceProduct {
  name?: string;
  productType?: string;
  availableFlavorIds?: unknown[];
  comboConfig?: { hasCake?: boolean; cakeFlavorIds?: unknown[] } | null;
}

export interface SetLineSet {
  _id: unknown;
  name?: string;
  pieceCount?: number;
  maxFlavors?: number;
}

/**
 * Why a set line cannot be ordered, or null when it can. Only products with assigned
 * catalog sets are checked: the set must be assigned to the product, the treats need
 * one to set-flavor-limit flavors the product offers, and a combo cake needs one
 * offered flavor. Products with built-in boxes keep today's rules.
 */
export function setLineError(
  product: SetLineProduct,
  sets: SetLineSet[],
  item: Pick<CartItem, "selectedConfig">
): string | null {
  if (product.productType !== "set" || !usesCatalogSets(product)) return null;

  const productName = product.name || "this product";
  const setId = item.selectedConfig?.setId;
  const isAssigned =
    !!setId && product.availableSetConfigs!.some((c) => String(c.setId) === setId);
  const set = isAssigned ? sets.find((s) => String(s._id) === setId) : undefined;
  if (!set) {
    return `The set chosen for ${productName} is no longer offered. Please remove it from your cart and add it again.`;
  }

  const treats = Array.isArray(item.selectedConfig?.items) ? item.selectedConfig.items : [];
  const flavorIds = new Set(treats.map((treat) => String(treat?.flavorId)));
  if (flavorIds.size === 0) {
    return `Please choose at least one flavor for ${productName}.`;
  }
  const limit = set.maxFlavors ?? 1;
  if (flavorIds.size > limit) {
    return `${productName} (${set.name ?? "this set"}) allows up to ${limit} ${limit === 1 ? "flavor" : "flavors"}.`;
  }
  const offered = new Set((product.availableFlavorIds ?? []).map(String));
  if ([...flavorIds].some((id) => !offered.has(id))) {
    return `One of the flavors chosen for ${productName} is not offered.`;
  }

  if (product.comboConfig?.hasCake) {
    const cakeFlavorId = item.selectedConfig?.cake?.flavorId;
    const cakeFlavorIds = product.comboConfig.cakeFlavorIds?.length
      ? product.comboConfig.cakeFlavorIds.map(String)
      : [...offered];
    if (!cakeFlavorId || !cakeFlavorIds.includes(String(cakeFlavorId))) {
      return `Please choose a cake flavor offered for ${productName}.`;
    }
  }
  return null;
}

type SetLinesCheck = { ok: true; items: CartItem[] } | { ok: false; error: string };

/**
 * Refuses a cart with an invalid set line. Otherwise returns the items with each
 * catalog set line's name and piece count snapshot taken from the catalog; the name
 * also fills `quantityConfigId`, which order views still read as the box label.
 */
export async function checkSetLines(db: Db, items: CartItem[]): Promise<SetLinesCheck> {
  const productIds = [
    ...new Set(
      items
        .map((item) => item.productId)
        .filter((id): id is string => !!id && ObjectId.isValid(id))
    ),
  ];
  if (productIds.length === 0) return { ok: true, items };

  const products = await db
    .collection("products")
    .find(
      {
        _id: { $in: productIds.map((id) => new ObjectId(id)) },
        productType: "set",
        "availableSetConfigs.0": { $exists: true },
      },
      {
        projection: {
          name: 1,
          productType: 1,
          availableFlavorIds: 1,
          availableSetConfigs: 1,
          comboConfig: 1,
        },
      }
    )
    .toArray();
  if (products.length === 0) return { ok: true, items };

  const setIds = products.flatMap((product) =>
    (product.availableSetConfigs as { setId: ObjectId }[]).map((c) => c.setId)
  );
  const sets = (await db
    .collection("sets")
    .find({ _id: { $in: setIds } }, { projection: { name: 1, pieceCount: 1, maxFlavors: 1 } })
    .toArray()) as SetLineSet[];

  const productById = new Map(products.map((product) => [String(product._id), product]));
  const checked: CartItem[] = [];
  for (const item of items) {
    const product = item.productId ? productById.get(item.productId) : undefined;
    if (!product) {
      checked.push(item);
      continue;
    }
    const error = setLineError(product as SetLineProduct, sets, item);
    if (error) return { ok: false, error };
    const set = sets.find((s) => String(s._id) === item.selectedConfig?.setId)!;
    checked.push({
      ...item,
      selectedConfig: {
        ...item.selectedConfig,
        setName: set.name,
        pieceCount: set.pieceCount,
        quantityConfigId: set.name,
      },
    });
  }
  return { ok: true, items: checked };
}
