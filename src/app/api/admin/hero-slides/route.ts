import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import clientPromise from "@/lib/db";
import { HeroSlide } from "@/types";


export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);
    const slides = await db.collection("hero_slides").find({}).toArray();

    return NextResponse.json(slides);
  } catch (error) {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: Partial<HeroSlide> = await request.json();
    const { title, imageUrl, subtitle, link, buttonText } = body;

    if (!title || !imageUrl) {
      return NextResponse.json(
        { error: "Title and Image are required" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);

    const newSlide = {
      title,
      imageUrl,
      subtitle: subtitle || "",
      link: link || "/products",
      buttonText: buttonText || "Order Now",
      createdAt: new Date(),
    };

    const result = await db.collection("hero_slides").insertOne(newSlide);

    revalidatePath("/", "page");

    return NextResponse.json(
      { message: "Slide created", _id: result.insertedId, ...newSlide },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating slide:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
