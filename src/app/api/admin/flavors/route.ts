import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/db';
import { Flavor } from '@/types';

// POST
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { name, price, description, categoryIds, imageUrl }: Partial<Flavor> =
      body;

    if (!name || typeof price !== 'number') {
      return NextResponse.json(
        { error: 'Name and a valid price are required' },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);

    const newFlavorData = {
      name,
      price,
      description: description || "",
      categoryIds: categoryIds || [],
      imageUrl: imageUrl || "",
    };

    const result = await db.collection('flavors').insertOne(newFlavorData);
      
      return NextResponse.json(
      { message: 'Flavor created successfully', flavorId: result.insertedId },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating flavor:', error);
    return NextResponse.json(
      { error: 'An error occurred while creating the flavor.' },
      { status: 500 }
    );
  }
}


export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const categoryId = searchParams.get('categoryId')
    
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);

    const filter: { categoryIds?: string } = {};
    
    if (categoryId) {
      filter.categoryIds = categoryId;
    }
    const flavors = await db.collection('flavors').find(filter).toArray();
    
    return NextResponse.json(flavors, { status: 200 });
  } catch (error) {
    console.error('Error fetching flavors:', error);
    return NextResponse.json(
      { error: 'An error occurred while fetching flavors.' },
      { status: 500 }
    );
  }
}

