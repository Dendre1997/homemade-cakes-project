import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/db";
import { Collection } from "@/types";

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);

    const collections = await db
      .collection("collections")
      .find({})
      .sort({ name: 1 })
      .toArray();

    const collectionsWithStrings = collections.map((collection) => ({
      ...collection,
      _id: collection._id.toString(),
    }));

    return NextResponse.json(collectionsWithStrings);
  } catch (error) {
    console.error("Error fetching collections:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
