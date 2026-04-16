import { NextRequest, NextResponse } from "next/server";
import { getGalleryCollection } from "@/lib/db";
import { ObjectId } from "mongodb";

/**
 * GET /api/gallery/[id]
 *
 * Public endpoint — no authentication required.
 * Returns a single active gallery image by its ID.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 1. Validate ID format
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid gallery image ID format" },
        { status: 400 }
      );
    }

    const collection = await getGalleryCollection();

    // 2. Fetch the image
    // Note: We strictly filter for isActive: true to ensure clients
    // only see live content.
    const image = await collection.findOne({
      _id: new ObjectId(id),
      isActive: true,
    });

    // 3. Handle non-existent or inactive image
    if (!image) {
      return NextResponse.json(
        { error: "Gallery image not found or is currently inactive" },
        { status: 404 }
      );
    }

    return NextResponse.json(image);
  } catch (error) {
    console.error("Single Gallery Image fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error while fetching gallery image" },
      { status: 500 }
    );
  }
}
