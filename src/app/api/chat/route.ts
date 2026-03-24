import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminAuth } from "@/lib/firebase/adminApp";
import clientPromise from "@/lib/db";
import { getChatCollection, createInitialChat } from "@/lib/api/chat";
import { ObjectId } from "mongodb";

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("session")?.value;
    if (!sessionCookie) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let decodedToken;
    try {
      decodedToken = await adminAuth.verifySessionCookie(sessionCookie, true);
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);
    const user = await db.collection("users").findOne({ firebaseUid: decodedToken.uid });

    if (!user) return NextResponse.json({ error: "User profile not found in database" }, { status: 401 });

    const chatCollection = await getChatCollection();
    const userChats = await chatCollection
      .find({ 
        userId: user._id.toString(),
        status: { $ne: 'resolved' }
      })
      .sort({ updatedAt: -1 })
      .toArray();

    return NextResponse.json(userChats, { status: 200 });
  } catch (error) {
    console.error("Failed to fetch chats:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("session")?.value;
    
    if (!sessionCookie) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let decodedToken;
    try {
      decodedToken = await adminAuth.verifySessionCookie(sessionCookie, true);
    } catch (error) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);
    const user = await db.collection("users").findOne({ firebaseUid: decodedToken.uid });

    if (!user) {
      return NextResponse.json({ error: "User profile not found in database" }, { status: 401 });
    }

    const userId = user._id.toString();

    const chatCollection = await getChatCollection();
    
    // Limits User to 3 concurrent active tickets
    const activeChatsCount = await chatCollection.countDocuments({
      userId: userId,
      status: { $in: ['bot_active', 'waiting_admin', 'admin_active'] }
    });

    if (activeChatsCount >= 3) {
      return NextResponse.json(
        { error: "Limit Reached: You may only have 3 active support inquiries at once." },
        { status: 429 }
      );
    }

    const newChatDocument = createInitialChat(userId);
    const insertResult = await chatCollection.insertOne(newChatDocument as any);

    return NextResponse.json(
      { message: "New chat instantiated", chatId: insertResult.insertedId.toString() },
      { status: 201 }
    );

  } catch (error) {
    console.error("Failed to initialize chat:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { chatId, status } = body;

    if (!chatId || status !== 'resolved') {
      return NextResponse.json({ error: "Invalid payload parameters" }, { status: 400 });
    }

    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("session")?.value;
    
    if (!sessionCookie) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let decodedToken;
    try {
      decodedToken = await adminAuth.verifySessionCookie(sessionCookie, true);
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);
    const user = await db.collection("users").findOne({ firebaseUid: decodedToken.uid });

    if (!user) return NextResponse.json({ error: "User profile not found in database" }, { status: 401 });

    const chatCollection = await getChatCollection();
    let chat;
    try {
      chat = await chatCollection.findOne({ _id: new ObjectId(chatId) });
    } catch {
      return NextResponse.json({ error: "Invalid Chat ObjectId structure" }, { status: 400 });
    }

    if (!chat) return NextResponse.json({ error: "Chat not found" }, { status: 404 });

    // Owner Lock: Standard customers cannot close other customers' tickets!
    if (chat.userId !== user._id.toString() && user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden: You do not own this chat" }, { status: 403 });
    }

    await chatCollection.updateOne(
      { _id: new ObjectId(chatId) },
      { $set: { status: 'resolved', updatedAt: new Date() } }
    );

    return NextResponse.json({ message: "Chat successfully resolved" }, { status: 200 });
  } catch (error) {
    console.error("Failed to update chat status:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
