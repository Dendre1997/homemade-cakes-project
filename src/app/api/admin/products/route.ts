import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/db';
import { Product } from '@/types'; 
import { ObjectId } from 'mongodb';

// GET
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const context = searchParams.get('context')
    const categoryId = searchParams.get("categoryId");

    const matchFilter: { isActive?: boolean; categoryId?: ObjectId } = {};

    if (categoryId) {
      matchFilter.categoryId = new ObjectId(categoryId);
    }

    if (context !== 'admin') {
      matchFilter.isActive = true
    }
    
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);

    const products = await db
      .collection("products")
      .aggregate([
        {
          $match:  matchFilter ,
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
      ])
      .toArray();

    return NextResponse.json(products, { status: 200 });
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// POST
export async function POST(request: NextRequest) {
  try {
    const body: Partial<Product> = await request.json();

    const {
      name,
      description,
      imageUrls,
      categoryId,
      structureBasePrice,
      availableFlavorIds,
      availableDiameterConfigs,
      allergenIds,
      isActive,
      inscriptionSettings,
      collectionIds
    } = body;

    if (!name || typeof structureBasePrice !== 'number' ||  !categoryId) {
      return NextResponse.json(
        { error: 'Name and a valid base price are required' },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);
    
    const newProduct = {
      name,
      description: description || "",
      categoryId: new ObjectId(categoryId),
      imageUrls: imageUrls || [],
      structureBasePrice,
      availableFlavorIds:
        availableFlavorIds?.map((id) => new ObjectId(id)) || [],
      allergenIds: allergenIds?.map((id) => new ObjectId(id)) || [],
      availableDiameterConfigs:
        availableDiameterConfigs?.map((config) => ({
          ...config,
          diameterId: new ObjectId(config.diameterId),
        })) || [],
      isActive: isActive === true,
      inscriptionSettings: inscriptionSettings || {
        isAvailable: false,
        price: 0,
        maxLength: 0,
      },
      collectionIds: collectionIds?.map((id) => new ObjectId(id)) || [],
    };

    const result = await db.collection('products').insertOne(newProduct);

    return NextResponse.json(
      { message: 'Product created successfully', productId: result.insertedId },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating product:', error);
    return NextResponse.json(
      { error: 'An error occurred while creating the product.' },
      { status: 500 }
    );
  }
}
