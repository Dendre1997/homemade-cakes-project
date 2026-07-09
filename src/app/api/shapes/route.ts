import { NextResponse } from "next/server";
import clientPromise from "@/lib/db";

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);

    const shapes = await db
      .collection("shapes")
      .find({ isActive: { $ne: false } })
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
