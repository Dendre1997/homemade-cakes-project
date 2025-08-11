import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/db';
import { Decoration } from '@/types';

// POST
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { name, price, imageUrl, categoryIds }: Partial<Decoration> = body;

    if (!name || typeof price !== 'number') {
      return NextResponse.json(
        { error: 'Name and a valid price are required' },
        { status: 400 } // 400 - Bad Request
      );
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);

    const newDecorationData = {
      name,
      price,
      imageUrl: imageUrl || '',
      categoryIds: categoryIds || [],
    };

    const result = await db.collection('decorations').insertOne(newDecorationData);

    return NextResponse.json(
      { message: 'Decoration created successfully', decorationId: result.insertedId },
      { status: 201 } // 201 - Created
    );
  } catch (error) {
    console.error('Error creating decoration:', error);
    return NextResponse.json(
      { error: 'An error occurred while creating the decoration.' },
      { status: 500 } // 500 - Internal Server Error
    );
  }
}

// GET
export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);

    const decorations = await db.collection('decorations').find({}).toArray();

    return NextResponse.json(decorations, { status: 200 }); // 200 - OK
  } catch (error) {
    console.error('Error fetching decorations:', error);
    return NextResponse.json(
      { error: 'An error occurred while fetching decorations.' },
      { status: 500 }
    );
  }
}
