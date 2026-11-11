import { verifyAdminAPI } from "@/lib/auth/adminOnly";
import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/db";
import { ObjectId } from "mongodb";
import { normalizeSetFields } from "@/lib/validation/setFields";

const notFound = () =>
  NextResponse.json({ error: "Set not found" }, { status: 404 });

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdminAPI();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const { id } = await params;
    if (!ObjectId.isValid(id)) return notFound();

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);

    const set = await db.collection("sets").findOne({ _id: new ObjectId(id) });
    if (!set) return notFound();

    return NextResponse.json(set, { status: 200 });
  } catch (error) {
    console.error("Error fetching set:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdminAPI();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const { id } = await params;
    if (!ObjectId.isValid(id)) return notFound();

    const fields = normalizeSetFields(await request.json());
    if (!fields.ok) {
      return NextResponse.json({ error: fields.error }, { status: 400 });
    }

    const { basePrice, imageUrl, ...required } = fields.data;
    const $set: Record<string, unknown> = { ...required, updatedAt: new Date() };
    const $unset: Record<string, ""> = {};
    if (basePrice !== undefined) $set.basePrice = basePrice;
    else $unset.basePrice = "";
    if (imageUrl) $set.imageUrl = imageUrl;
    else $unset.imageUrl = "";

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);

    const result = await db
      .collection("sets")
      .updateOne(
        { _id: new ObjectId(id) },
        Object.keys($unset).length ? { $set, $unset } : { $set }
      );

    if (result.matchedCount === 0) return notFound();

    return NextResponse.json({ message: "Set updated successfully" }, { status: 200 });
  } catch (error) {
    console.error("Error updating set:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdminAPI();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const { id } = await params;
    if (!ObjectId.isValid(id)) return notFound();

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);

    // Products reference a set through `availableSetConfigs.setId`.
    const usedBy = await db.collection("products").findOne(
      { "availableSetConfigs.setId": { $in: [new ObjectId(id), id] } },
      { projection: { name: 1 } }
    );
    if (usedBy) {
      return NextResponse.json(
        {
          error: `This set is used by the product "${usedBy.name}". Remove it from that product first.`,
        },
        { status: 409 }
      );
    }

    const result = await db.collection("sets").deleteOne({ _id: new ObjectId(id) });
    if (result.deletedCount === 0) return notFound();

    return NextResponse.json({ message: "Set deleted successfully" }, { status: 200 });
  } catch (error) {
    console.error("Error deleting set:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
