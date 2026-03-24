import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminAuth } from "@/lib/firebase/adminApp";
import clientPromise from "@/lib/db";
import { getChatCollection } from "@/lib/api/chat";
import { pusherServer } from "@/lib/pusher";
import { ObjectId } from "mongodb";
import { IMessage } from "@/types";

export async function POST(req: NextRequest) {
  try {
    // 1. Structure Decoding and Validation
    const body = await req.json();
    const { chatId, text, sender } = body;

    if (!chatId || !text || !sender) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (!['client', 'admin', 'bot'].includes(sender)) {
      return NextResponse.json({ error: "Invalid sender type" }, { status: 400 });
    }

    // 2. Identity Verification via Firebase Cookies
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("session")?.value;

    if (!sessionCookie) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    let decodedToken;
    try {
      decodedToken = await adminAuth.verifySessionCookie(sessionCookie, true);
    } catch (error) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);
    const user = await db.collection("users").findOne({ firebaseUid: decodedToken.uid });

    if (!user) {
      return NextResponse.json({ error: "User profile not found in database" }, { status: 403 });
    }

    // Anti-Spoofing Protocol: Customers cannot impersonate the overarching system
    if (user.role !== "admin" && sender === "admin") {
      return NextResponse.json({ error: "Forbidden: Cannot spoof admin messages" }, { status: 403 });
    }

    // Tenant Isolation
    const chatCollection = await getChatCollection();
    let chat;
    try {
      chat = await chatCollection.findOne({ _id: new ObjectId(chatId) });
    } catch {
      return NextResponse.json({ error: "Invalid Chat ObjectId structure" }, { status: 400 });
    }

    if (!chat) {
      return NextResponse.json({ error: "Chat document not found" }, { status: 404 });
    }

    if (user.role !== "admin" && chat.userId !== user._id.toString()) {
      return NextResponse.json({ error: "Forbidden: You do not own this chat document" }, { status: 403 });
    }

    // 3. Atomic Database Execution
    const newMessage: IMessage = {
      id: crypto.randomUUID(),
      sender,
      text,
      createdAt: new Date()
    };

    let newStatus = chat.status;
    let hasUnread = chat.hasUnread;

    // Mutate state correctly based on sender hierarchy
    if (sender === 'client') {
      hasUnread = true;
      if (chat.status === 'bot_active') {
        newStatus = 'waiting_admin';
      }
    } else if (sender === 'admin') {
      hasUnread = false;
      newStatus = 'admin_active';
    }

    // Run unified state updates entirely natively
    await chatCollection.updateOne(
      { _id: new ObjectId(chatId) },
      {
        $push: { messages: newMessage },
        $set: {
          status: newStatus,
          hasUnread,
          updatedAt: new Date()
        }
      }
    );

    // 4. Real-Time Broadcast Integration (Pusher Natively)
    await pusherServer.trigger(`private-chat-${chatId}`, 'new-message', newMessage);

    return NextResponse.json(newMessage, { status: 200 });

  } catch (error) {
    console.error("Failed to process message:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
