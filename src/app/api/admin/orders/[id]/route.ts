import { verifyAdminAPI } from "@/lib/auth/adminOnly";
import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/db";
import { ObjectId } from "mongodb";
import { OrderStatus, CartItem } from "@/types";

interface Context {
  params: Promise<{ id: string }>;
}
interface DeliveryDateUpdate {
  date: string | Date; 
  itemIds: string[];
}

interface CustomerInfoUpdate {
  name?: string;
  email?: string;
  phone?: string;
  socialNickname?: string;
  socialPlatform?: "instagram" | "facebook" | "";
}

interface UpdateBody {
  status?: OrderStatus;
  deliveryDates?: DeliveryDateUpdate[];
  items?: CartItem[];
  totalAmount?: number;
  customerInfo?: CustomerInfoUpdate;
  source?: string;
}

export async function GET(_request: Request, { params }: Context) {
  const auth = await verifyAdminAPI();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const { id } = await params;
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
  const auth = await verifyAdminAPI();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const { id } = await params;
    const body: UpdateBody = await request.json();

    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid Order ID format" },
        { status: 400 }
      );
    }
    const { status, deliveryDates, items, totalAmount, customerInfo, source } = body;

    if (!status && !deliveryDates && !items && typeof totalAmount === "undefined" && !customerInfo && source === undefined) {
      return NextResponse.json(
        { error: "At least one field is required for update" },
        { status: 400 }
      );
    }
    if (status && !Object.values(OrderStatus).includes(status)) {
      return NextResponse.json(
        { error: "Invalid status value provided" },
        { status: 400 }
      );
    }
    if (deliveryDates) {
      if (!Array.isArray(deliveryDates)) {
        return NextResponse.json(
          { error: "deliveryDates must be an array" },
          { status: 400 }
        );
      }
      const isValidStructure = deliveryDates.every(
        (d) => d && typeof d.date !== "undefined" && Array.isArray(d.itemIds)
      );
      if (!isValidStructure) {
        return NextResponse.json(
          { error: "Invalid structure within deliveryDates array" },
          { status: 400 }
        );
      }
    }

    const updateFields: { $set: Partial<any> } = { $set: {} };

    if (status) {
      updateFields.$set.status = status;
    }

    if (deliveryDates) {
      const deliveryDatesForDb = deliveryDates.map((d) => ({
        ...d,
        date: new Date(d.date),
      }));
      updateFields.$set["deliveryInfo.deliveryDates"] = deliveryDatesForDb;
    }

    if (items) {
      // Cast all reference IDs to ObjectId to ensure consistent storage
      const itemsForDb = items.map((item: any) => ({
        ...item,
        productId: item.productId ? new ObjectId(String(item.productId)) : undefined,
        categoryId: item.categoryId ? new ObjectId(String(item.categoryId)) : undefined,
        diameterId: item.diameterId ? new ObjectId(String(item.diameterId)) : undefined,
      }));
      updateFields.$set.items = itemsForDb;
    }

    if (typeof totalAmount === "number") {
      updateFields.$set.totalAmount = totalAmount;
    }

    if (customerInfo) {
      // Use dot-notation keys so we only touch the fields the admin edited
      const allowed: (keyof CustomerInfoUpdate)[] = ["name", "email", "phone", "socialNickname", "socialPlatform"];
      for (const key of allowed) {
        if (key in customerInfo) {
          const val = customerInfo[key];
          // Allow empty string to clear optional social fields; skip undefined
          if (val !== undefined) {
            // Store empty socialPlatform as unset (remove field)
            updateFields.$set[`customerInfo.${key}`] = val === "" ? undefined : val;
          }
        }
      }
    }

    if (source !== undefined) {
      updateFields.$set.source = source || null;
    }

    // --- Perform Update ---
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);
    const result = await db.collection("orders").updateOne(
      { _id: new ObjectId(id) },
      updateFields
    );

    // --- Handle Result ---
    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    if (result.modifiedCount === 0 && result.matchedCount === 1) {
      return NextResponse.json({
        message: "Order found, but no changes applied",
      });
    }

    return NextResponse.json({ message: "Order updated successfully" });
  } catch (error) {
    console.error("Error updating order:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { error: "Internal Server Error", details: errorMessage },
      { status: 500 }
    );
  }
}
