import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/db';
import { Allergen } from '@/types';

// POST
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { name }: Partial<Allergen> = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 } // 400 - Bad Request
      );
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);

    const newAllergensData = {
      name
    };

    const result = await db
      .collection('allergens')
      .insertOne(newAllergensData);

    return NextResponse.json(
      {
        message: 'New allergen created successfully',
        decorationId: result.insertedId,
      },
      { status: 201 } // 201 - Created
    );
  } catch (error) {
    console.error('Error creating allergen:', error);
    return NextResponse.json(
      { error: 'An error occurred while creating the allergen.' },
      { status: 500 } // 500 - Internal Server Error
    );
  }
}

// GET
export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);

    const allergens = await db.collection('allergens').find({}).toArray();

    return NextResponse.json(allergens, { status: 200 }); // 200 - OK
  } catch (error) {
    console.error('Error fetching allergens:', error);
    return NextResponse.json(
      { error: 'An error occurred while fetching allergens.' },
      { status: 500 }
    );
  }
}
