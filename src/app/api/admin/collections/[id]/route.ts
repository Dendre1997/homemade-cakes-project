import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import clientPromise from "@/lib/db";
import { Collection } from "@/types";
import { ObjectId } from "mongodb";
import cloudinary  from "@/lib/cloudinary";
import { getPublicIdFromUrl } from "@/lib/cloudinaryUtils";
import { slugify } from "@/lib/utils";
interface Context {
  params: Promise<{ id: string }>;
}



export async function PUT(request: NextRequest, { params }: Context) {
  try {
    const { id } = await params;
    const { name, description, imageUrl }: Partial<Collection> =
      await request.json();

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    const slug = slugify(name)

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);
    const collection = db.collection("collections");

    const existingCollection = await collection.findOne({
      _id: new ObjectId(id),
    });

    if (!existingCollection) {
      return NextResponse.json(
        { error: "Collection not found" },
        { status: 404 }
      );
    }

    const oldImageUrl = existingCollection.imageUrl;

    if (imageUrl && imageUrl !== oldImageUrl && oldImageUrl) {
      const publicId = getPublicIdFromUrl(oldImageUrl);
      if (publicId) {
        console.log(`Deleting old image from Cloudinary: ${publicId}`);
        cloudinary.uploader
          .destroy(publicId, { invalidate: true })
          .catch((err) =>
            console.error("Cloudinary background deletion failed:", err)
          );
      }
    }

    const result = await collection.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          name,
          description: description || "",
          imageUrl: imageUrl || oldImageUrl || "",
          slug: slug,
        },
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: "Collection not found" },
        { status: 404 }
      );
    }
    
    revalidatePath("/", "page");

    return NextResponse.json({ message: "Collection updated successfully" });
  } catch (error) {
    console.error("Error updating collection:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  try {
    const { id } = await params;
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);
    const collection = db.collection("collections");

    const existingCollection = await collection.findOne({
      _id: new ObjectId(id),
    });
    if (!existingCollection) {
      return NextResponse.json(
        { error: "Collection not found" },
        { status: 404 }
      );
    }

    const result = await collection.deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: "Collection not found" },
        { status: 404 }
      );
    }

    if (existingCollection.imageUrl) {
      const publicId = getPublicIdFromUrl(existingCollection.imageUrl);
      if (publicId) {
        console.log(`Deleting image for deleted collection: ${publicId}`);
        cloudinary.uploader
          .destroy(publicId, { invalidate: true })
          .catch((err) =>
            console.error("Cloudinary background deletion failed:", err)
          );
      }
    }

    revalidatePath("/", "page");

    return NextResponse.json({ message: "Collection deleted successfully" });
  } catch (error) {
    console.error("Error deleting collection:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
