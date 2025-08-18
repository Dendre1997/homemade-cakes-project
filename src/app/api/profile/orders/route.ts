import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminAuth } from "@/lib/firebase/adminApp";
import clientPromise from "@/lib/db";

export async function GET() {
  try {
    const sessionCookie = cookies().get("session")?.value;
    if (!sessionCookie)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const decodedToken = await adminAuth.verifySessionCookie(
      sessionCookie,
      true
    );

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);

    const user = await db
      .collection("users")
      .findOne({ firebaseUid: decodedToken.uid });
    if (!user) {
      return NextResponse.json(
        { error: "User not found in DB" },
        { status: 404 }
      );
    }

    const userOrders = await db
      .collection("orders")
      .find({
        customerId: user._id,
      })
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json(userOrders);
  } catch (error) {
    console.error("Error fetching user orders:", error);
    return NextResponse.json(
      { error: "Unauthorized or Internal Server Error" },
      { status: 401 }
    );
  }
}