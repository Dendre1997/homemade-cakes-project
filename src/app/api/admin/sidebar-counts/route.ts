import { NextResponse } from "next/server";
import { verifyAdminAPI } from "@/lib/auth/adminOnly";
import { withMongoClient } from "@/lib/db";
import { mongoUnavailableResponse } from "@/lib/db/mongoHttp";

/**
 * GET /api/admin/sidebar-counts
 * Badge counts for AdminSidebar. Filters mirror the previous client-side logic:
 * - custom: status not in ["converted", "rejected"]
 * - orders: status not in ["delivered", "cancelled"]
 * - support: active chats (same $match as /api/admin/chats), returned as
 *   { _id, hasUnread } so the sidebar can patch read/unread state locally.
 */
export async function GET() {
  const session = await verifyAdminAPI();
  if (!("user" in session)) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }

  try {
    const result = await withMongoClient(async (client) => {
      const db = client.db(process.env.MONGODB_DB_NAME);

      const [customRequestsCount, activeOrdersCount, supportChats] = await Promise.all([
        db
          .collection("custom_orders")
          .countDocuments({ status: { $nin: ["converted", "rejected"] } }),
        db
          .collection("orders")
          .countDocuments({ status: { $nin: ["delivered", "cancelled"] } }),
        db
          .collection("chats")
          .find(
            { status: { $in: ["waiting_admin", "admin_active"] } },
            { projection: { _id: 1, hasUnread: 1 } },
          )
          .toArray(),
      ]);

      return {
        customRequestsCount,
        activeOrdersCount,
        supportChats: supportChats.map((c) => ({
          _id: c._id.toString(),
          hasUnread: c.hasUnread === true,
        })),
      };
    });

    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("Admin sidebar counts GET Error:", error);
    return (
      mongoUnavailableResponse(error) ??
      NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    );
  }
}
