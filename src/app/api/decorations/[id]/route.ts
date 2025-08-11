import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/db';
import { ObjectId } from 'mongodb';

// GET
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id;
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

// PUT
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    const { name, price, imageUrl, categoryIds } = await request.json();

    if (!name || typeof price !== 'number') {
      return NextResponse.json(
        { error: 'Name and a valid price are required' },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);

    const result = await db
      .collection('decorations')
      .updateOne(
        { _id: new ObjectId(id) },
        { $set: { name, price, imageUrl: imageUrl || '', categoryIds: categoryIds || [] } }
      );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: 'Decoration not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: 'Decoration updated successfully' },
      { status: 200 }
    );
  } catch (err) {
    return NextResponse.json(
      { error: 'Internal Server Error', err },
      { status: 500 }
    );
  }
}
// DELETE
export async function DELETE(
  _request: Request,
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
      return NextResponse.json(
        { error: 'Decoration not found' },
        { status: 404 }
      );
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
