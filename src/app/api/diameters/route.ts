import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/db';
import { Diameter} from '@/types';


export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const categoryId = searchParams.get("categoryId");

    const filter: { categoryIds?: string } = {};

    if (categoryId) {
      filter.categoryIds = categoryId;
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);

    const diameters = await db.collection('diameters').find(filter).toArray();

    return NextResponse.json(diameters, { status: 200 });
  } catch (error) {
    console.error('Error fetching diameters:', error);
    return NextResponse.json(
      { error: 'An error occurred while fetching diameters.' },
      { status: 500 }
    );
  }
}
