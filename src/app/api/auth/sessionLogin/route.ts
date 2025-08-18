import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase/adminApp";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  try {
    const { idToken } = await request.json();
    if (!idToken) {
      return NextResponse.json(
        { error: "ID token is required" },
        { status: 400 }
      );
    }

    // 2. session term 5 days
    const expiresIn = 60 * 60 * 24 * 5 * 1000;

    await adminAuth.verifyIdToken(idToken, true);
    const sessionCookie = await adminAuth.createSessionCookie(idToken, {
      expiresIn,
    });

    cookies().set("session", sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: expiresIn / 1000,
      path: "/",
      sameSite: "lax",
    });

    return NextResponse.json({ status: "success" }, { status: 200 });
  } catch (error) {
    console.error("Session login error:", error);
    return NextResponse.json(
      { error: "Internal Server Error or Invalid Token" },
      { status: 401 }
    );
  }
}
