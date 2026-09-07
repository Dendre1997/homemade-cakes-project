import { NextResponse } from "next/server";
import { verifyAdminAPI } from "@/lib/auth/adminOnly";
import { mongoUnavailableResponse } from "@/lib/db/mongoHttp";
import { setupDatabaseIndexes } from "@/lib/db/setupIndexes";

export const dynamic = "force-dynamic";

/**
 * One-off maintenance endpoint that provisions the MongoDB indexes required by
 * the admin dashboard and the Baker AI tools. Idempotent — safe to re-run after
 * every deploy that adds new indexes.
 */
export async function POST() {
  const session = await verifyAdminAPI();
  if (!("user" in session)) {
    return NextResponse.json(
      { error: session.error },
      { status: session.status }
    );
  }

  try {
    const report = await setupDatabaseIndexes();
    return NextResponse.json(report, { status: report.ok ? 200 : 500 });
  } catch (error) {
    console.error("Error setting up database indexes:", error);
    return (
      mongoUnavailableResponse(error) ??
      NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    );
  }
}
