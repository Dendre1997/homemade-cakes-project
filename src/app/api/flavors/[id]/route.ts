import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/db';
import { ObjectId } from 'mongodb';

interface Context {
  params: { id: string };
}

// GET a single flavor
export async function GET(_request: Request, { params }: Context) {
  try {
    const { id } = params;
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);
    const flavor = await db
      .collection('flavors')
      .findOne({ _id: new ObjectId(id) });
    if (!flavor) {
      return NextResponse.json({ error: 'Flavor not found' }, { status: 404 });
    }
    return NextResponse.json(flavor);
  } catch (error) {
    console.error('Error fetching flavor:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// PUT (Update) a flavor
export async function PUT(request: NextRequest, { params }: Context) {
  try {
    const { id } = params;
    const { name, price, description, categoryIds } = await request.json();
    if (!name || typeof price !== 'number') {
      return NextResponse.json(
        { error: 'Name and a valid price are required' },
        { status: 400 }
      );
    }
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);
    const result = await db
      .collection('flavors')
      .updateOne(
        { _id: new ObjectId(id) },
        {
          $set: {
            name,
            price,
            description: description || '',
            categoryIds: categoryIds || [],
          },
        }
      );
    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'Flavor not found' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Flavor updated successfully' });
  } catch (error) {
    console.error('Error updating flavor:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// DELETE a flavor
export async function DELETE(_request: Request, { params }: Context) {
  try {
    const { id } = params;
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);
    const result = await db
      .collection('flavors')
      .deleteOne({ _id: new ObjectId(id) });
    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Flavor not found' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Flavor deleted successfully' });
  } catch (error) {
    console.error('Error deleting flavor:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
