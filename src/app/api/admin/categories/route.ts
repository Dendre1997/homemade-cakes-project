import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import clientPromise from "@/lib/db";
import { ProductCategory } from "@/types";
import { slugify } from "@/lib/utils";


export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { name, manufacturingTimeInMinutes, imageUrl }: Partial<ProductCategory> = body;

    if (!name) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }
    const slug = slugify(name);

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);

    const newCategoryData = {
      name,
      slug,
      manufacturingTimeInMinutes: Number(manufacturingTimeInMinutes) || 0,
      imageUrl: imageUrl || "",
    };

    const result = await db.collection("categories").insertOne(newCategoryData);

    revalidatePath("/", "page");

    return NextResponse.json(
      {
        message: "New category created successfully",
        categoryId: result.insertedId,
      },
      { status: 201 } 
    );
  } catch (error) {
    console.error("Error creating category:", error);
    return NextResponse.json(
      { error: "An error occurred while creating the category." },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);

    const categories = await db.collection("categories").find({}).toArray();

    return NextResponse.json(categories, { status: 200 }); 
  } catch (error) {
    console.error("Error fetching categories:", error);
    return NextResponse.json(
      { error: "An error occurred while fetching categories." },
      { status: 500 }
    );
  }
}
