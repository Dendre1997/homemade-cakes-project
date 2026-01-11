import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import clientPromise from "@/lib/db";
import { ObjectId } from "mongodb";
import { getPublicIdFromUrl } from "@/lib/cloudinaryUtils";
import cloudinary from "@/lib/cloudinary";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);
    const category = await db
      .collection("categories")
      .findOne({ _id: new ObjectId(id) });
    if (!category) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 }
      );
    }
    return NextResponse.json(category);
  } catch (error) {
    console.error("Error fetching category:", error);
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
    const { name, manufacturingTimeInMinutes, imageUrl } = await request.json();

    if (!name)
      return NextResponse.json({ error: "Name is required" }, { status: 400 });

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);
    const collection = db.collection("categories");

    const existingCategory = await collection.findOne({
      _id: new ObjectId(id),
    });
    if (!existingCategory)
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 }
      );

    const oldImageUrl = existingCategory.imageUrl;
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
          manufacturingTimeInMinutes: Number(manufacturingTimeInMinutes) || 0,
          imageUrl: finalImageUrl,
        },
      }
    );

    revalidatePath("/", "page");
    return NextResponse.json({ message: "Category updated" });
  } catch (error) {
    console.error("Error updating category:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
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
    const collection = db.collection("categories");

    const existingCategory = await collection.findOne({
      _id: new ObjectId(id),
    });
    if (!existingCategory)
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 }
      );

    await collection.deleteOne({ _id: new ObjectId(id) });

    if (existingCategory.imageUrl) {
      const publicId = getPublicIdFromUrl(existingCategory.imageUrl);
      if (publicId) cloudinary.uploader.destroy(publicId, { invalidate: true });
    }

    revalidatePath("/", "page");
    return NextResponse.json({ message: "Category deleted" });
  } catch (error) {
    console.error("Error deleting category:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
