import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/db";
import { Blog } from "@/types";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "9");
    const skip = (page - 1) * limit;

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);

    // Filter only active blogs for public API
    const query = { isActive: true };

    const total = await db.collection("blogs").countDocuments(query);
    const blogs = await db
      .collection<Blog>("blogs")
      .find(query)
      .sort({ publishedAt: -1 }) // Newest first
      .skip(skip)
      .limit(limit)
      .toArray();

    return NextResponse.json({
      data: blogs,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching blogs:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
