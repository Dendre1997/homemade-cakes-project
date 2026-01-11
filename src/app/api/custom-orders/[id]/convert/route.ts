import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminAuth } from "@/lib/firebase/adminApp";
import clientPromise from "@/lib/db";
import { ObjectId } from "mongodb";
import { OrderStatus } from "@/types";
import { v2 as cloudinary } from "cloudinary";
import { getPublicIdFromUrl } from "@/lib/cloudinaryUtils";

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // -- 1. Security Check --
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("session")?.value;
    if (!sessionCookie) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const decodedToken = await adminAuth
      .verifySessionCookie(sessionCookie, true)
      .catch(() => null);

    if (!decodedToken) {
      // Add stricter role check if claims allow
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Optional: Check DB user role if needed (adds latency but safer)
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);
    const user = await db
      .collection("users")
      .findOne({ firebaseUid: decodedToken.uid });
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const {
      agreedPrice,
      finalDescription,
      selectedImageUrls = [],
      selectedImage,
      sizeConfig, // { id?: string, text?: string }
      flavorConfig, // { id?: string, text?: string }
    } = body;

    // Normalize selected images
    // If selectedImageUrls is provided, use it.
    // If not, but selectedImage is provided, wrap it.
    let finalSelectedImages: string[] = Array.isArray(selectedImageUrls)
      ? selectedImageUrls
      : [];
    if (finalSelectedImages.length === 0 && selectedImage) {
      finalSelectedImages = [selectedImage];
    }

    if (!agreedPrice || agreedPrice <= 0) {
      return NextResponse.json(
        { error: "Agreed price is required" },
        { status: 400 }
      );
    }

    const customOrdersColl = db.collection("custom_orders");
    const ordersColl = db.collection("orders");

    //  Fetch Source Custom Order
    const customOrder = await customOrdersColl.findOne({
      _id: new ObjectId(id),
    });
    if (!customOrder) {
      return NextResponse.json(
        { error: "Custom Order not found" },
        { status: 404 }
      );
    }

    // Safety check - although we are deleting it at the end, concurrency might verify this
    if (customOrder.status === "converted") {
      return NextResponse.json(
        { error: "Order already converted" },
        { status: 400 }
      );
    }

    // Garbage Collection (The "Bridge" Logic)
    // Identify images present in the original Custom Order that are NOT in the final selection
    const rawImages: string[] = customOrder.referenceImageUrls || [];
    const keptImages = new Set(finalSelectedImages);

    const junkImages = rawImages.filter((url) => !keptImages.has(url));

    if (junkImages.length > 0) {
      console.log(
        `[GC] Found ${junkImages.length} junk images to delete for Custom Order ${id}`
      );

      // Fire and forget (or await if critical) - Awaiting is safer to ensure cleanup
      const deletePromises = junkImages.map(async (url) => {
        const publicId = getPublicIdFromUrl(url);
        if (publicId) {
          try {
            await cloudinary.uploader.destroy(publicId, { invalidate: true });
            console.log(`[GC] Deleted: ${publicId}`);
          } catch (err) {
            console.error(`[GC] Failed to delete ${publicId}:`, err);
          }
        }
      });

      await Promise.all(deletePromises);
    }

    // Prepare Item Object (The Hybrid Construction)
    const newOrderId = new ObjectId();

    // Determine Diameter vs Custom Size
    let diameterId: ObjectId | undefined = undefined;
    let customSize: string | undefined = undefined;
    let nameSuffix = "";

    if (sizeConfig?.id) {
      diameterId = new ObjectId(sizeConfig.id);
    } else if (sizeConfig?.text) {
      customSize = sizeConfig.text;
      nameSuffix = ` - ${customSize}`;
    }

    // Determine Flavor vs Custom Flavor
    let flavorIdStr: string | undefined = undefined;
    let customFlavor: string | undefined = undefined;

    if (flavorConfig?.id) {
      flavorIdStr = flavorConfig.id;
    } else if (flavorConfig?.text) {
      customFlavor = flavorConfig.text;
      nameSuffix += ` (${customFlavor})`;
    }

    // Pick the "Primary" image for the item thumbnail (first one)
    const primaryImage =
      finalSelectedImages.length > 0 ? finalSelectedImages[0] : "";

    const item = {
      id: `${newOrderId.toString()}-custom-1`,
      name: `Custom Cake${nameSuffix}`,
      productType: "custom",
      price: Number(agreedPrice),
      originalPrice: Number(agreedPrice),
      quantity: 1,
      imageUrl: primaryImage, // Thumbnail

      // Hybrid Fields
      diameterId,
      customSize,

      flavor: flavorIdStr || customFlavor,
      customFlavor,

      isManualPrice: true,
      isCustom: true,

      // Populate standard config structure for legacy compatibility
      selectedConfig:
        flavorIdStr || diameterId
          ? {
              cake: {
                flavorId: flavorIdStr || "",
                diameterId: diameterId?.toString() || "",
              },
            }
          : undefined,

      itemTotal: Number(agreedPrice),
      rowTotal: Number(agreedPrice),

      inscription: finalDescription || customOrder.description,
    };

    //  Create Real Order with Reference Images
    const newOrder: any = {
      _id: newOrderId,
      customerId: customOrder.customerId
        ? new ObjectId(customOrder.customerId)
        : undefined,
      items: [item],
      totalAmount: Number(agreedPrice),
      customerInfo: {
        name: customOrder.customerName,
        email: customOrder.customerEmail,
        phone: customOrder.customerPhone,
        notes: "Converted from Custom Request",
      },
      deliveryInfo: {
        method: "pickup", // Default
        deliveryDates: [
          {
            date: new Date(customOrder.eventDate),
            itemIds: [item.id],
            timeSlot: "TBD",
          },
        ],
      },
      status: OrderStatus.NEW,
      source: "admin-custom", // Updated Source
      referenceImages: finalSelectedImages,
      createdAt: new Date(),
      paymentDetails: {
        status: "unpaid",
      },
      discountInfo: {
        amount: 0,
      },
      isPaid: false,
    };

    //  Transaction
    // Insert Order
    await ordersColl.insertOne(newOrder);

    // Delete Original Custom Order (Cleanup)
    await customOrdersColl.deleteOne({ _id: new ObjectId(id) });

    return NextResponse.json({ success: true, newOrderId: newOrderId });
  } catch (error) {
    console.error("Convert Custom Order Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
