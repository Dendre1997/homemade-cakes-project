import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminAuth } from "@/lib/firebase/adminApp";
import clientPromise, { getGalleryCollection } from "@/lib/db";
import { User, IGalleryImage } from "@/types";

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

export async function GET(request: NextRequest) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const collection = await getGalleryCollection();
    const images = await collection.find({}).sort({ createdAt: -1 }).toArray();
    
    return NextResponse.json(images);
  } catch (error) {
    console.error("Gallery GET Error:", error);
    return NextResponse.json({ error: "Failed to fetch gallery images" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { imageUrl, title, description, categories, decorationPrice, isActive } = body;

    // Basic validation
    if (!imageUrl || !title) {
      return NextResponse.json({ error: "Image URL and Title are required" }, { status: 400 });
    }

    const collection = await getGalleryCollection();
    
    const newImage: Omit<IGalleryImage, "_id"> = {
      imageUrl,
      title,
      description: description || "",
      categories: categories || [],
      decorationPrice: decorationPrice !== undefined ? Number(decorationPrice) : undefined,
      isActive: isActive !== undefined ? !!isActive : true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await collection.insertOne(newImage as any);

    return NextResponse.json({ success: true, insertedId: result.insertedId }, { status: 201 });
  } catch (error) {
    console.error("Gallery POST Error:", error);
    return NextResponse.json({ error: "Failed to create gallery image" }, { status: 500 });
  }
}
