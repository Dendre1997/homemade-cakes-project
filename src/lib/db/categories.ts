import clientPromise from "@/lib/db";

/**
 * Fetches a category document by slug.
 * Returns the same BSON-serialized shape as GET /api/categories/slug/[slug].
 */
export async function getCategoryBySlug(slug: string) {
  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB_NAME);

  const category = await db.collection("categories").findOne({ slug });

  if (!category) {
    return null;
  }

  return JSON.parse(JSON.stringify(category));
}
