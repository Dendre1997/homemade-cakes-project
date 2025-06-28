import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/db';
import { ObjectId } from 'mongodb';

// DELETE
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);

    const result = await db.collection('decorations').deleteOne({
      _id: new ObjectId(id),
    });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Decoration not found' }, { status: 404 });
    }

    return NextResponse.json(
      { message: 'Decoration deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting decoration:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
