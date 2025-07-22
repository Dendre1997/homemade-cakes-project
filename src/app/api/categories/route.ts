import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/db';
import { ProductCategory } from '@/types';

// POST
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { name }: Partial<ProductCategory> = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 } // 400 - Bad Request
      );
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);

    const newCategoryData = {
      name,
    };

    const result = await db.collection('categories').insertOne(newCategoryData);

    return NextResponse.json(
      {
        message: 'New category created successfully',
        decorationId: result.insertedId,
      },
      { status: 201 } // 201 - Created
    );
  } catch (error) {
    console.error('Error creating category:', error);
    return NextResponse.json(
      { error: 'An error occurred while creating the category.' },
      { status: 500 } // 500 - Internal Server Error
    );
  }
}

// GET
export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);

    const categories = await db.collection('categories').find({}).toArray();

    return NextResponse.json(categories, { status: 200 }); // 200 - OK
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json(
      { error: 'An error occurred while fetching categories.' },
      { status: 500 }
    );
  }
}
