import { NextResponse } from "next/server";
import { getCollections } from "@/lib/db/collections";
import { MongoUnavailableError } from "@/lib/db/withMongoRetry";

export async function GET() {
  try {
    const collections = await getCollections();
    return NextResponse.json(collections);
  } catch (error) {
    if (error instanceof MongoUnavailableError) {
      return NextResponse.json(
        { error: "Database temporarily unavailable. Please try again shortly." },
        { status: 503 }
      );
    }
    console.error("Error fetching collections:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
