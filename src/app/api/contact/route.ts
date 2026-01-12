import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import ContactRequestEmail from "@/emails/ContactRequestEmail";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { name, email, phone, message, company } = data;

    if (company) {
      console.log("Honeypot triggered. Blocking spam submission.");
      return NextResponse.json({ success: true }, { status: 200 });
    }

    // Validation
    if (!name || !email || !message) {
      return NextResponse.json(
        { error: "Name, email, and message are required." },
        { status: 400 }
      );
    }

    // Simple email regex validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email address." },
        { status: 400 }
      );
    }

    // Send Email
    await resend.emails.send({
      from: "Dilna Cakes <onboarding@resend.dev>",
      to: process.env.ADMIN_EMAIL || "",
      subject: `New Contact Request: ${name}`,
      react: ContactRequestEmail({ name, email, phone: phone || "Not provided", message }),
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error processing contact request:", error);
    return NextResponse.json(
      { error: "Failed to send message. Please try again later." },
      { status: 500 }
    );
  }
}
