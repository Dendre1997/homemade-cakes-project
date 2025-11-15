import { NextRequest, NextResponse } from "next/server";
import cloudinary from "@/lib/cloudinary";
import { getPublicIdFromUrl } from "@/lib/cloudinaryUtils";

export async function POST(request: NextRequest) {
  try {
    const { urls }: { urls: string[] } = await request.json();
    if (!urls || urls.length === 0) {
      return NextResponse.json(
        { message: "No URLs provided" },
        { status: 200 }
      );
    }

    const publicIds = urls
      .map(getPublicIdFromUrl)
      .filter((id) => id !== null) as string[];

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
