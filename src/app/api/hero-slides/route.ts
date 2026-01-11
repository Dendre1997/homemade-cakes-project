import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/db";


export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);
    const slides = await db.collection("hero_slides").find({}).toArray();

    return NextResponse.json(slides);
  } catch (error) {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}