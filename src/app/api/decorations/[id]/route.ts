import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/db';
import { ObjectId } from 'mongodb';

// GET
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);

    const decoration = await db.collection('decorations').findOne({
      _id: new ObjectId(id),
    });

    if (!decoration) {
      return NextResponse.json(
        { error: 'Decoration not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(decoration, { status: 200 });
  } catch (error) {
    console.error('Error fetching decorations:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
