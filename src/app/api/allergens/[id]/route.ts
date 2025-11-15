import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/db';
import { ObjectId } from 'mongodb';
// import { Allergen } from '@/types';

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);
    const allergen = await db.collection('allergens').findOne({ _id: new ObjectId(id) });
    if (!allergen) {
      return NextResponse.json({ error: 'Allergen not found' }, { status: 404 });
    }
    return NextResponse.json(allergen);
  } catch (error) {
    console.error('Error fetching allergen:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

