import clientPromise from "@/lib/db";
import { withMongoRetry } from "@/lib/db/withMongoRetry";
import { ObjectId } from "mongodb";

function toIdString(id: unknown): string {
  if (typeof id === "string") return id;
  if (id && typeof (id as { toString?: () => string }).toString === "function") {
    return (id as { toString: () => string }).toString();
  }
  return "";
}

function toIsoString(value: unknown): string | undefined {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return value;
  return undefined;
}

export interface GetProductsParams {
  categoryId?: string;
  collectionId?: string;
  seasonalEventId?: string;
  search?: string;
  page?: number;
  limit?: number;
  context?: string;
}

/**
 * Fetches products with category lookup and pagination.
 * Returns the same shape as GET /api/products.
 */
export async function getProducts({
  categoryId,
  collectionId,
  seasonalEventId,
  search,
  page = 1,
  limit = 100,
  context,
}: GetProductsParams) {
  return withMongoRetry(async () => {
  const skip = (page - 1) * limit;

  const matchFilter: Record<string, unknown> = {};

  if (categoryId) {
    matchFilter.categoryId = new ObjectId(categoryId);
  }
  if (collectionId) {
    matchFilter.collectionIds = new ObjectId(collectionId);
  }
  if (seasonalEventId) {
    matchFilter.seasonalEventIds = new ObjectId(seasonalEventId);
  }

  if (context !== "admin") {
    matchFilter.isActive = true;
  }

  if (search) {
    matchFilter.$or = [
      { name: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } },
    ];
  }

  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB_NAME);

  const result = await db
    .collection("products")
    .aggregate([
      {
        $match: matchFilter,
      },
      {
        $lookup: {
          from: "categories",
          localField: "categoryId",
          foreignField: "_id",
          as: "category",
        },
      },
      {
        $unwind: "$category",
      },
      ...(search
        ? [
            {
              $match: {
                $or: [
                  { name: { $regex: search, $options: "i" } },
                  { "category.name": { $regex: search, $options: "i" } },
                ],
              },
            },
          ]
        : []),
      {
        $facet: {
          metadata: [{ $count: "totalCount" }],
          data: [
            { $sort: { createdAt: -1, _id: -1 } },
            { $skip: skip },
            { $limit: limit },
          ],
        },
      },
    ])
    .toArray();

  const products = result[0]?.data || [];
  const totalCount = result[0]?.metadata[0]?.totalCount || 0;

  const productsWithStrings = products.map((product: Record<string, unknown>) => {
    const combo = product.comboConfig as
      | {
          cakeFlavorIds?: unknown[];
          cakeDiameterIds?: unknown[];
        }
      | null
      | undefined;

    const formatted = {
      ...product,
      _id: toIdString(product._id),
      categoryId: toIdString(product.categoryId),
      collectionIds: ((product.collectionIds as unknown[]) || []).map(toIdString),
      seasonalEventIds: ((product.seasonalEventIds as unknown[]) || []).map(
        toIdString
      ),
      availableFlavorIds: ((product.availableFlavorIds as unknown[]) || []).map(
        toIdString
      ),
      allergenIds: ((product.allergenIds as unknown[]) || []).map(toIdString),
      availableDiameterConfigs: (
        (product.availableDiameterConfigs as Record<string, unknown>[]) || []
      ).map((config) => ({
        ...config,
        diameterId: toIdString(config.diameterId),
      })),
      defaultAddons: Array.isArray(product.defaultAddons)
        ? (product.defaultAddons as Record<string, unknown>[]).map((addon) => ({
            ...addon,
            addonId: toIdString(addon.addonId),
            variantId: addon.variantId ? toIdString(addon.variantId) : "",
          }))
        : product.defaultAddons,
      comboConfig: combo
        ? {
            ...combo,
            cakeFlavorIds: (combo.cakeFlavorIds || []).map(toIdString),
            cakeDiameterIds: (combo.cakeDiameterIds || []).map(toIdString),
          }
        : combo,
      category: {
        ...(product.category as Record<string, unknown>),
        _id: toIdString((product.category as Record<string, unknown>)._id),
      },
      createdAt: toIsoString(product.createdAt),
      updatedAt: toIsoString(product.updatedAt),
    };

    // Drops any leftover BSON values (ObjectId.toJSON is a hex string).
    return JSON.parse(JSON.stringify(formatted));
  });

  return { products: productsWithStrings, totalCount };
  });
}
