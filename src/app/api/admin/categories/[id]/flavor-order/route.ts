import { verifyAdminAPI } from "@/lib/auth/adminOnly";
import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/db";
import { ObjectId } from "mongodb";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await verifyAdminAPI();
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid category id" }, { status: 400 });
    }

    const body = await request.json();
    const flavorDisplayOrder = body?.flavorDisplayOrder;

    if (
      !Array.isArray(flavorDisplayOrder) ||
      flavorDisplayOrder.some((entry) => typeof entry !== "string")
    ) {
      return NextResponse.json(
        { error: "flavorDisplayOrder must be a string array" },
        { status: 400 },
      );
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);
    const result = await db.collection("categories").updateOne(
      { _id: new ObjectId(id) },
      { $set: { flavorDisplayOrder } },
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating flavor display order:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
