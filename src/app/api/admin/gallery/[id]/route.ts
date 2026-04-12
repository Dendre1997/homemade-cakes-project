import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminAuth } from "@/lib/firebase/adminApp";
import clientPromise, { getGalleryCollection } from "@/lib/db";
import { User } from "@/types";
import { ObjectId } from "mongodb";
import cloudinary from "@/lib/cloudinary";
import { getPublicIdFromUrl } from "@/lib/cloudinaryUtils";

/**
 * Checks if the request is from an authenticated admin.
 */
async function isAdmin() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("session")?.value;

  if (!sessionCookie) return false;

  try {
    const decodedToken = await adminAuth.verifySessionCookie(sessionCookie, true);
    
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);
    const user = await db.collection<User>("users").findOne({ firebaseUid: decodedToken.uid });
    
    return user?.role === "admin";
  } catch (error) {
    console.error("Auth verification failed:", error);
    return false;
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid ID format" }, { status: 400 });
    }

    const collection = await getGalleryCollection();
    
    // Build update object dynamically (only update fields that are provided)
    const updateData: any = { updatedAt: new Date() };
    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.imageUrl !== undefined) updateData.imageUrl = body.imageUrl;
    if (body.categories !== undefined) updateData.categories = body.categories;
    if (body.decorationPrice !== undefined) updateData.decorationPrice = Number(body.decorationPrice);
    if (body.isActive !== undefined) updateData.isActive = !!body.isActive;

    const result = await collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Gallery PATCH Error:", error);
    return NextResponse.json({ error: "Failed to update gallery image" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid ID format" }, { status: 400 });
    }

    const collection = await getGalleryCollection();
    
    // 1. Fetch current record to get Cloudinary URL
    const imageToDelete = await collection.findOne({ _id: new ObjectId(id) });
    if (!imageToDelete) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }

    // 2. Attempt Cloudinary Deletion
    const publicId = getPublicIdFromUrl(imageToDelete.imageUrl);
    if (publicId) {
      try {
        await cloudinary.uploader.destroy(publicId, { 
            invalidate: true, 
            resource_type: 'image' 
        });
      } catch (cloudinaryErr) {
        // Log but don't block DB deletion
        console.error("Cloudinary deletion failed for gallery image:", publicId, cloudinaryErr);
      }
    }

    // 3. Delete from MongoDB
    const result = await collection.deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Image not found during deletion" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Gallery image and cloud asset deleted successfully" });
  } catch (error) {
    console.error("Gallery DELETE Error:", error);
    return NextResponse.json({ error: "Failed to delete gallery image" }, { status: 500 });
  }
}
