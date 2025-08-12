import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/db';
import { ObjectId } from 'mongodb';

// GET
export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);

    const diameter = await db.collection('diameters').findOne({
      _id: new ObjectId(id),
    });

    if (!diameter) {
      return NextResponse.json(
        { error: 'Diameter not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(diameter, { status: 200 });
  } catch (error) {
    console.error('Error fetching diameter:', error);
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
    const { name, sizeValue, categoryIds} = await request.json();

    if (!name || typeof sizeValue !== 'number') {
      return NextResponse.json(
        { error: 'Valid sizeValue (number) and unit (string) are required' },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);

    const result = await db
      .collection('diameters')
      .updateOne({ _id: new ObjectId(id) }, { $set: {name, sizeValue, categoryIds: categoryIds || [] } });

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: 'Diameter not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: 'Diameter updated successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error updating diameter:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
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

    const result = await db.collection('diameters').deleteOne({
      _id: new ObjectId(id),
    });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: 'Diameter not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: 'Diameter deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting diameter:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
