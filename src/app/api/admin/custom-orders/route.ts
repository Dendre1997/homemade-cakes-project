import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminAuth } from "@/lib/firebase/adminApp";
import clientPromise from "@/lib/db";
import { User } from "@/types";

/**
 * Shared admin auth helper — verifies session cookie and admin role.
 * Returns the db instance if authorised, or a NextResponse error to return early.
 */
async function getAdminDb() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("session")?.value;

  if (!sessionCookie) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const decodedToken = await adminAuth
    .verifySessionCookie(sessionCookie, true)
    .catch(() => null);

  if (!decodedToken) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB_NAME);

  const user = await db.collection<User>("users").findOne({ firebaseUid: decodedToken.uid });
  if (!user || user.role !== "admin") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { db };
}

/**
 * GET /api/admin/custom-orders
 * Lists all custom orders, sorted by date ascending (upcoming first).
 * Admin only.
 */
export async function GET() {
  try {
    const auth = await getAdminDb();
    if (auth.error) return auth.error;
    const { db } = auth;

    const orders = await db
      .collection("custom_orders")
      .find({})
      .sort({ date: 1 })
      .toArray();

    return NextResponse.json(orders);
  } catch (error) {
    console.error("Admin Custom Orders GET Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
