
import { NextResponse } from "next/server";
import clientPromise from "@/lib/db";
import { ObjectId } from "mongodb";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);

    const order = await db
      .collection("custom_orders")
      .findOne({ _id: new ObjectId(id) });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    return NextResponse.json(order);
  } catch (error) {
    console.error("Fetch Custom Order Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// PUT: Save Draft (Admin Updates)
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);

    // Fields allowed to update during negotiation
    const updateFields = {
      agreedPrice: body.agreedPrice,
      adminSelectedImage: body.adminSelectedImage,
      adminNotes: body.adminNotes,
      finalDescription: body.finalDescription,
      finalFlavor: body.finalFlavor,
      finalSize: body.finalSize,
      status: body.status || 'negotiating', // Optional status update
      referenceImageUrls: body.referenceImageUrls, // Allow updating images
      updatedAt: new Date()
    };

    // Filter out undefined values to avoid overwriting with null
    const cleanUpdate = Object.fromEntries(
        Object.entries(updateFields).filter(([_, v]) => v !== undefined)
    );

    const result = await db.collection("custom_orders").updateOne(
      { _id: new ObjectId(id) },
      { $set: cleanUpdate }
    );

    if (result.matchedCount === 0) {
        return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Update Custom Order Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// DELETE: Cancel Order
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);

    // 1. Fetch order to get image URLs
    const order = await db
      .collection("custom_orders")
      .findOne({ _id: new ObjectId(id) });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // 2. Delete the order from MongoDB
    const deleteResult = await db
      .collection("custom_orders")
      .deleteOne({ _id: new ObjectId(id) });

    if (deleteResult.deletedCount === 0) {
      return NextResponse.json(
        { error: "Failed to delete order from database" },
        { status: 500 }
      );
    }

    // 3. Clean up Cloudinary images if DB deletion was successful
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

    if (allUrls.length > 0) {
      try {
        // dynamic import of cloudinary tools
        const { default: cloudinary } = await import("@/lib/cloudinary");
        const { getPublicIdFromUrl } = await import("@/lib/cloudinaryUtils");

        const publicIds = allUrls
          .map(getPublicIdFromUrl)
          .filter((pid: string | null) => pid !== null) as string[];

        // Extract uniqueness
        const uniqueIds = Array.from(new Set(publicIds));

        if (uniqueIds.length > 0) {
          await cloudinary.api.delete_resources(uniqueIds, { invalidate: true });
          console.log(`Deleted Cloudinary images: ${uniqueIds.join(", ")}`);
        }
      } catch (cloudErr) {
        console.error("Failed to cleanly delete Cloudinary images for deleted order", cloudErr);
        // We do not fail the request if image deletion fails, because DB is already clean.
      }
    }

    return NextResponse.json({ success: true, message: "Order canceled successfully." });
  } catch (error) {
    console.error("Delete Custom Order Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
