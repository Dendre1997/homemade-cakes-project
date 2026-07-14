import { NextRequest, NextResponse } from "next/server";
import { getGalleryCollection } from "@/lib/db";
import { getGalleryImagesByCollection } from "@/lib/db/gallery";
import { ObjectId } from "mongodb";

/**
 * GET /api/gallery?categoryId=<id>&collectionId=<id-or-slug>
 *
 * Public endpoint — no authentication required.
 * Returns active gallery_images filtered by category and/or collection,
 * sorted newest-first. collectionId accepts ObjectId, catalog slug, or
 * the virtual "other-custom-designs" slug.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get("categoryId");
    const collectionId = searchParams.get("collectionId");

    if (collectionId) {
      let images = await getGalleryImagesByCollection(collectionId);

      if (categoryId) {
        images = images.filter((image) =>
          image.categories?.some(
            (category) =>
              category === categoryId ||
              category === new ObjectId(categoryId).toString()
          )
        );
      }

      return NextResponse.json(images);
    }

    const collection = await getGalleryCollection();
    const query: Record<string, unknown> = { isActive: true };

    if (categoryId) {
      query.categories = { $in: [categoryId, new ObjectId(categoryId)] };
    }

    const images = await collection
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json(images);
  } catch (error) {
    console.error("Public Gallery GET Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch gallery images" },
      { status: 500 }
    );
  }
}
