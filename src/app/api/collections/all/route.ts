import { NextResponse } from "next/server";
import clientPromise from "@/lib/db";

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);

    const collections = await db.collection("collections").find({}).sort({ name: 1 }).toArray();
    return NextResponse.json(collections);
  } catch (error) {
    console.error("Error fetching all collections:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
