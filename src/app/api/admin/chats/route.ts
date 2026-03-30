import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminAuth } from "@/lib/firebase/adminApp";
import clientPromise from "@/lib/db";
import { getChatCollection } from "@/lib/api/chat";

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("session")?.value;

    if (!sessionCookie) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let decodedToken;
    try {
      decodedToken = await adminAuth.verifySessionCookie(sessionCookie, true);
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);
    const user = await db.collection("users").findOne({ firebaseUid: decodedToken.uid });

    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden: Admin access only" }, { status: 403 });
    }

    const chatCollection = await getChatCollection();
    
    // The User Identity Lookup Pipeline
    const activeChats = await chatCollection.aggregate([
      { 
        $match: { status: { $in: ['waiting_admin', 'admin_active'] } } 
      },
      { 
        $addFields: { userObjectId: { $toObjectId: "$userId" } } 
      },
      { 
        $lookup: {
          from: "users",
          localField: "userObjectId",
          foreignField: "_id",
          as: "userData"
        }
      },
      { 
        $unwind: { path: "$userData", preserveNullAndEmptyArrays: true } 
      },
      { 
        $sort: { hasUnread: -1, updatedAt: -1 } 
      }
    ]).toArray();

    return NextResponse.json(activeChats, { status: 200 });
  } catch (error) {
    console.error("Failed to fetch admin chats:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
