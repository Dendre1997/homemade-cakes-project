import clientPromise from "@/lib/db";

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
