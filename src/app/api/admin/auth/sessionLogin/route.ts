import { adminAuth } from "@/lib/firebase/adminApp";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { idToken } = await request.json();

    // Verify the ID token first
    const decodedToken = await adminAuth.verifyIdToken(idToken);

    // CRITICAL: Ensure the user actually has the admin claim before minting an admin session
    if (decodedToken.admin !== true) {
      return NextResponse.json({ error: "Forbidden: Not an admin" }, { status: 403 });
    }

    // Create session cookie (Valid for 5 days)
    const expiresIn = 60 * 60 * 24 * 5 * 1000;
    const sessionCookie = await adminAuth.createSessionCookie(idToken, {
      expiresIn,
    });

    // Set the cookie as 'admin_session'
    const cookieStore = await cookies();
    cookieStore.set("admin_session", sessionCookie, {
      maxAge: expiresIn,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      sameSite: "lax",
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
