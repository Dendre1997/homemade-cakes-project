import { NextResponse } from 'next/server';
import clientPromise from '@/lib/db';


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
