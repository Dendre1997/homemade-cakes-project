import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminAuth } from "@/lib/firebase/adminApp";
import { withMongoClient } from "@/lib/db";
import { mongoUnavailableResponse } from "@/lib/db/mongoHttp";
import { User } from "@/types";

/**
 * GET /api/admin/custom-orders
 * Lists all custom orders, sorted by date ascending (upcoming first).
 * Admin only.
 */
export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("admin_session")?.value;

    if (!sessionCookie) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decodedToken = await adminAuth
      .verifySessionCookie(sessionCookie, true)
      .catch(() => null);

    if (!decodedToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await withMongoClient(async (client) => {
      const db = client.db(process.env.MONGODB_DB_NAME);

      const user = await db.collection<User>("users").findOne({ firebaseUid: decodedToken.uid });
      if (!user || user.role !== "admin") {
        return { forbidden: true as const };
      }

      const orders = await db
        .collection("custom_orders")
        .find({})
        .sort({ date: 1 })
        .toArray();

      return { orders };
    });

    if ("forbidden" in result) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(result.orders);
  } catch (error) {
    console.error("Admin Custom Orders GET Error:", error);
    return (
      mongoUnavailableResponse(error) ??
      NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    );
  }
}
