import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminAuth } from "@/lib/firebase/adminApp";
import clientPromise from "@/lib/db";
import { ObjectId } from "mongodb";
import { OrderStatus, User } from "@/types";
import { resend, DEFAULT_FROM } from "@/lib/email";
import OrderConfirmationEmail from "@/emails/OrderConfirmationEmail";
import { render } from "@react-email/render";
import { getAppSettings } from "@/lib/api/settings";



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
    const { agreedPrice, adminNotes, date, timeSlot, deliveryMethod, expectedMethod } = body;

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

    const resolvedExpectedMethod =
      expectedMethod ??
      customOrder.paymentPreference ??
      "e-transfer";

    // Validate expectedMethod — required for the manual payment flow
    if (!["cash", "e-transfer"].includes(resolvedExpectedMethod)) {
      return NextResponse.json(
        { error: "expectedMethod must be 'cash' or 'e-transfer'" },
        { status: 400 }
      );
    }

    if (!agreedPrice || agreedPrice <= 0) {
      return NextResponse.json(
        { error: "Agreed price is required" },
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

    // Resolve flavor name -> ObjectId
    const flavorName = customOrder.details?.flavor || "";
    let resolvedFlavorId = null;
    if (flavorName) {
      const flavorDoc = await db.collection("flavors").findOne({
        name: { $regex: new RegExp(`^${flavorName}$`, "i") }
      });
      if (flavorDoc) {
        resolvedFlavorId = new ObjectId(flavorDoc._id);
      }
    }

    // Resolve size name -> ObjectId
    const sizeName = customOrder.details?.size || "";
    let resolvedDiameterId = null;
    if (sizeName && resolvedCategoryId) {
      const diameterDoc = await db.collection("diameters").findOne({
        name: { $regex: new RegExp(`^${sizeName}$`, "i") },
        $or: [
          { categoryIds: resolvedCategoryId },
          { categoryIds: resolvedCategoryId.toString() }
        ]
      });
      if (diameterDoc) {
        resolvedDiameterId = new ObjectId(diameterDoc._id);
      }
    }

    const item = {
      id: `${newOrderId.toString()}-custom-1`,
      name: `Custom ${customOrder.category}`,
      productType: "custom",
      price: Number(agreedPrice),
      originalPrice: Number(agreedPrice),
      quantity: 1,
      imageUrl: primaryImage,
      customSize: sizeName, // Keep as string for receipts
      diameterId: resolvedDiameterId, // Assign ID for backend & analytics
      customFlavor: flavorName, // Keep as string for receipts
      flavorId: resolvedFlavorId, // Assign ID for backend & analytics
      isManualPrice: true,
      isCustom: true,
      itemTotal: Number(agreedPrice),
      rowTotal: Number(agreedPrice),
      inscription: customOrder.details?.textOnCake,
      designInstructions: customOrder.details?.designNotes,
      flavorNote: customOrder.details?.flavorNote,
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
      customerId: customOrder.userId ? new ObjectId(customOrder.userId) : null,
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
      isPaid: false,
      paymentDetails: {
        expectedMethod: resolvedExpectedMethod as 'cash' | 'e-transfer',
      },
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

    // Transaction: insert order, then update the custom order request status
    await ordersColl.insertOne(newOrder);
    await customOrdersColl.replaceOne(
      { _id: new ObjectId(id) },
      {
        _id: new ObjectId(id),
        userId: customOrder.userId,
        status: 'converted',
        convertedOrderId: newOrderId.toString(),
        category: customOrder.category,
        date: customOrder.date || customOrder.eventDate,
        contact: { 
          name: customOrder.contact?.name || customOrder.customerName, 
          email: customOrder.contact?.email || customOrder.customerEmail 
        },
        paymentPreference: customOrder.paymentPreference,
        agreedPrice: Number(agreedPrice),
        createdAt: customOrder.createdAt || customOrder.date || new Date(),
        updatedAt: new Date()
      }
    );

    // Trigger Order Confirmation Email if email is provided and not a placeholder
    if (
        newOrder.customerInfo?.email &&
        newOrder.customerInfo.email.trim() !== "" &&
        !newOrder.customerInfo.email.includes("@placeholder.com")
    ) {
        try {
            const finalOrder = {
                ...newOrder,
                _id: newOrderId.toString(),
                items: newOrder.items.map((item: any) => ({
                    ...item,
                    categoryId: item.categoryId?.toString(),
                }))
            };

            const flavors = await db.collection("flavors").find({}).toArray();
            const flavorMap = flavors.reduce((acc, flavor) => {
                acc[flavor._id.toString()] = flavor.name;
                return acc;
            }, {} as Record<string, string>);

            const diameters = await db.collection("diameters").find({}).toArray();
            const diameterMap = diameters.reduce((acc, d) => {
                acc[d._id.toString()] = d.name || d.sizeValue?.toString() + '"';
                return acc;
            }, {} as Record<string, string>);

            const settings = await getAppSettings();
            const pickupAddress = settings.checkout?.pickupAddress || "";
            const eTransferEmail = settings.eTransferEmail?.trim() || "";

            const htmlContent = await render(OrderConfirmationEmail({
              order: finalOrder as any,
              flavorMap,
              diameterMap,
              pickupAddress,
              eTransferEmail,
            } as any));

            await resend.emails.send({
                from: DEFAULT_FROM,
                to: newOrder.customerInfo.email,
                subject: `Your Order Confirmation #${newOrderId.toString().slice(-6).toUpperCase()}`,
                html: htmlContent,
            });
            console.log(`Confirmation email sent to ${newOrder.customerInfo.email} for converted order ${newOrderId}`);
        } catch (emailError) {
            console.error("Error sending confirmation email:", emailError);
        }
    }

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
