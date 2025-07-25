import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/db';
import { Diameter } from '@/types';

// POST
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { sizeValue, unit }: Partial<Diameter> = body;

    if (typeof sizeValue !== 'number' || !unit) {
      return NextResponse.json(
        { error: 'Valid sizeValue (number) and unit (string) are required' },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);

    const newDiameterData = {
      sizeValue,
      unit,
    };

    const result = await db.collection('diameters').insertOne(newDiameterData);

    return NextResponse.json(
      {
        message: 'Diameter created successfully',
        diameterId: result.insertedId,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating diameter:', error);
    return NextResponse.json(
      { error: 'An error occurred while creating the diameter.' },
      { status: 500 }
    );
  }
}

// GET
export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);

    const diameters = await db.collection('diameters').find({}).toArray();

    return NextResponse.json(diameters, { status: 200 });
  } catch (error) {
    console.error('Error fetching diameters:', error);
    return NextResponse.json(
      { error: 'An error occurred while fetching diameters.' },
      { status: 500 }
    );
  }
}
