import { adminAuth } from "@/lib/firebase/adminApp";
import clientPromise from "@/lib/db";
import { User } from "@/types";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { idToken } = body;

    if (!idToken || typeof idToken !== "string") {
      return NextResponse.json({ error: "Bad Request" }, { status: 400 });
    }

    // ── Step 1: Verify the Firebase ID token using the Admin SDK ─────────────
    // verifyIdToken inherently validates: RS256 signature, iss, aud, exp.
    // No custom JWT logic is used here.
    let decodedToken: Awaited<ReturnType<typeof adminAuth.verifyIdToken>>;
    try {
      decodedToken = await adminAuth.verifyIdToken(idToken, true); // checkRevoked = true
    } catch {
      // Token is invalid, expired, or revoked — return a generic 401
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ── Step 2: Primary-key authorisation — query by firebaseUid ONLY ────────
    // Zero account-linking: no fallback by email, no upsert, no mutation.
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);

    const totalUsers = await db.collection("users").countDocuments();

    const allUsers = await db
      .collection("users")
      .find({}, { projection: { _id: 0, email: 1, firebaseUid: 1, role: 1 } })
      .toArray();

    const adminUser = await db
      .collection<User>("users")
      .findOne({ firebaseUid: decodedToken.uid });

    
    // If no document is found by UID, immediately deny — no secondary lookups.
    if (!adminUser) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // ── Step 3: Role enforcement ──────────────────────────────────────────────
    if (adminUser.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // ── Step 4: Mint a short-lived (5-day) session cookie ────────────────────
    const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 days in milliseconds
    const sessionCookie = await adminAuth.createSessionCookie(idToken, {
      expiresIn,
    });

    // ── Step 5: Set the cookie with strict security attributes ───────────────
    const cookieStore = await cookies();
    cookieStore.set("admin_session", sessionCookie, {
      maxAge: expiresIn / 1000, // maxAge is in seconds
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
    });

    return NextResponse.json({ status: "success" }, { status: 200 });
  } catch (error) {
    console.error("Error creating admin session cookie:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
