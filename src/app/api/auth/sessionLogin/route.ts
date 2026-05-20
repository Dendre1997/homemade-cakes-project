import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase/adminApp";
import { cookies } from "next/headers";
import clientPromise from "@/lib/db";
import { User } from "@/types";

export async function POST(request: Request) {
  try {
    const { idToken } = await request.json();
    if (!idToken) {
      return NextResponse.json(
        { error: "ID token is required" },
        { status: 400 }
      );
    }

    // ── Verify the token first ──────────────────────────────────────────────
    const decodedToken = await adminAuth.verifyIdToken(idToken, true);

    // ── Create session cookie ───────────────────────────────────────────────
    const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 days
    const sessionCookie = await adminAuth.createSessionCookie(idToken, {
      expiresIn,
    });

    const cookieStore = await cookies();
    cookieStore.set("session", sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: expiresIn / 1000,
      path: "/",
      sameSite: "lax",
    });

    // ── Self-healing user upsert (Steps A → B → C) ─────────────────────────
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);
    const usersCollection = db.collection<Omit<User, "_id">>("users");

    const { uid, email } = decodedToken;

    // Step A — primary lookup by Firebase UID
    const byUid = await usersCollection.findOne({ firebaseUid: uid });
    if (byUid) {
      return NextResponse.json({ status: "success", action: "login" }, { status: 200 });
    }

    // Step B — legacy account linking: found by email (old email/password user)
    if (email) {
      const byEmail = await usersCollection.findOne({ email });
      if (byEmail) {
        await usersCollection.updateOne(
          { email },
          { $set: { firebaseUid: uid } }
        );
        return NextResponse.json(
          { status: "success", action: "linked" },
          { status: 200 }
        );
      }
    }

    // Step C — auto-create a new document for first-time Google users
    const newUser: Omit<User, "_id"> = {
      firebaseUid: uid,
      email: email ?? "",
      role: "customer",
    };
    await usersCollection.insertOne(newUser);

    return NextResponse.json(
      { status: "success", action: "created" },
      { status: 201 }
    );
  } catch (error) {
    console.error("Session login error:", error);
    return NextResponse.json(
      { error: "Internal Server Error or Invalid Token" },
      { status: 401 }
    );
  }
}
