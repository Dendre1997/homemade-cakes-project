import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import clientPromise from "@/lib/db";
import { ObjectId } from "mongodb";
import cloudinary from "@/lib/cloudinary";
import { getPublicIdFromUrl } from "@/lib/cloudinaryUtils";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { title, imageUrl, subtitle, link, buttonText } = body;

    if (!title)
      return NextResponse.json({ error: "Title is required" }, { status: 400 });

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);
    const collection = db.collection("hero_slides");

    const existingSlide = await collection.findOne({ _id: new ObjectId(id) });
    if (!existingSlide)
      return NextResponse.json({ error: "Slide not found" }, { status: 404 });

    const oldImageUrl = existingSlide.imageUrl;
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

    await collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { title, subtitle, link, buttonText, imageUrl: finalImageUrl } }
    );

    revalidatePath("/", "page");

    return NextResponse.json({ message: "Slide updated successfully" });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);
    const collection = db.collection("hero_slides");

    const existingSlide = await collection.findOne({ _id: new ObjectId(id) });
    if (!existingSlide)
      return NextResponse.json({ error: "Not found" }, { status: 404 });

    await collection.deleteOne({ _id: new ObjectId(id) });

    if (existingSlide.imageUrl) {
      const publicId = getPublicIdFromUrl(existingSlide.imageUrl);
      if (publicId) cloudinary.uploader.destroy(publicId, { invalidate: true });
    }

    revalidatePath("/", "page");

    return NextResponse.json({ message: "Slide deleted" });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
