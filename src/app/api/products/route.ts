import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/db';
import { Product } from '@/types'; // Імпортуємо наш головний тип

// POST
export async function POST(request: NextRequest) {
  try {
    const body: Partial<Product> = await request.json();

    // Destructing all expecting data from body request
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
    } = body;

    if (!name || typeof structureBasePrice !== 'number' ||  !categoryId) {
      return NextResponse.json(
        { error: 'Name and a valid base price are required' },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);

    // Form object for saving to the database
    const newProduct = {
      name,
      description: description || '',
      categoryId,
      imageUrls: imageUrls || [],
      structureBasePrice,
      availableFlavorIds: availableFlavorIds || [],
      availableDiameterConfigs: availableDiameterConfigs || [],
      allergenIds: allergenIds || [],
      isActive: isActive === true, // make sure what that's boolean
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
