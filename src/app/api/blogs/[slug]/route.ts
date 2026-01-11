import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/db";
import { Blog } from "@/types";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> } 
) {
  try {
    const { slug } = await params;
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);

    const blog = await db.collection<Blog>("blogs").findOne({ 
      slug: slug,
      isActive: true 
    });

    if (!blog) {
      return NextResponse.json(
        { error: "Blog post not found" },
        { status: 404 }
      );
    }

    // Populate related products
    if (blog.relatedProductIds && blog.relatedProductIds.length > 0) {
      const { ObjectId } = require("mongodb");
      const pIds = blog.relatedProductIds.map((id) => new ObjectId(id));
      
      const products = await db.collection("products").aggregate([
        { $match: { _id: { $in: pIds }, isActive: true } },
        {
          $lookup: {
            from: "categories",
             let: { catId: "$categoryId" },
             pipeline: [
               { $match: { $expr: { $eq: ["$_id", { $toObjectId: "$$catId" }] } } }
             ],
            as: "category"
          }
        },
        { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } }
      ]).toArray();
      
      blog.relatedProducts = products as any;
    }

    return NextResponse.json(blog);
  } catch (error) {
    console.error("Error fetching blog:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
