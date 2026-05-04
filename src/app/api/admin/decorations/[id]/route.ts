import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/db";
import { ObjectId } from "mongodb";
import cloudinary from "@/lib/cloudinary"; 
import { getPublicIdFromUrl } from "@/lib/cloudinaryUtils";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);

    const decoration = await db.collection("decorations").findOne({
      _id: new ObjectId(id),
    });

    if (!decoration) {
      return NextResponse.json(
        { error: "Decoration not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(decoration, { status: 200 });
  } catch (error) {
    console.error("Error fetching decorations:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { name, description, imageUrl, categoryIds, isActive, variants } = await request.json();

    if (!name || !variants || variants.length === 0) {
      return NextResponse.json(
        { error: "Name and at least one variant are required" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);
    const collection = db.collection("decorations");
    const existingDecoration = await collection.findOne({
      _id: new ObjectId(id),
    });
    if (!existingDecoration) {
      return NextResponse.json(
        { error: "Decoration not found" },
        { status: 404 }
      );
    }

    const oldImageUrl = existingDecoration.imageUrl;
    let finalImageUrl = oldImageUrl;
    if (imageUrl === "") {
      if (oldImageUrl) {
        const publicId = getPublicIdFromUrl(oldImageUrl);
        if (publicId)
          cloudinary.uploader.destroy(publicId, { invalidate: true });
      }
      finalImageUrl = "";
    } else if (imageUrl && imageUrl !== oldImageUrl) {
      if (oldImageUrl) {
        const publicId = getPublicIdFromUrl(oldImageUrl);
        if (publicId)
          cloudinary.uploader.destroy(publicId, { invalidate: true });
      }
      finalImageUrl = imageUrl;
    }

    const result = await collection.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          name,
          description: description || "",
          imageUrl: finalImageUrl,
          categoryIds: categoryIds || [],
          isActive: isActive !== undefined ? isActive : true,
          variants,
        },
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: "Decoration not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: "Decoration updated successfully" },
      { status: 200 }
    );
  } catch (err) {
    console.error("Error updating decoration:", err);
    return NextResponse.json(
      { error: "Internal Server Error", details: (err as Error).message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);
    const collection = db.collection("decorations");

    const existingDecoration = await collection.findOne({
      _id: new ObjectId(id),
    });
    if (!existingDecoration) {
      return NextResponse.json(
        { error: "Decoration not found" },
        { status: 404 }
      );
    }

    // 1. Gather all image URLs
    const imageUrlsToClean = [existingDecoration.imageUrl];
    if (existingDecoration.variants && Array.isArray(existingDecoration.variants)) {
      existingDecoration.variants.forEach((v: any) => {
        if (v.imageUrl) {
          imageUrlsToClean.push(v.imageUrl);
        }
      });
    }

    // Filter out falsy URLs
    const validUrls = imageUrlsToClean.filter(Boolean);

    // 2. Extract public IDs and trigger Cloudinary deletions
    const publicIds = validUrls
      .map(url => getPublicIdFromUrl(url))
      .filter(Boolean) as string[];

    if (publicIds.length > 0) {
      await Promise.allSettled(
        publicIds.map(publicId => cloudinary.uploader.destroy(publicId, { invalidate: true }))
      );
    }

    // 3. Delete from database
    const result = await collection.deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: "Decoration not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: "Decoration deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting decoration:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
