
import { NextResponse } from "next/server";
import clientPromise from "@/lib/db";
import { customOrderSchema } from "@/lib/validation/customOrderSchema";

// GET: Fetch all custom orders (List View)
export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);

    const orders = await db
      .collection("custom_orders")
      .find({})
      .sort({ eventDate: 1 }) // Ascending: Upcoming events first
      .toArray();

    return NextResponse.json(orders);
  } catch (error) {
    console.error("Fetch Custom Orders Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // 1. Zod Validation
    const validation = customOrderSchema.safeParse({
      ...body,
      createdAt: new Date(), // Ensure server set timestamp
      eventDate: body.eventDate ? new Date(body.eventDate) : undefined
    });

    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.format() },
        { status: 400 }
      );
    }

    const { data } = validation;

    // 2. Database Insertion
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);
    const orderData = {
        ...data,
        status: data.status || 'new'
    };
    
    const result = await db.collection("custom_orders").insertOne(orderData);

    return NextResponse.json(
      { success: true, orderId: result.insertedId },
      { status: 201 }
    );
  } catch (error) {
    console.error("Custom Order Creation Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
