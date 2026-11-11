import { verifyAdminAPI } from "@/lib/auth/adminOnly";
import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/db";
import { normalizeSetFields } from "@/lib/validation/setFields";

export async function POST(request: NextRequest) {
  const auth = await verifyAdminAPI();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const fields = normalizeSetFields(await request.json());
    if (!fields.ok) {
      return NextResponse.json({ error: fields.error }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);

    const now = new Date();
    const result = await db
      .collection("sets")
      .insertOne({ ...fields.data, createdAt: now, updatedAt: now });

    return NextResponse.json(
      { message: "Set created successfully", setId: result.insertedId },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating set:", error);
    return NextResponse.json(
      { error: "An error occurred while creating the set." },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const auth = await verifyAdminAPI();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const categoryId = request.nextUrl.searchParams.get("categoryId");
    const filter: { categoryIds?: string } = {};
    if (categoryId) filter.categoryIds = categoryId;

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);

    const sets = await db
      .collection("sets")
      .find(filter)
      .sort({ pieceCount: 1, name: 1 })
      .toArray();

    return NextResponse.json(sets, { status: 200 });
  } catch (error) {
    console.error("Error fetching sets:", error);
    return NextResponse.json(
      { error: "An error occurred while fetching sets." },
      { status: 500 }
    );
  }
}
