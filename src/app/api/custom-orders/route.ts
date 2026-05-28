import { NextResponse } from "next/server";
import clientPromise from "@/lib/db";
import { customOrderSchema } from "@/lib/validation/customOrderSchema";
import { ObjectId } from "mongodb";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);
    
    // Using string matching for userId since it might be stored as a string or ObjectId depending on auth integration
    const customOrders = await db.collection("custom_orders")
      .find({ userId })
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json(customOrders, { status: 200 });
  } catch (error) {
    console.error("Fetch Custom Orders Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

/**
 * POST /api/custom-orders
 * Public endpoint — clients submit new custom order requests via the wizard.
 * Admin management (list/update/delete) is handled by /api/admin/custom-orders.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();

    // 1. Zod Validation
    const validation = customOrderSchema.safeParse({
      ...body,
      createdAt: new Date(), // Ensure server set timestamp
      date: body.date ? new Date(body.date) : undefined
    });

    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.format() },
        { status: 400 }
      );
    }

    const { data } = validation;

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);
    const collection = db.collection("custom_orders");

    // 2. Primary Idempotency Check (Strict Match)
    if (data.idempotencyKey) {
      const existingStrict = await collection.findOne({ idempotencyKey: data.idempotencyKey });
      if (existingStrict) {
        return NextResponse.json(
          { success: true, orderId: existingStrict._id.toString(), note: "idempotent_strict" },
          { status: 200 }
        );
      }
    }

    // 3. Secondary Idempotency Check (Fuzzy Match - last 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const existingFuzzy = await collection.findOne({
      "contact.email": data.contact.email,
      category: data.category,
      "details.flavor": data.details.flavor,
      "details.size": data.details.size,
      createdAt: { $gte: fiveMinutesAgo }
    });

    if (existingFuzzy) {
      return NextResponse.json(
        { success: true, orderId: existingFuzzy._id.toString(), note: "idempotent_fuzzy" },
        { status: 200 }
      );
    }

    // 4. Database Insertion
    const orderData = {
        ...data,
        status: data.status || 'new'
    };
    
    const result = await collection.insertOne(orderData);

    return NextResponse.json(
      { success: true, orderId: result.insertedId.toString() },
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
