import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminAuth } from "@/lib/firebase/adminApp";
import { pusherServer } from "@/lib/pusher";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { chatId, isTyping, sender } = body;

    if (!chatId || typeof isTyping !== 'boolean' || !sender) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("session")?.value;

    if (!sessionCookie) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    try {
      await adminAuth.verifySessionCookie(sessionCookie, true);
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Ping typing updates seamlessly over the private chat boundary
    await pusherServer.trigger(`private-chat-${chatId}`, 'typing-update', {
      isTyping,
      sender
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Failed to push typing event:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
