import { verifyAdminAPI } from "@/lib/auth/adminOnly";
import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/db";
import { Addon } from "@/types";

// POST
export async function POST(request: NextRequest) {
  const auth = await verifyAdminAPI();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const body = await request.json();
    const { name, description, imageUrl, categoryIds, isActive, variants }: Partial<Addon> =
      body;

    if (!name || !variants || variants.length === 0) {
      return NextResponse.json(
        { error: "Name and at least one variant are required" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);

    const newAddonData = {
      name,
      description: description || "",
      imageUrl: imageUrl || "",
      categoryIds: categoryIds || [],
      isActive: isActive !== undefined ? isActive : true,
      variants: variants.map(v => ({
        ...v,
        _id: v._id || new ObjectId().toString()
      })),
    };

    const result = await db
      .collection("addons")
      .insertOne(newAddonData);

    return NextResponse.json(
      {
        message: "addon created successfully",
        ...newAddonData,
        _id: result.insertedId,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating addon:", error);
    return NextResponse.json(
      { error: "An error occurred while creating the addon." },
      { status: 500 }
    );
  }
}

export async function GET() {
  const auth = await verifyAdminAPI();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);

    const addons = await db.collection("addons").find({}).toArray();

    return NextResponse.json(addons, { status: 200 });
  } catch (error) {
    console.error("Error fetching addons:", error);
    return NextResponse.json(
      { error: "An error occurred while fetching addons." },
      { status: 500 }
    );
  }
}
