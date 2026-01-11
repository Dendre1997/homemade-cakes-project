import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/db";
import { ObjectId } from "mongodb";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const {
      name,
      code,
      type,
      value,
      trigger,
      targetType,
      targetIds,
      startDate,
      endDate,
      isActive,
      minOrderValue,
      usageLimit,
    } = body;

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);
    const collection = db.collection("discounts");

    if (code) {
      const existingWithCode = await collection.findOne({
        code: { $regex: new RegExp(`^${code}$`, "i") },
        _id: { $ne: new ObjectId(id) },
      });
      if (existingWithCode) {
        return NextResponse.json(
          { error: "Discount code already exists" },
          { status: 409 }
        );
      }
    }

    await collection.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          name,
          code: code ? code.toUpperCase() : "",
          type,
          value: Number(value),
          trigger,
          targetType,
          targetIds: (targetIds || []).map((tid: string) => new ObjectId(tid)),
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          isActive,
          minOrderValue: Number(minOrderValue) || 0,
          usageLimit: usageLimit ? Number(usageLimit) : null,
        },
      }
    );

    return NextResponse.json({ message: "Discount updated successfully" });
  } catch (error) {
    console.error("Error updating discount:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);

    const result = await db
      .collection("discounts")
      .deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: "Discount not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Discount deleted" });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
