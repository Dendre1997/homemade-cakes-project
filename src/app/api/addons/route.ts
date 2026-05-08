import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/db';
import { Addon } from '@/types';


export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);

    const addons = await db.collection('addons').find({}).toArray();

    return NextResponse.json(addons, { status: 200 });
  } catch (error) {
    console.error('Error fetching addons:', error);
    return NextResponse.json(
      { error: 'An error occurred while fetching addons.' },
      { status: 500 }
    );
  }
}
