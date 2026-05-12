import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminAuth } from "@/lib/firebase/adminApp";
import clientPromise from "@/lib/db";
import { ObjectId } from "mongodb";
import { OrderStatus, User } from "@/types";

/**
 * POST /api/admin/custom-orders/[id]/convert
 * Converts a custom order request into a production order.
 * Admin only.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // -- 1. Security Check --
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("admin_session")?.value;
    if (!sessionCookie) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const decodedToken = await adminAuth
      .verifySessionCookie(sessionCookie, true)
      .catch(() => null);

    if (!decodedToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);
    const user = await db
      .collection<User>("users")
      .findOne({ firebaseUid: decodedToken.uid });
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const { agreedPrice, adminNotes, date, timeSlot, deliveryMethod } = body;

    if (!agreedPrice || agreedPrice <= 0) {
      return NextResponse.json(
        { error: "Agreed price is required" },
        { status: 400 }
      );
    }

    const customOrdersColl = db.collection("custom_orders");
    const ordersColl = db.collection("orders");

    // Fetch Source Custom Order
    const customOrder = await customOrdersColl.findOne({
      _id: new ObjectId(id),
    });
    if (!customOrder) {
      return NextResponse.json(
        { error: "Custom Order not found" },
        { status: 404 }
      );
    }

    if (customOrder.status === "converted") {
      return NextResponse.json(
        { error: "Order already converted" },
        { status: 400 }
      );
    }

    const newOrderId = new ObjectId();

    // Generate a mocked Payment Link
    const paymentLink = `https://mock-payment-gateway.com/checkout/${newOrderId.toString()}`;

    // Prepare Item Object
    const primaryImage =
      customOrder.referenceImages?.length > 0 ? customOrder.referenceImages[0] : "";

    // Resolve category name -> ObjectId
    // The customOrder.category may have trailing 's' stripped (e.g. "Cake" instead of "Cakes")
    const categoryName = customOrder.category || "";
    const categoryDoc = await db.collection("categories").findOne({
      $or: [
        { name: categoryName },
        { name: categoryName + "s" },
        { name: categoryName + "S" },
      ],
    });
    const resolvedCategoryId = categoryDoc ? new ObjectId(categoryDoc._id) : null;

    const item = {
      id: `${newOrderId.toString()}-custom-1`,
      name: `Custom ${customOrder.category}`,
      productType: "custom",
      price: Number(agreedPrice),
      originalPrice: Number(agreedPrice),
      quantity: 1,
      imageUrl: primaryImage,
      customSize: customOrder.details?.size,
      customFlavor: customOrder.details?.flavor,
      isManualPrice: true,
      isCustom: true,
      itemTotal: Number(agreedPrice),
      rowTotal: Number(agreedPrice),
      inscription: customOrder.details?.textOnCake,
      designInstructions: customOrder.details?.designNotes,
      categoryId: resolvedCategoryId,
      addons: customOrder.addons || [],
    };

    // Create Real Order
    const allergyNote =
      customOrder.allergies && customOrder.allergies !== "No"
        ? `⚠️ ALLERGIES: ${customOrder.allergies}`
        : null;

    const contact = customOrder.contact || {};
    const legalName = (contact.name as string | undefined)?.trim?.() || "";
    const socialNick = (contact.socialNickname as string | undefined)?.trim?.() || "";
    const socialPlat = contact.socialPlatform as "instagram" | "facebook" | undefined;

    const newOrder: any = {
      _id: newOrderId,
      items: [item],
      totalAmount: Number(agreedPrice),
      customerInfo: {
        // Keep display name separate from social handle so ops data is not lost
        name: legalName || "Customer",
        email: contact.email || "",
        phone: contact.phone || "",
        socialNickname: socialNick || undefined,
        socialPlatform: socialPlat,
        notes: ["Converted from Custom Request", allergyNote]
          .filter(Boolean)
          .join(" | "),
      },
      deliveryInfo: {
        method: (deliveryMethod ?? customOrder.deliveryMethod) || "pickup",
        deliveryDates: [
          {
            // Prefer the date sent from the UI (admin may have changed it)
            // Fall back to the stored DB value if not provided
            date: new Date(date ?? customOrder.date),
            itemIds: [item.id],
            timeSlot: (timeSlot ?? customOrder.timeSlot) || "12:00 PM",
          },
        ],
      },
      status: OrderStatus.AWAITING_PAYMENT,
      source: "admin-custom",
      referenceImages: customOrder.referenceImages || [],
      createdAt: new Date(),
      paymentDetails: {
        status: "unpaid",
      },
      isPaid: false,
      notesLog: adminNotes
        ? [
            {
              id: new ObjectId().toString(),
              content: adminNotes,
              createdAt: new Date(),
              author: "Admin",
            },
          ]
        : [],
    };

    // Transaction: insert order, then delete the custom order request
    await ordersColl.insertOne(newOrder);
    await customOrdersColl.deleteOne({ _id: new ObjectId(id) });

    return NextResponse.json({
      success: true,
      newOrderId: newOrderId.toString(),
      paymentLink,
    });
  } catch (error) {
    console.error("Convert Custom Order Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
