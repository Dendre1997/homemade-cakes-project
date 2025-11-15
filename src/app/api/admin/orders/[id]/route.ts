import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/db";
import { ObjectId } from "mongodb";
import { OrderStatus } from "@/types";

interface Context {
  params: { id: string };
}
interface DeliveryDateUpdate {
  date: string | Date; 
  itemIds: string[];
}

interface UpdateBody {
  status?: OrderStatus;
  deliveryDates?: DeliveryDateUpdate[];
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
    const body: UpdateBody = await request.json();
    const { status, deliveryDates } = body;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid Order ID format" },
        { status: 400 }
      );
    }
    if (!status && !deliveryDates) {
      return NextResponse.json(
        { error: "At least status or deliveryDates is required for update" },
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

    const updateFields: { $set: Partial<any> } = { $set: {} }; // Initialize $set

    if (status) {
      updateFields.$set.status = status;
    }

    if (deliveryDates) {
      const deliveryDatesForDb = deliveryDates.map((d) => ({
        ...d,
        date: new Date(d.date), // Convert to BSON Date
      }));
      updateFields.$set["deliveryInfo.deliveryDates"] = deliveryDatesForDb;
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
    console.error("Error updating order:", error); // Log the specific error
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { error: "Internal Server Error", details: errorMessage },
      { status: 500 }
    );
  }
}
