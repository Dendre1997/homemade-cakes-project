import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/db";
import { Product } from "@/types";
import { ObjectId } from "mongodb";


export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const context = searchParams.get("context");
    const categoryId = searchParams.get("categoryId");
    const collectionId = searchParams.get("collectionId");

    const matchFilter: any = {};

    if (categoryId) {
      matchFilter.categoryId = new ObjectId(categoryId);
    }

    if (collectionId) {
      matchFilter.collectionIds = new ObjectId(collectionId);
    }

    if (context !== "admin") {
      matchFilter.isActive = true;
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);

    const products = await db
      .collection("products")
      .aggregate([
        {
          $match: matchFilter,
        },
        {
          $lookup: {
            from: "categories",
            localField: "categoryId",
            foreignField: "_id",
            as: "category",
          },
        },
        {
          $unwind: "$category",
        },
        {
          $sort: { createdAt: -1 },
        },
      ])
      .toArray();

    const productsWithStrings = products.map((product: any) => ({
      ...product,
      _id: product._id.toString(),
      categoryId: product.categoryId.toString(),
      collectionIds: (product.collectionIds || []).map((id: ObjectId) =>
        id.toString()
      ),
      availableFlavorIds: (product.availableFlavorIds || []).map(
        (id: ObjectId) => id.toString()
      ),
      allergenIds: (product.allergenIds || []).map((id: ObjectId) =>
        id.toString()
      ),
      availableDiameterConfigs: (product.availableDiameterConfigs || []).map(
        (config: any) => ({
          ...config,
          diameterId: config.diameterId.toString(),
        })
      ),
      category: {
        ...product.category,
        _id: product.category._id.toString(),
      },
    }));

    return NextResponse.json(productsWithStrings, { status: 200 });
  } catch (error) {
    console.error("Error fetching products:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
