// src/app/api/test-db/route.ts
import { NextResponse } from 'next/server';
import clientPromise from '@/lib/db'; // Імпортуємо наш 'помічник'

export async function GET() {
  try {
    const client = await clientPromise;

    await client.db('admin').command({ ping: 1 });

    console.log(
      'Pinged your deployment. You successfully connected to MongoDB!'
    );

    return NextResponse.json({ message: 'Successfully connected to MongoDB!' });
  } catch (e) {
    console.error(e);

    return NextResponse.json(
      { error: 'Failed to connect to the database.' },
      { status: 500 } // Статус 500 означає "внутрішня помилка сервера"
    );
  }
}
