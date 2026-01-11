import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import clientPromise from "@/lib/db";
import { Blog } from "@/types";
import { ObjectId } from "mongodb";
import cloudinary from "@/lib/cloudinary";
import { getPublicIdFromUrl } from "@/lib/cloudinaryUtils";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await request.json();
    const { title, slug, content, imageUrl, isActive, publishedAt } = data;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);

    // Check slug uniqueness if slug is being updated
    if (slug) {
      const existing = await db.collection("blogs").findOne({
        slug,
        _id: { $ne: new ObjectId(id) },
      });
      if (existing) {
        return NextResponse.json(
          { error: "Slug already exists. Please choose another one." },
          { status: 409 }
        );
      }
    }

    const updateDoc: Partial<Blog> = {
      updatedAt: new Date(),
      ...(title && { title }),
      ...(slug && { slug }),
      ...(content && { content }),
      ...(imageUrl !== undefined && { imageUrl }),
      ...(isActive !== undefined && { isActive }),
      ...(publishedAt && { publishedAt: new Date(publishedAt) }),
      ...(data.relatedProductIds && { relatedProductIds: data.relatedProductIds }),
    };

    const result = await db
      .collection("blogs")
      .updateOne({ _id: new ObjectId(id) }, { $set: updateDoc });

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Blog not found" }, { status: 404 });
    }

    revalidatePath("/", "page");

    return NextResponse.json({ message: "Blog updated successfully" });
  } catch (error) {
    console.error("Error updating blog:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);

    // Find the blog first to get the image URL
    const blog = await db
      .collection<Blog>("blogs")
      .findOne({ _id: new ObjectId(id) } as any);

    if (!blog) {
      return NextResponse.json({ error: "Blog not found" }, { status: 404 });
    }

    //  Delete image from Cloudinary if it exists
    if (blog.imageUrl) {
      const publicId = getPublicIdFromUrl(blog.imageUrl);
      if (publicId) {
        try {
          await cloudinary.uploader.destroy(publicId);
          console.log(`Deleted Cloudinary image: ${publicId}`);
        } catch (imgError) {
          console.error("Failed to delete Cloudinary image:", imgError);
          // Continue with blog deletion even if image delete fails
        }
      }
    }

    // Delete the blog from MongoDB
    const result = await db
      .collection("blogs")
      .deleteOne({ _id: new ObjectId(id) } as any);

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Blog not found" }, { status: 404 });
    }

    revalidatePath("/", "page");

    return NextResponse.json({ message: "Blog deleted successfully" });
  } catch (error) {
    console.error("Error deleting blog:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
