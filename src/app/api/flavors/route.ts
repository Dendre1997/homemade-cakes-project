// src/app/api/flavors/route.ts
import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/db';
import { Flavor } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { name, price, description }: Partial<Flavor> = body;

    if (!name || typeof price !== 'number') {
      return NextResponse.json(
        { error: 'Name and a valid price are required' },
        { status: 400 } // 400 - Bad Request
      );
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_URI);

    const newFlavorData = {
      name,
      price,
      description: description || '',
    };

    const result = await db.collection('flavors').insertOne(newFlavorData);

    // 5. Відправка успішної відповіді
    return NextResponse.json(
      { message: 'Flavor created successfully', flavorId: result.insertedId },
      { status: 201 } // 201 - Created
    );
  } catch (error) {
    console.error('Error creating flavor:', error);
    return NextResponse.json(
      { error: 'An error occurred while creating the flavor.' },
      { status: 500 } // 500 - Internal Server Error
    );
  }
}
