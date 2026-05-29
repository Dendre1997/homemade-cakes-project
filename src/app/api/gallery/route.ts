import { NextRequest, NextResponse } from "next/server";
import { getGalleryCollection } from "@/lib/db";
import { ObjectId } from "mongodb";

/**
 * GET /api/gallery?categoryId=<id>
 *
 * Public endpoint — no authentication required.
 * Returns active gallery_images filtered by category and sorted newest-first.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get("categoryId");
    const collectionId = searchParams.get("collectionId");

    const collection = await getGalleryCollection();

    const query: Record<string, unknown> = { isActive: true };

    if (categoryId) {
      // categories is stored as an array of ObjectId strings.
      // Support both raw string and ObjectId formats for robustness.
      query.categories = { $in: [categoryId, new ObjectId(categoryId)] };
    }
    
    if (collectionId) {
      query.collectionIds = { $in: [collectionId, new ObjectId(collectionId)] };
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
