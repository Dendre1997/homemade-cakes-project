import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/db";
import { Collection } from "@/types";
import cloudinary from "@/lib/cloudinary";
import { slugify } from "@/lib/utils";

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);

    const collections = await db
      .collection("collections")
      .find({})
      .sort({ name: 1 })
      .toArray();

    return NextResponse.json(collections);
  } catch (error) {
    console.error("Error fetching collections:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name, description, imageUrl}: Partial<Collection> =
      await request.json();

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    
      const slug = slugify(name);

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);

    const newCollection = {
      name,
      description: description || "",
      imageUrl: imageUrl || "",
      slug: slug,
    };

    const result = await db.collection("collections").insertOne(newCollection);

    return NextResponse.json(
      { ...newCollection, _id: result.insertedId },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating collection:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
