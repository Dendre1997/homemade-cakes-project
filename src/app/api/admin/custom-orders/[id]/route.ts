import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminAuth } from "@/lib/firebase/adminApp";
import clientPromise from "@/lib/db";
import { ObjectId } from "mongodb";
import { User } from "@/types";

/**
 * Shared admin auth helper for this route segment.
 */
async function getAdminDb() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("session")?.value;

  if (!sessionCookie) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const decodedToken = await adminAuth
    .verifySessionCookie(sessionCookie, true)
    .catch(() => null);

  if (!decodedToken) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB_NAME);

  const user = await db.collection<User>("users").findOne({ firebaseUid: decodedToken.uid });
  if (!user || user.role !== "admin") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { db };
}

/**
 * GET /api/admin/custom-orders/[id]
 * Fetches a single custom order by ID. Admin only.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAdminDb();
    if (auth.error) return auth.error;
    const { db } = auth;

    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const order = await db
      .collection("custom_orders")
      .findOne({ _id: new ObjectId(id) });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    return NextResponse.json(order);
  } catch (error) {
    console.error("Admin Custom Order GET Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

/**
 * PUT /api/admin/custom-orders/[id]
 * Updates a custom order (admin draft save). Admin only.
 */
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAdminDb();
    if (auth.error) return auth.error;
    const { db } = auth;

    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const body = await req.json();

    // Filter out _id to avoid MongoDB immutable field error
    const { _id, ...updateData } = body;

    const result = await db.collection("custom_orders").updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          ...updateData,
          updatedAt: new Date(),
        },
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin Custom Order PUT Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/custom-orders/[id]
 * Deletes a custom order and purges user-uploaded Cloudinary images.
 * Gallery and product catalog images are always protected. Admin only.
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAdminDb();
    if (auth.error) return auth.error;
    const { db } = auth;

    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    // 1. Fetch order to collect image URLs before deletion
    const order = await db
      .collection("custom_orders")
      .findOne({ _id: new ObjectId(id) });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // 2. Delete from MongoDB first
    const deleteResult = await db
      .collection("custom_orders")
      .deleteOne({ _id: new ObjectId(id) });

    if (deleteResult.deletedCount === 0) {
      return NextResponse.json(
        { error: "Failed to delete order from database" },
        { status: 500 }
      );
    }

    // 3. Collect all candidate image URLs from the order document
    let allUrls: string[] = [];
    if (order.referenceImageUrls && Array.isArray(order.referenceImageUrls)) {
      allUrls = [...order.referenceImageUrls];
    }
    if (order.referenceImages && Array.isArray(order.referenceImages)) {
      allUrls = [...allUrls, ...order.referenceImages];
    }
    if (order.adminSelectedImage && !allUrls.includes(order.adminSelectedImage)) {
      allUrls.push(order.adminSelectedImage);
    }

    // 4. Clean up Cloudinary — only delete user-uploaded images, never catalog/gallery assets
    if (allUrls.length > 0) {
      try {
        const { default: cloudinary } = await import("@/lib/cloudinary");
        const { getPublicIdFromUrl } = await import("@/lib/cloudinaryUtils");

        // Build a protected set of public_ids from products AND all gallery images.
        // We compare at public_id level so URL variants (transforms, versions) are
        // still correctly matched and protected.
        const protectedProducts = await db.collection("products").find({
          imageUrls: { $in: allUrls },
        }).toArray();

        // All gallery images are protected regardless of isActive status
        const galleryImages = await db
          .collection("gallery_images")
          .find({})
          .project({ imageUrl: 1 })
          .toArray();

        const protectedPublicIds = new Set<string>();

        protectedProducts.forEach((p) => {
          if (p.imageUrls && Array.isArray(p.imageUrls)) {
            p.imageUrls.forEach((u: string) => {
              const pid = getPublicIdFromUrl(u);
              if (pid) protectedPublicIds.add(pid);
            });
          }
        });

        galleryImages.forEach((g) => {
          const pid = getPublicIdFromUrl(g.imageUrl);
          if (pid) protectedPublicIds.add(pid);
        });

        // Only delete URLs whose public_id is NOT in the protected set
        const publicIdsToDelete = allUrls
          .map((url) => getPublicIdFromUrl(url))
          .filter((pid): pid is string => pid !== null && !protectedPublicIds.has(pid));

        const uniqueIds = Array.from(new Set(publicIdsToDelete));

        if (uniqueIds.length > 0) {
          await cloudinary.api.delete_resources(uniqueIds, { invalidate: true });
          console.log(`Deleted user-uploaded Cloudinary images: ${uniqueIds.join(", ")}`);
        } else {
          console.log("No Cloudinary images deleted: all references are protected catalog/gallery assets.");
        }
      } catch (cloudErr) {
        console.error("Cloudinary cleanup failed (DB already clean):", cloudErr);
        // Do not fail the response — DB deletion already succeeded.
      }
    }

    return NextResponse.json({ success: true, message: "Order canceled successfully." });
  } catch (error) {
    console.error("Admin Custom Order DELETE Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
