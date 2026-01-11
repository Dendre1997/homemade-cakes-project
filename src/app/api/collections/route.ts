import { NextResponse } from "next/server";
import { getActiveCollections } from "@/lib/data";

export async function GET() {
  try {
    const collections = await getActiveCollections();
    return NextResponse.json(collections);
  } catch (error) {
    console.error("Error fetching collections:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
