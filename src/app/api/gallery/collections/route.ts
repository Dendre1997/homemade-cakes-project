import { NextRequest, NextResponse } from "next/server";
import { getGalleryCollectionsWithCovers } from "@/lib/db/gallery";

/**
 * GET /api/gallery/collections?categoryId=<id>
 *
 * Public endpoint — no authentication required.
 * Returns collection cards for the gallery landing page, each with
 * the latest active image as cover. Includes a virtual "Other Custom Designs"
 * card when uncategorized images exist.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get("categoryId") ?? undefined;

    const collections = await getGalleryCollectionsWithCovers(categoryId);

    return NextResponse.json(collections);
  } catch (error) {
    console.error("Gallery Collections GET Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch gallery collections" },
      { status: 500 }
    );
  }
}
