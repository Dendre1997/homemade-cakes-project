import clientPromise from "@/lib/db";
import { ObjectId } from "mongodb";

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

  const productsWithStrings = products.map((product: Record<string, unknown>) => ({
    ...product,
    _id: (product._id as ObjectId).toString(),
    categoryId: (product.categoryId as ObjectId).toString(),
    collectionIds: ((product.collectionIds as ObjectId[]) || []).map((id) =>
      id.toString()
    ),
    seasonalEventIds: ((product.seasonalEventIds as ObjectId[]) || []).map((id) =>
      id.toString()
    ),
    availableFlavorIds: ((product.availableFlavorIds as ObjectId[]) || []).map(
      (id) => id.toString()
    ),
    allergenIds: ((product.allergenIds as ObjectId[]) || []).map((id) =>
      id.toString()
    ),
    availableDiameterConfigs: (
      (product.availableDiameterConfigs as Record<string, unknown>[]) || []
    ).map((config) => ({
      ...config,
      diameterId: (config.diameterId as ObjectId).toString(),
    })),
    category: {
      ...(product.category as Record<string, unknown>),
      _id: ((product.category as Record<string, unknown>)._id as ObjectId).toString(),
    },
  }));

  return { products: productsWithStrings, totalCount };
}
