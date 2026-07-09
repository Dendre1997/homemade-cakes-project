import { verifyAdminAPI } from "@/lib/auth/adminOnly";
import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/db";
import { IShape } from "@/types";
import { ObjectId, Db } from "mongodb";

async function clearOtherDefaultShapes(db: Db, excludeId?: ObjectId) {
  const filter: Record<string, unknown> = { isDefault: true };
  if (excludeId) {
    filter._id = { $ne: excludeId };
  }
  await db.collection("shapes").updateMany(filter, { $set: { isDefault: false } });
}

export async function GET() {
  const auth = await verifyAdminAPI();
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);
    const shapes = await db
      .collection("shapes")
      .find({})
      .sort({ isDefault: -1, name: 1 })
      .toArray();

    return NextResponse.json(shapes, { status: 200 });
  } catch (error) {
    console.error("Error fetching shapes:", error);
    return NextResponse.json(
      { error: "An error occurred while fetching shapes." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await verifyAdminAPI();
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await request.json();
    const {
      name,
      priceSurcharge,
      isDefault,
      isActive,
      imageUrl,
    }: Partial<IShape> = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    if (priceSurcharge !== undefined && typeof priceSurcharge !== "number") {
      return NextResponse.json(
        { error: "priceSurcharge must be a number" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);

    const willBeDefault = Boolean(isDefault);

    if (willBeDefault) {
      await clearOtherDefaultShapes(db);
    }

    const newShapeData = {
      name: name.trim(),
      priceSurcharge: typeof priceSurcharge === "number" ? priceSurcharge : 0,
      isDefault: willBeDefault,
      isActive: isActive !== false,
      imageUrl: imageUrl || "",
    };

    const result = await db.collection("shapes").insertOne(newShapeData);

    return NextResponse.json(
      {
        message: "Shape created successfully",
        shapeId: result.insertedId,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating shape:", error);
    return NextResponse.json(
      { error: "An error occurred while creating the shape." },
      { status: 500 }
    );
  }
}
