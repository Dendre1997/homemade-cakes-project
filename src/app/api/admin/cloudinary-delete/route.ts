import { NextRequest, NextResponse } from "next/server";
import cloudinary from "@/lib/cloudinary";
import { getPublicIdFromUrl } from "@/lib/cloudinaryUtils";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { urls, public_id } = body;

    if (public_id) {
        console.log("Deleting via provided public_id:", public_id);
        
        const result = await cloudinary.uploader.destroy(public_id, { 
            invalidate: true, 
            resource_type: 'image' 
        });
        console.log("Cloudinary Destroy Result:", result);

        if (result.result !== 'ok') {
            return NextResponse.json(
                { error: 'Cloudinary deletion failed', details: result }, 
                { status: 500 }
            );
        }

        return NextResponse.json(result, { status: 200 });
    }

    // Fallback: URLs list (Server-side extraction)
    if (!urls || urls.length === 0) {
      return NextResponse.json(
        { message: "No URLs or public_id provided" },
        { status: 200 }
      );
    }

    const publicIds = urls
      .map(getPublicIdFromUrl)
      .filter((id: string | null) => id !== null) as string[];

    if (publicIds.length > 0) {
      await cloudinary.api.delete_resources(publicIds, { invalidate: true });
    }

    return NextResponse.json(
      { message: "Orphaned images cleaned up" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting orphaned images:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
