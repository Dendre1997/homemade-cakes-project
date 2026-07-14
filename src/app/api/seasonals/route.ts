import { NextResponse } from "next/server";
import { getActiveSeasonals } from "@/lib/db/seasonals";
import { MongoUnavailableError } from "@/lib/db/withMongoRetry";

export async function GET() {
  try {
    const activeSeasonals = await getActiveSeasonals();
    return NextResponse.json(activeSeasonals);
  } catch (error) {
    if (error instanceof MongoUnavailableError) {
      return NextResponse.json(
        { error: "Database temporarily unavailable. Please try again shortly." },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
