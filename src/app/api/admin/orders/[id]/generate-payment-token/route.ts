import { verifyAdminAPI } from "@/lib/auth/adminOnly";
import { NextResponse } from "next/server";
import clientPromise from "@/lib/db";
import { ObjectId } from "mongodb";
import { randomBytes } from "crypto";

interface Context {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/admin/orders/[id]/generate-payment-token
 * Lazy-generates a secure Payment Hub token for legacy orders that predate
 * the paymentToken field. Idempotent: returns the existing token if present.
 * Admin only.
 */
export async function POST(_request: Request, { params }: Context) {
  const auth = await verifyAdminAPI();
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { id } = await params;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid Order ID format" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);
    const ordersColl = db.collection("orders");

    const order = await ordersColl.findOne({ _id: new ObjectId(id) });
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Already has a token — return it unchanged (idempotent).
    if (order.paymentToken) {
      return NextResponse.json({
        success: true,
        paymentToken: order.paymentToken,
      });
    }

    const paymentToken = randomBytes(16).toString("hex");

    await ordersColl.updateOne(
      { _id: new ObjectId(id) },
      { $set: { paymentToken } }
    );

    return NextResponse.json({ success: true, paymentToken });
  } catch (error) {
    console.error("Error generating payment token:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { error: "Internal Server Error", details: errorMessage },
      { status: 500 }
    );
  }
}
