import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/db";
import { ObjectId } from "mongodb";

interface Context {
  params: { id: string };
}

export async function GET(_request: Request, { params }: Context) {
  try {
    const { id } = params;
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);

    const order = await db
      .collection("orders")
      .findOne({ _id: new ObjectId(id) });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    return NextResponse.json(order);
  } catch (error) {
    console.error("Error fetching order:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}


export async function PUT(request: NextRequest, { params }: Context) {
  try {
    const { id } = params;
    const { status } = await request.json(); // getting from request body just new status

    // Validation
    if (!status) {
      return NextResponse.json(
        { error: "Status is required" },
        { status: 400 }
      );
    }
    // TODO: Add more complex validation

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);
    const result = await db.collection("orders").updateOne(
      { _id: new ObjectId(id) },
      { $set: { status: status } } 
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    return NextResponse.json({ message: "Order status updated" });
  } catch (error) {
    console.error("Error updating order status:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
