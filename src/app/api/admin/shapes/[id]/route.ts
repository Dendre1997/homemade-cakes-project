import { verifyAdminAPI } from "@/lib/auth/adminOnly";
import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/db";
import { ObjectId, Db } from "mongodb";
import { IShape } from "@/types";

interface Context {
  params: Promise<{ id: string }>;
}

async function clearOtherDefaultShapes(db: Db, excludeId: ObjectId) {
  await db.collection("shapes").updateMany(
    { isDefault: true, _id: { $ne: excludeId } },
    { $set: { isDefault: false } }
  );
}

export async function GET(_request: Request, { params }: Context) {
  const auth = await verifyAdminAPI();
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { id } = await params;
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);

    const shape = await db.collection("shapes").findOne({
      _id: new ObjectId(id),
    });

    if (!shape) {
      return NextResponse.json({ error: "Shape not found" }, { status: 404 });
    }

    return NextResponse.json(shape, { status: 200 });
  } catch (error) {
    console.error("Error fetching shape:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: Context) {
  const auth = await verifyAdminAPI();
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { id } = await params;
    const shapeObjectId = new ObjectId(id);
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

    const existing = await db.collection("shapes").findOne({
      _id: shapeObjectId,
    });

    if (!existing) {
      return NextResponse.json({ error: "Shape not found" }, { status: 404 });
    }

    const willBeDefault = Boolean(isDefault);

    if (willBeDefault) {
      await clearOtherDefaultShapes(db, shapeObjectId);
    }

    const updateDoc: Record<string, unknown> = {
      name: name.trim(),
      priceSurcharge:
        typeof priceSurcharge === "number"
          ? priceSurcharge
          : (existing.priceSurcharge ?? 0),
      isDefault: willBeDefault,
      isActive: isActive !== undefined ? Boolean(isActive) : existing.isActive !== false,
      imageUrl: imageUrl !== undefined ? imageUrl || "" : existing.imageUrl || "",
    };

    await db.collection("shapes").updateOne(
      { _id: shapeObjectId },
      { $set: updateDoc }
    );

    return NextResponse.json(
      { message: "Shape updated successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating shape:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  const auth = await verifyAdminAPI();
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { id } = await params;
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);

    const result = await db.collection("shapes").deleteOne({
      _id: new ObjectId(id),
    });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Shape not found" }, { status: 404 });
    }

    return NextResponse.json(
      { message: "Shape deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting shape:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
