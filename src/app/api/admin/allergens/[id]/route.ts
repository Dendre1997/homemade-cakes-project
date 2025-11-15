import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/db";
import { ObjectId } from "mongodb";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);
    const allergen = await db
      .collection("allergens")
      .findOne({ _id: new ObjectId(id) });
    if (!allergen) {
      return NextResponse.json(
        { error: "Allergen not found" },
        { status: 404 }
      );
    }
    return NextResponse.json(allergen);
  } catch (error) {
    console.error("Error fetching allergen:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const { name } = await request.json();
    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);
    const result = await db
      .collection("allergens")
      .updateOne({ _id: new ObjectId(id) }, { $set: { name } });
    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: "Allergen not found" },
        { status: 404 }
      );
    }
    return NextResponse.json({ message: "Allergen updated" });
  } catch (error) {
    console.error("Error updating allergen:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
// DELETE
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);

    const result = await db.collection("allergens").deleteOne({
      _id: new ObjectId(id),
    });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: "Allergen not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: "Allergen deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting allergen:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
