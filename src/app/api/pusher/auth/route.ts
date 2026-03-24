import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminAuth } from "@/lib/firebase/adminApp";
import clientPromise from "@/lib/db";
import { getChatCollection } from "@/lib/api/chat";
import { pusherServer } from "@/lib/pusher";
import { ObjectId } from "mongodb";

export async function POST(req: NextRequest) {
  try {
    // 1. Payload Parsing (URL-Encoded payload required by Pusher SDK)
    const data = await req.text();
    const params = new URLSearchParams(data);
    const socket_id = params.get("socket_id");
    const channel_name = params.get("channel_name");

    if (!socket_id || !channel_name) {
      return NextResponse.json({ error: "Missing socket_id or channel_name" }, { status: 400 });
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

    // Connect to DB to strictly fetch the internal mapped User role and _id
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);
    const user = await db.collection("users").findOne({ firebaseUid: decodedToken.uid });

    if (!user) {
      return NextResponse.json({ error: "User profile not found in database" }, { status: 403 });
    }

    // 3. Tenant Isolation & Ownership
    const chatId = channel_name.replace("private-chat-", "");

    // Admin Bypass -> Skip Ownership Query
    if (user.role !== "admin") {
      // Customer Security Query
      const chatCollection = await getChatCollection();
      
      let chat;
      try {
        chat = await chatCollection.findOne({ _id: new ObjectId(chatId) });
      } catch {
        return NextResponse.json({ error: "Invalid Chat ObjectId structure" }, { status: 403 });
      }

      if (!chat) {
        return NextResponse.json({ error: "Chat document not found" }, { status: 403 });
      }

      const userStringId = user._id.toString();

      // The True Defense: Block user from listening to a chat they do not own
      if (chat.userId !== userStringId) {
        return NextResponse.json({ error: "Forbidden: You do not own this chat document" }, { status: 403 });
      }
    }

    // 4. Dispense Cryptographic Signature
    const authResponse = pusherServer.authorizeChannel(socket_id, channel_name);

    return NextResponse.json(authResponse, { status: 200 });

  } catch (error) {
    console.error("Failed to authenticate Pusher socket:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
