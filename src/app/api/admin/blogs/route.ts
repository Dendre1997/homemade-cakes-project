import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import clientPromise from "@/lib/db";
import { Blog } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { title, slug, content, imageUrl, isActive, publishedAt } = data;

    if (!title || !slug || !content) {
      return NextResponse.json(
        { error: "Title, slug, and content are required." },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);

    // Check slug uniqueness
    const existing = await db.collection("blogs").findOne({ slug });
    if (existing) {
      return NextResponse.json(
        { error: "Slug already exists. Please choose another one." },
        { status: 409 }
      );
    }

    const newBlog: Omit<Blog, "_id"> = {
      title,
      slug,
      content,
      imageUrl: imageUrl || "",
      isActive: isActive || false,
      publishedAt: publishedAt ? new Date(publishedAt) : new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      relatedProductIds: data.relatedProductIds || [],
    };

    const result = await db.collection("blogs").insertOne(newBlog);

    revalidatePath("/", "page");

    return NextResponse.json(
      { message: "Blog created successfully", id: result.insertedId },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating blog:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
