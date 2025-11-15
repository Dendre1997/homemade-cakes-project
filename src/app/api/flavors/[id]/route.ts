import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/db';
import { ObjectId } from 'mongodb';
import cloudinary from "@/lib/cloudinary";
import { getPublicIdFromUrl } from "@/lib/cloudinaryUtils";
interface Context {
  params: { id: string };
}


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