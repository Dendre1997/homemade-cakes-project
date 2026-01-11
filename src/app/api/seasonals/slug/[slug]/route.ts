import { NextResponse } from "next/server";
import clientPromise from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);

    const seasonalEvent = await db
      .collection("seasonals")
      .findOne({ slug });

    if (!seasonalEvent) {
      return NextResponse.json(
        { error: "Seasonal event not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ...seasonalEvent,
      _id: seasonalEvent._id.toString(),
    });
  } catch (error) {
    console.error("Error fetching seasonal event by slug:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
