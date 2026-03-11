import { NextResponse, NextRequest } from "next/server";
import { cookies } from "next/headers";
import { adminAuth } from "@/lib/firebase/adminApp";
import clientPromise from "@/lib/db";
import { User } from "@/types";

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("session")?.value;
    const authHeader = req.headers.get("authorization");
    
    let decodedToken;

    if (sessionCookie) {
      decodedToken = await adminAuth.verifySessionCookie(
        sessionCookie,
        true
      );
    } else if (authHeader?.startsWith("Bearer ")) {
      const idToken = authHeader.split("Bearer ")[1];
      decodedToken = await adminAuth.verifyIdToken(idToken);
    } else {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);
    const user = await db
      .collection<User>("users")
      .findOne({ firebaseUid: decodedToken.uid });

    if (!user) {
      return NextResponse.json(
        { error: "User profile not found in DB" },
        { status: 404 }
      );
    }
    return NextResponse.json(user);
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return NextResponse.json(
      { error: "Unauthorized or Internal Server Error" },
      { status: 401 }
    );
  }
}
