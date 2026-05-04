import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/db";
import { Decoration } from "@/types";

// POST
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, imageUrl, categoryIds, isActive, variants }: Partial<Decoration> =
      body;

    if (!name || !variants || variants.length === 0) {
      return NextResponse.json(
        { error: "Name and at least one variant are required" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);

    const newDecorationData = {
      name,
      description: description || "",
      imageUrl: imageUrl || "",
      categoryIds: categoryIds || [],
      isActive: isActive !== undefined ? isActive : true,
      variants,
    };

    const result = await db
      .collection("decorations")
      .insertOne(newDecorationData);

    return NextResponse.json(
      {
        message: "Decoration created successfully",
        ...newDecorationData,
        _id: result.insertedId,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating decoration:", error);
    return NextResponse.json(
      { error: "An error occurred while creating the decoration." },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);

    const decorations = await db.collection("decorations").find({}).toArray();

    return NextResponse.json(decorations, { status: 200 });
  } catch (error) {
    console.error("Error fetching decorations:", error);
    return NextResponse.json(
      { error: "An error occurred while fetching decorations." },
      { status: 500 }
    );
  }
}
