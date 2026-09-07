import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAPI } from "@/lib/auth/adminOnly";
import { mongoUnavailableResponse } from "@/lib/db/mongoHttp";
import {
  buildDailyBrief,
  InvalidDateKeyError,
} from "@/lib/ai/queries/dailyBrief";

export const dynamic = "force-dynamic";

/**
 * Unified daily briefing: capacity, the day's production list, outstanding
 * payments and unanswered custom requests in one call. The aggregation lives in
 * @/lib/ai/queries/dailyBrief so the chat tool can reuse it in-process.
 */
export async function GET(request: NextRequest) {
  const session = await verifyAdminAPI();
  if (!("user" in session)) {
    return NextResponse.json(
      { error: session.error },
      { status: session.status }
    );
  }

  try {
    const brief = await buildDailyBrief({
      date: new URL(request.url).searchParams.get("date"),
    });

    return NextResponse.json(brief);
  } catch (error) {
    if (error instanceof InvalidDateKeyError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.error("Error building daily brief:", error);
    return (
      mongoUnavailableResponse(error) ??
      NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    );
  }
}
