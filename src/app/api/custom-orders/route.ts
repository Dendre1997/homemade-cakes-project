import { NextResponse } from "next/server";
import clientPromise from "@/lib/db";
import { customOrderRequestSchema } from "@/lib/validation/customOrderSchema";
import { normalizeCustomOrders } from "@/lib/normalizeCustomOrder";
import { normalizePhoneDigits } from "@/lib/crm/normalize";
import { normalizeCartItemAddons } from "@/lib/addons/selectedAddon";
import { calculateCustomOrderTotal } from "@/lib/pricing/customOrderPricing";
import { applyCustomOrderCatalogSets } from "@/lib/sets/customOrderSets";
import { nonSetLineMissingDesign } from "@/lib/sets/customOrderDesign";

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

    return NextResponse.json(normalizeCustomOrders(customOrders), { status: 200 });
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

    // 1. Zod Validation — multi-item schema. The preprocess step also accepts
    //    legacy flat single-item payloads and folds them into items[].
    const validation = customOrderRequestSchema.safeParse({
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

    const catalogCategories = await db
      .collection("categories")
      .find({}, { projection: { name: 1, categoryType: 1 } })
      .toArray();
    const designError = nonSetLineMissingDesign(data.items, catalogCategories);
    if (designError) {
      return NextResponse.json({ error: designError }, { status: 400 });
    }

    const catalogItems = await normalizeCartItemAddons(db, data.items);
    const withSets = await applyCustomOrderCatalogSets(db, catalogItems);
    if (!withSets.ok) {
      return NextResponse.json({ error: withSets.error }, { status: 400 });
    }
    const items = withSets.items.map((item) => {
      if (!item.priceBreakdown) return item;
      const priceBreakdown = calculateCustomOrderTotal({
        cakeSizePrice: item.priceBreakdown.baseCakePrice,
        flavorPrice: item.priceBreakdown.flavorUpcharge,
        addons: item.addons ?? [],
      });
      return {
        ...item,
        priceBreakdown,
        approximatePrice: priceBreakdown.grandTotal,
      };
    });
    const approximatePriceTotal = items.reduce(
      (sum, item) => sum + (Number(item.approximatePrice) || 0),
      0
    );

    // 2. Idempotency — rely purely on the strict client-generated key. (The old
    //    fuzzy match keyed on flat details.flavor/size no longer applies to the
    //    multi-item structure.)
    if (data.idempotencyKey) {
      const existingStrict = await collection.findOne({ idempotencyKey: data.idempotencyKey });
      if (existingStrict) {
        return NextResponse.json(
          { success: true, orderId: existingStrict._id.toString(), note: "idempotent_strict" },
          { status: 200 }
        );
      }
    }

    // 3. Database Insertion — persist the multi-item payload as-is.
    const orderData = {
        ...data,
        items,
        approximatePriceTotal,
        contact: {
          ...data.contact,
          phoneDigits: normalizePhoneDigits(data.contact.phone),
        },
        status: data.status || 'pending_review'
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
