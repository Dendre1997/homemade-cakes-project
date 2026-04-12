import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase/adminApp";
import { resend } from "@/lib/email";
import PasswordResetEmail from "@/emails/PasswordResetEmail";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    try {
      // Ask Firebase Admin SDK to securely issue the OTP link mapping
      const rawLink = await adminAuth.generatePasswordResetLink(email);

      // Hijack the Firebase auto-generated link to extract the secret code
      const url = new URL(rawLink);
      const oobCode = url.searchParams.get("oobCode");

      const baseUrl = process.env.NEXT_PUBLIC_API_URL
        ? process.env.NEXT_PUBLIC_API_URL
        : process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000";

      const cleanLink = `${baseUrl}/reset-password?oobCode=${oobCode}`;

      // Send via custom API leveraging Resend vs the baked-in Google templates
      const { data, error: resendError } = await resend.emails.send({
        from: "Homemade Cakes <onboarding@resend.dev>", 
        to: email,
        subject: "Reset Your Password - Homemade Cakes",
        react: PasswordResetEmail({ resetLink: cleanLink }),
      });

      if (resendError) {
        console.error("Resend delivery failed:", resendError);
        return NextResponse.json({ error: resendError.message }, { status: 500 });
      }

      console.log("Successfully dispatched email via Resend:", data);
      return NextResponse.json({ message: "Password reset email dispatched" });
    } catch (firebaseErr: any) {
      if (
        firebaseErr.code === "auth/user-not-found" ||
        firebaseErr.code === "auth/invalid-email"
      ) {
        // Prevent abuse via user enumeration (security fallback)
        return NextResponse.json({
          message: "If this email exists, a reset link was sent.",
        });
      }
      throw firebaseErr;
    }
  } catch (error: any) {
    console.error("Password reset API error:", error);
    return NextResponse.json(
      { error: "Failed to handle password reset request." },
      { status: 500 }
    );
  }
}
