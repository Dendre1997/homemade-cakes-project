import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/db";
import { Order, OrderItem } from "@/types";
import { ObjectId } from "mongodb";

export async function POST(request: NextRequest) {
  try {
    const { customerInfo, deliveryInfo, items, totalAmount }: Partial<Order> =
      await request.json();

    if (
      !customerInfo ||
      !deliveryInfo ||
      !items ||
      items.length === 0 ||
      !totalAmount
    ) {
      return NextResponse.json(
        { error: "Missing required order information." },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);

    const newOrder: Omit<Order, "_id"> = {
      customerInfo,
      deliveryInfo,
      items: items.map((item) => ({
        ...item,
        productId: new ObjectId(item.productId),
        diameterId: new ObjectId(item.diameterId),
      })),
      totalAmount,
      status: "new",
      createdAt: new Date(),
    };

    const result = await db.collection("orders").insertOne(newOrder);

    return NextResponse.json(
      { message: "Order created successfully", orderId: result.insertedId },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating order:", error);
    return NextResponse.json(
      { error: "An error occurred while creating the order." },
      { status: 500 }
    );
  }
}
