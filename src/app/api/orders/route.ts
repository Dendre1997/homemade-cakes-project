import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminAuth } from "@/lib/firebase/adminApp";
import clientPromise from "@/lib/db";
import { Order } from "@/types";
import { ObjectId } from "mongodb";

export async function POST(request: NextRequest) {
  try {
    const { customerInfo, deliveryInfo, items, totalAmount }: Partial<Order> =
      await request.json();

    if (!customerInfo || !items || items.length === 0) {
      return NextResponse.json(
        { error: "Missing required information." },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);

    const sessionCookie = cookies().get("session")?.value;
    let customerId: ObjectId | undefined = undefined;

    if (sessionCookie) {
      const decodedToken = await adminAuth
        .verifySessionCookie(sessionCookie, true)
        .catch(() => null);
      if (decodedToken) {
        const user = await db
          .collection("users")
          .findOne({ firebaseUid: decodedToken.uid });
        if (user) {
          customerId = user._id;
        }
      }
    }
    // ===================

    const newOrder: Omit<Order, "_id"> = {
      customerId,
      customerInfo,
      deliveryInfo: deliveryInfo ?? { method: "pickup", deliveryDate: new Date() },
      items: items.map((item) => ({
        ...item,
        productId: new ObjectId(item.productId),
        diameterId: new ObjectId(item.diameterId),
      })),
      totalAmount: totalAmount || 0,
      status: "new",
      createdAt: new Date(),
    };

    const result = await db.collection("orders").insertOne(newOrder);

    return NextResponse.json(
      { message: "Order created", orderId: result.insertedId },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating order:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);

    const orders = await db
      .collection("orders")
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json(orders);
  } catch (error) {
    console.error("Error fetching orders:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
