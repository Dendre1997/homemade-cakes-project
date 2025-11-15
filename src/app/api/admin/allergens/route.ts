import { NextRequest, NextResponse } from "next/server";
import { Allergen } from "@/types";
import clientPromise from "@/lib/db";

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);

    const allergens = await db.collection("allergens").find({}).toArray();

    return NextResponse.json(allergens, { status: 200 });
  } catch (error) {
    console.error("Error fetching allergens:", error);
    return NextResponse.json(
      { error: "An error occurred while fetching allergens." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { name }: Partial<Allergen> = body;

    if (!name) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);

    const newAllergensData = {
      name,
    };

    const result = await db.collection("allergens").insertOne(newAllergensData);

    return NextResponse.json(
      {
        message: "New allergen created successfully",
        decorationId: result.insertedId,
      },
      { status: 201 } 
    );
  } catch (error) {
    console.error("Error creating allergen:", error);
    return NextResponse.json(
      { error: "An error occurred while creating the allergen." },
      { status: 500 }
    );
  }
}
