import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase/adminApp";
import clientPromise from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json();
    const sessionCookie = request.cookies.get("session")?.value;

    if (!sessionCookie || !code) {
      return NextResponse.json({ error: "Unauthorized or missing code" }, { status: 401 });
    }

    // 1. Verify Session
    const decodedToken = await adminAuth.verifySessionCookie(sessionCookie, true);

    // 2. Validate Code against DB
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);

    const user = await db.collection("users").findOne({ firebaseUid: decodedToken.uid });

    if (!user || user.twoFactorCode !== code) {
      return NextResponse.json({ error: "Invalid code" }, { status: 400 });
    }

    if (new Date() > new Date(user.twoFactorExpires)) {
      return NextResponse.json({ error: "Code expired" }, { status: 400 });
    }

    // 3. Success: Clear code & Set Cookie
    await db.collection("users").updateOne(
      { firebaseUid: decodedToken.uid },
      { 
        $unset: { twoFactorCode: "", twoFactorExpires: "" } 
      }
    );

    const response = NextResponse.json({ success: true });

    // Set long-lived cookie
    response.cookies.set("admin_device_verified", "true", {
      maxAge: 30 * 24 * 60 * 60, // 30 days
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      sameSite: "lax"
    });

    return response;

  } catch (error) {
    console.error("2FA Verify Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
