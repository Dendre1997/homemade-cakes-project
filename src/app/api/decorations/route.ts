import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/db';
import { Decoration } from '@/types';


export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);

    const decorations = await db.collection('decorations').find({}).toArray();

    return NextResponse.json(decorations, { status: 200 });
  } catch (error) {
    console.error('Error fetching decorations:', error);
    return NextResponse.json(
      { error: 'An error occurred while fetching decorations.' },
      { status: 500 }
    );
  }
}
