import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/db';
import { Flavor } from '@/types';


export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const categoryId = searchParams.get('categoryId')
    
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);

    const filter: { categoryIds?: string } = {};
    
    if (categoryId) {
      filter.categoryIds = categoryId;
    }
    const flavors = await db.collection('flavors').find(filter).toArray();
    
    return NextResponse.json(flavors, { status: 200 }); // 200 - OK
  } catch (error) {
    console.error('Error fetching flavors:', error);
    return NextResponse.json(
      { error: 'An error occurred while fetching flavors.' },
      { status: 500 }
    );
  }
}
