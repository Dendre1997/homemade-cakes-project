import { NextResponse } from "next/server";
import { MongoUnavailableError } from "@/lib/db/withMongoRetry";

/**
 * Map Mongo deadline / unavailable errors to HTTP 503 for API routes.
 * Returns null when the error should be handled as a generic 500.
 */
export function mongoUnavailableResponse(error: unknown): NextResponse | null {
  if (error instanceof MongoUnavailableError) {
    return NextResponse.json(
      { error: "Database temporarily unavailable. Please try again shortly." },
      { status: 503 }
    );
  }
  return null;
}
