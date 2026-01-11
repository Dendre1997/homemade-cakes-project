import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/db";
import { Discount } from "@/types";
import { ObjectId } from "mongodb";

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);

    const discounts = await db
      .collection("discounts")
      .find({})
      .sort({ startDate: -1 })
      .toArray();

    return NextResponse.json(discounts);
  } catch (error) {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
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
    }: Partial<Discount> = body;

    // 1. Валідація
    if (
      !name ||
      !type ||
      !value ||
      !trigger ||
      !targetType ||
      !startDate ||
      !endDate
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (trigger === "code" && !code) {
      return NextResponse.json(
        { error: "Code is required for code-triggered discounts" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);

    if (code) {
      const existingCode = await db.collection("discounts").findOne({
        code: { $regex: new RegExp(`^${code}$`, "i") },
      });
      if (existingCode) {
        return NextResponse.json(
          { error: "Discount code already exists" },
          { status: 409 }
        );
      }
    }

    const newDiscount = {
      name,
      code: code ? code.toUpperCase() : "",
      type,
      value: Number(value),
      trigger,
      targetType,
      targetIds: (targetIds || []).map(
        (id: string | ObjectId) => new ObjectId(id)
      ),

      startDate: new Date(startDate),
      endDate: new Date(endDate),
      isActive: isActive ?? false,
      minOrderValue: minOrderValue ? Number(minOrderValue) : 0,
      usageLimit: usageLimit ? Number(usageLimit) : null,
      usedCount: 0,
      createdAt: new Date(),
    };

    const result = await db.collection("discounts").insertOne(newDiscount);

    return NextResponse.json(
      { message: "Discount created", _id: result.insertedId, ...newDiscount },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating discount:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
