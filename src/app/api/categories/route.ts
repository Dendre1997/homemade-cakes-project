import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/db';
import { ProductCategory } from '@/types';
import { slugify } from '@/lib/utils';

// GET
export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);

    const categories = await db.collection('categories').find({}).toArray();

    return NextResponse.json(categories, { status: 200 });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json(
      { error: 'An error occurred while fetching categories.' },
      { status: 500 }
    );
  }
}
