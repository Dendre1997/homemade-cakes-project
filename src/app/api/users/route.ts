import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/db";
import { User } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const { firebaseUid, email } = await request.json();

    // 2. Validation
    if (!firebaseUid || !email) {
      return NextResponse.json(
        { error: "Firebase UID and email are required" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);
    const usersCollection = db.collection<Omit<User, "_id">>("users");

    const existingUser = await usersCollection.findOne({ firebaseUid });
    if (existingUser) {
      return NextResponse.json(existingUser, { status: 200 });
      }
      
    const newUser: Omit<User, "_id"> = {
      firebaseUid,
      email,
      role: "customer",
    };

    const result = await usersCollection.insertOne(newUser);

    return NextResponse.json(
      { message: "User created in DB successfully", userId: result.insertedId },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating user in DB:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
