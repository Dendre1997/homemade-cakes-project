import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAPI } from "@/lib/auth/adminOnly";
import { mongoUnavailableResponse } from "@/lib/db/mongoHttp";
import {
  searchBakeryRecords,
  SearchQueryTooShortError,
} from "@/lib/ai/queries/search";

export const dynamic = "force-dynamic";

/**
 * Unified text search across `orders` and `custom_orders` for the Baker AI.
 * The query logic lives in @/lib/ai/queries/search so the chat tool can reuse
 * it in-process; this handler only does auth, parsing and error mapping.
 */
export async function GET(request: NextRequest) {
  const session = await verifyAdminAPI();
  if (!("user" in session)) {
    return NextResponse.json(
      { error: session.error },
      { status: session.status }
    );
  }

  const { searchParams } = new URL(request.url);
  const parsedLimit = Number.parseInt(searchParams.get("limit") ?? "", 10);

  try {
    const result = await searchBakeryRecords({
      query: searchParams.get("q") ?? "",
      limit: Number.isFinite(parsedLimit) ? parsedLimit : undefined,
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof SearchQueryTooShortError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.error("Error running AI search:", error);
    return (
      mongoUnavailableResponse(error) ??
      NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    );
  }
}
