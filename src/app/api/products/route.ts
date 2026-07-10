import { NextRequest, NextResponse } from "next/server";
import { getProducts } from "@/lib/db/products";

// GET
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const context = searchParams.get("context");
    const categoryId = searchParams.get("categoryId");
    const collectionId = searchParams.get("collectionId");
    const seasonalEventId = searchParams.get("seasonalEventId");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "100");

    const { products, totalCount } = await getProducts({
      context: context ?? undefined,
      categoryId: categoryId ?? undefined,
      collectionId: collectionId ?? undefined,
      seasonalEventId: seasonalEventId ?? undefined,
      search: search ?? undefined,
      page,
      limit,
    });

    return NextResponse.json({ products, totalCount }, { status: 200 });
  } catch (error) {
    console.error("Error fetching products:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
