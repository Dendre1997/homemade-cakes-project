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
    const { name, price, imageUrl, categoryIds, type } = await request.json();

    if (!name || typeof price !== "number" || !type) {
      return NextResponse.json(
        { error: "Name, a valid price, and type are required" },
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
          price,
          imageUrl: finalImageUrl,
          categoryIds: categoryIds || [],
          type,
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

    const result = await collection.deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: "Decoration not found" },
        { status: 404 }
      );
    }

    if (existingDecoration.imageUrl) {
      const publicId = getPublicIdFromUrl(existingDecoration.imageUrl);
      if (publicId) {
        cloudinary.uploader.destroy(publicId, { invalidate: true });
      }
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
