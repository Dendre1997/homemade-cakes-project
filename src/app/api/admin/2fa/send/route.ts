import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase/adminApp";
import clientPromise from "@/lib/db";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get("session")?.value;
    console.log("Debug: Session Cookie exists?", !!sessionCookie);

    if (!sessionCookie) {
      console.log("Debug: No session cookie found.");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. Verify Session
    const decodedToken = await adminAuth.verifySessionCookie(sessionCookie, true);
    console.log("Debug: Decoded Token UID:", decodedToken.uid);
    console.log("Debug: Decoded Token Email:", decodedToken.email);
    
    if (!decodedToken.email) {
       console.log("Debug: No email in token.");
       return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    // 2. Fetch User from DB (moved up for debugging)
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);
    const user = await db.collection("users").findOne({ firebaseUid: decodedToken.uid });

    console.log("Debug: User found in DB?", !!user);
    console.log("Debug: User Role from DB:", user?.role);
    console.log("Debug: Token Claims:", { role: decodedToken.role, admin: decodedToken.admin });

    // 3. Verify Admin Role (Check both Token Claim OR DB Role)
    const isAdminClaim = decodedToken.role === "admin" || decodedToken.admin === true;
    const isAdminDb = user?.role === "admin";
    const isEnvAdmin = decodedToken.email === process.env.ADMIN_EMAIL;

    if (!isAdminClaim && !isAdminDb && !isEnvAdmin) {
        console.log("Debug: Admin check failed. Access denied.");
        return NextResponse.json({ error: "Forbidden: Not an admin" }, { status: 403 });
    }

    // 4. Generate Code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 mins

    // 5. Save to DB
    await db.collection("users").updateOne(
      { firebaseUid: decodedToken.uid },
      { 
        $set: { 
          twoFactorCode: code,
          twoFactorExpires: expiresAt 
        } 
      }
    );

    // 6. Send Email
    console.log("Debug: Sending email to:", decodedToken.email);
    await resend.emails.send({
      from: "Dilna Cakes Security <security@resend.dev>",
      to: decodedToken.email,
      subject: "Your Admin Access Code",
      html: `<p>Your Admin Access Code: <strong>${code}</strong></p><p>Valid for 5 minutes.</p>`,
    });

    console.log("Debug: Email sent successfully.");
    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("2FA Send Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
