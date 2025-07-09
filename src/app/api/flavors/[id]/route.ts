import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/db';
import { ObjectId } from 'mongodb';

// GET
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);

    const flavor = await db.collection('flavors').findOne({
      _id: new ObjectId(id),
    });

    if (!flavor) {
      return NextResponse.json({ error: 'Flavor not found' }, { status: 404 });
    }

    return NextResponse.json(flavor, { status: 200 });
  } catch (error) {
    console.error('Error fetching flavor:', error);
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
    const { name, price, description } = await request.json();

    // Валідація
    if (!name || typeof price !== 'number') {
      return NextResponse.json(
        { error: 'Name and a valid price are required' },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);

    // Операція оновлення
    const result = await db.collection('flavors').updateOne(
      { _id: new ObjectId(id) }, // Фільтр: знаходимо документ за ID
      { $set: { name, price, description } } // Оператор $set: оновлюємо вказані поля
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'Flavor not found' }, { status: 404 });
    }

    return NextResponse.json(
      { message: 'Flavor updated successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error updating flavor:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}


// DELETE
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);
    
    const result = await db.collection('flavors').deleteOne({
      _id: new ObjectId(id),
    });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Flavor not found' }, { status: 404 });
    }

    return NextResponse.json(
      { message: 'Flavor deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting flavor:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}