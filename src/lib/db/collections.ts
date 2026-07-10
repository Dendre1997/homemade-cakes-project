import clientPromise from "@/lib/db";
import { Collection } from "@/types";

/**
 * Fetches a collection document by slug.
 * Returns the same BSON-serialized shape as GET /api/collections/slug/[slug].
 */
export async function getCollectionBySlug(slug: string) {
  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB_NAME);

  const collection = await db.collection("collections").findOne({ slug });

  if (!collection) {
    return null;
  }

  return JSON.parse(JSON.stringify(collection));
}

/**
 * Fetches collections that have at least one active product.
 * Returns the same shape as GET /api/collections.
 */
export async function getCollections(): Promise<Collection[]> {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);

    const collections = await db
      .collection("collections")
      .find({})
      .sort({ name: 1 })
      .toArray();

    const activeProducts = await db
      .collection("products")
      .find({ isActive: true }, { projection: { collectionIds: 1 } })
      .toArray();

    const activeCollectionIds = new Set<string>();
    activeProducts.forEach((p) => {
      if (Array.isArray(p.collectionIds)) {
        p.collectionIds.forEach((id: { toString: () => string }) =>
          activeCollectionIds.add(id.toString())
        );
      }
    });

    const filteredCollections = collections.filter((col) =>
      activeCollectionIds.has(col._id.toString())
    );

    return filteredCollections.map((col) => ({
      ...col,
      _id: col._id.toString(),
    })) as Collection[];
  } catch (error) {
    console.error("Error fetching collections:", error);
    return [];
  }
}
