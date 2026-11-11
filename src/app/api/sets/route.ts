import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const categoryId = request.nextUrl.searchParams.get("categoryId");
    const filter: { categoryIds?: string } = {};
    if (categoryId) filter.categoryIds = categoryId;

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);

    const sets = await db
      .collection("sets")
      .find(filter, { projection: { createdAt: 0, updatedAt: 0 } })
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
