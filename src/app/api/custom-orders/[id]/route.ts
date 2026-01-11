
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
