import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminAuth } from "@/lib/firebase/adminApp";
import clientPromise from "@/lib/db";
import { ObjectId } from "mongodb";
import { randomBytes } from "crypto";
import { OrderStatus, User } from "@/types";
import { resend, DEFAULT_FROM } from "@/lib/email";
import OrderConfirmationEmail from "@/emails/OrderConfirmationEmail";
import { render } from "@react-email/render";
import { getAppSettings } from "@/lib/api/settings";
import { normalizeCustomOrder } from "@/lib/normalizeCustomOrder";
import type { CustomOrderItem } from "@/types";

/**
 * Resolves a single custom item's free-text fields to catalog ObjectIds and
 * builds a production OrderItem. Category/flavor/size/shape are matched by name
 * (case-insensitive); unmatched values are preserved as custom* strings so the
 * receipt still reads correctly.
 */
async function buildOrderItemFromCustomItem(
  db: any,
  item: CustomOrderItem,
  newOrderId: ObjectId,
  index: number,
  price: number,
  designQuote?: number
) {
  // STRICT per-item image mapping: an OrderItem only ever receives the images
  // attached to THIS custom item. Never aggregate across the whole request.
  // `normalizeCustomOrder` guarantees legacy flat orders already have their
  // root images moved into items[0].referenceImages, so this is safe for both
  // old and new data.
  const referenceImages = Array.isArray(item.referenceImages)
    ? item.referenceImages
    : [];
  const primaryImage = referenceImages.length > 0 ? referenceImages[0] : "";

  // Resolve category name -> ObjectId. Prefer stored categoryId; fall back to legacy name matching.
  const categoryName = item.category || "";
  let categoryDoc = null;

  if (item.categoryId && ObjectId.isValid(String(item.categoryId))) {
    categoryDoc = await db.collection("categories").findOne({
      _id: new ObjectId(String(item.categoryId)),
    });
  }

  if (!categoryDoc && categoryName) {
    categoryDoc = await db.collection("categories").findOne({
      $or: [
        { name: categoryName },
        { name: categoryName + "s" },
        { name: categoryName + "S" },
      ],
    });
  }

  const resolvedCategoryId = categoryDoc ? new ObjectId(categoryDoc._id) : null;

  // Resolve flavor name -> ObjectId
  const flavorName = item.details?.flavor || "";
  let resolvedFlavorId: ObjectId | null = null;
  if (flavorName) {
    const flavorDoc = await db.collection("flavors").findOne({
      name: { $regex: new RegExp(`^${flavorName}$`, "i") },
    });
    if (flavorDoc) resolvedFlavorId = new ObjectId(flavorDoc._id);
  }

  // Resolve size name -> ObjectId (scoped to the resolved category)
  const sizeName = item.details?.size || "";
  let resolvedDiameterId: ObjectId | null = null;
  if (sizeName && resolvedCategoryId) {
    const diameterDoc = await db.collection("diameters").findOne({
      name: { $regex: new RegExp(`^${sizeName}$`, "i") },
      $or: [
        { categoryIds: resolvedCategoryId },
        { categoryIds: resolvedCategoryId.toString() },
      ],
    });
    if (diameterDoc) resolvedDiameterId = new ObjectId(diameterDoc._id);
  }

  // Resolve shape name -> ObjectId (fallback to free-text customShape)
  const shapeName = (item.details?.shape || "").trim();
  let resolvedShapeId: ObjectId | null = null;
  if (shapeName) {
    const shapeDoc = await db.collection("shapes").findOne({
      name: { $regex: new RegExp(`^${shapeName}$`, "i") },
    });
    if (shapeDoc) resolvedShapeId = new ObjectId(shapeDoc._id);
  }

  return {
    id: `${newOrderId.toString()}-custom-${index + 1}`,
    name: `Custom ${categoryDoc?.name ?? item.category}`,
    productType: "custom",
    price,
    originalPrice: price,
    quantity: 1,
    imageUrl: primaryImage,
    imageUrls: referenceImages,
    customSize: sizeName, // Keep as string for receipts
    diameterId: resolvedDiameterId, // Assign ID for backend & analytics
    customShape: !resolvedShapeId ? (shapeName || undefined) : undefined,
    shapeId: resolvedShapeId,
    customFlavor: flavorName, // Keep as string for receipts
    flavorId: resolvedFlavorId,
    tiers: item.details?.tiers,
    isManualPrice: true,
    isCustom: true,
    itemTotal: price,
    rowTotal: price,
    inscription: item.details?.textOnCake,
    designInstructions: item.details?.designNotes,
    flavorNote: item.details?.flavorNote,
    categoryId: resolvedCategoryId,
    addons: item.addons || [],
    designQuote:
      designQuote != null && !Number.isNaN(designQuote) && designQuote > 0
        ? designQuote
        : undefined,
  };
}

/**
 * POST /api/admin/custom-orders/[id]/convert
 * Converts a (multi-item) custom order request into a production order.
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

    // Fetch Source Custom Order & normalize to guarantee items[]
    const rawCustomOrder = await customOrdersColl.findOne({ _id: new ObjectId(id) });
    if (!rawCustomOrder) {
      return NextResponse.json(
        { error: "Custom Order not found" },
        { status: 404 }
      );
    }

    const customOrder = normalizeCustomOrder(rawCustomOrder);

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

    const items = customOrder.items || [];
    if (items.length === 0) {
      return NextResponse.json(
        { error: "Custom Order has no items" },
        { status: 400 }
      );
    }

    // ── Resolve a per-item agreed price ──────────────────────────────────────
    // Priority: body.items[i].agreedPrice / body.agreedPrices[i]  →  stored
    // item.agreedPrice  →  single body.agreedPrice (only when there is one item).
    const bodyItemPrices: Record<number, number> = {};
    const bodyItemDesignQuotes: Record<number, number> = {};
    if (Array.isArray(body.items)) {
      body.items.forEach((bi: any, idx: number) => {
        const p = Number(bi?.agreedPrice);
        if (!Number.isNaN(p)) bodyItemPrices[idx] = p;
        const dq = Number(bi?.designQuote);
        if (!Number.isNaN(dq) && dq >= 0) bodyItemDesignQuotes[idx] = dq;
      });
    } else if (Array.isArray(body.agreedPrices)) {
      body.agreedPrices.forEach((raw: any, idx: number) => {
        const p = Number(raw);
        if (!Number.isNaN(p)) bodyItemPrices[idx] = p;
      });
    }

    const perItemPrices = items.map((it, idx) => {
      const fromBody = bodyItemPrices[idx];
      const fromStored = typeof it.agreedPrice === "number" ? it.agreedPrice : undefined;
      const fromSingle =
        items.length === 1 && agreedPrice != null ? Number(agreedPrice) : undefined;
      return Number(fromBody ?? fromStored ?? fromSingle ?? 0);
    });

    const perItemDesignQuotes = items.map((it, idx) => {
      const fromBody = bodyItemDesignQuotes[idx];
      const fromStored =
        typeof it.designQuote === "number" ? it.designQuote : undefined;
      const resolved = fromBody ?? fromStored;
      return resolved != null && !Number.isNaN(resolved) && resolved >= 0
        ? resolved
        : undefined;
    });

    const totalAmount = perItemPrices.reduce((sum, p) => sum + (p || 0), 0);

    if (!totalAmount || totalAmount <= 0) {
      return NextResponse.json(
        { error: "Agreed price is required for at least one item" },
        { status: 400 }
      );
    }

    const newOrderId = new ObjectId();

    // Secure token for the public Payment Hub link (/pay/[orderId]?token=)
    const paymentToken = randomBytes(16).toString("hex");

    // Build one production OrderItem per custom item
    const orderItems = await Promise.all(
      items.map((it, idx) =>
        buildOrderItemFromCustomItem(
          db,
          it,
          newOrderId,
          idx,
          perItemPrices[idx],
          perItemDesignQuotes[idx]
        )
      )
    );

    const allItemIds = orderItems.map((oi) => oi.id);
    const combinedReferenceImages = items.flatMap((it) => it.referenceImages || []);

    // Create Real Order
    const allergyNote =
      customOrder.allergies && customOrder.allergies !== "No"
        ? `⚠️ ALLERGIES: ${customOrder.allergies}`
        : null;

    const contact = customOrder.contact || ({} as any);
    const legalName = (contact.name as string | undefined)?.trim?.() || "";
    const socialNick = (contact.socialNickname as string | undefined)?.trim?.() || "";
    const socialPlat = contact.socialPlatform as "instagram" | "facebook" | undefined;

    const newOrder: any = {
      _id: newOrderId,
      customerId: customOrder.userId ? new ObjectId(customOrder.userId) : null,
      items: orderItems,
      totalAmount,
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
            itemIds: allItemIds,
            timeSlot: (timeSlot ?? customOrder.timeSlot) || "12:00 PM",
          },
        ],
      },
      status: OrderStatus.AWAITING_PAYMENT,
      source: "admin-custom",
      referenceImages: combinedReferenceImages,
      createdAt: new Date(),
      isPaid: false,
      paymentToken,
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

    // Persist items back onto the custom order with their agreed prices retained
    const persistedItems = items.map((it, idx) => ({
      ...it,
      agreedPrice: perItemPrices[idx],
      ...(perItemDesignQuotes[idx] != null
        ? { designQuote: perItemDesignQuotes[idx] }
        : {}),
    }));

    // Transaction: insert order, then update the custom order request status
    await ordersColl.insertOne(newOrder);
    await customOrdersColl.replaceOne(
      { _id: new ObjectId(id) },
      {
        ...customOrder,
        _id: new ObjectId(id),
        status: "converted",
        convertedOrderId: newOrderId.toString(),
        items: persistedItems,
        agreedPriceTotal: totalAmount,
        updatedAt: new Date(),
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
                    diameterId: item.diameterId?.toString(),
                    shapeId: item.shapeId?.toString(),
                    flavorId: item.flavorId?.toString(),
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

            const shapes = await db.collection("shapes").find({}).toArray();
            const shapeMap = shapes.reduce((acc, s) => {
                acc[s._id.toString()] = s.name;
                return acc;
            }, {} as Record<string, string>);

            const settings = await getAppSettings();
            const pickupAddress = settings.checkout?.pickupAddress || "";
            const eTransferEmail = settings.eTransferEmail?.trim() || "";

            const htmlContent = await render(OrderConfirmationEmail({
              order: finalOrder as any,
              flavorMap,
              diameterMap,
              shapeMap,
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
      paymentToken,
    });
  } catch (error) {
    console.error("Convert Custom Order Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
