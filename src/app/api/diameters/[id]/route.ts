import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/db';
import { ObjectId } from 'mongodb';

// GET
export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);

    const diameter = await db.collection('diameters').findOne({
      _id: new ObjectId(id),
    });

    if (!diameter) {
      return NextResponse.json(
        { error: 'Diameter not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(diameter, { status: 200 });
  } catch (error) {
    console.error('Error fetching diameter:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
