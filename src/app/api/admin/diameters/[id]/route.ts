import { verifyAdminAPI } from "@/lib/auth/adminOnly";
import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/db';
import { ObjectId } from 'mongodb';
import { normalizeDiameterTierFields } from '@/lib/validation/diameterTierFields';


export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdminAPI();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const { id } = await params;
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


export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdminAPI();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const { id } = await params;
    const body = await request.json();
    const {
      sizeValue,
      categoryIds,
      shapeIds,
      name,
      servings,
      illustration,
      imageUrl,
      basePrice,
      tiersCount,
      tierSizes,
    } = body;

    if (!name || typeof sizeValue !== "number" || !servings || !illustration) {
      return NextResponse.json(
        { error: "Valid sizeValue (number) and unit (string) are required" },
        { status: 400 }
      );
    }

    const tierFields = normalizeDiameterTierFields(tiersCount, tierSizes);
    if (!tierFields.ok) {
      return NextResponse.json({ error: tierFields.error }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);

    const updateDoc: {
      $set: Record<string, unknown>;
      $unset?: Record<string, "">;
    } = {
      $set: {
        name,
        sizeValue,
        servings,
        illustration,
        imageUrl,
        categoryIds: categoryIds || [],
        shapeIds: shapeIds || [],
        tiersCount: tierFields.data.tiersCount,
      },
    };

    if (basePrice !== undefined && basePrice !== null) {
      updateDoc.$set.basePrice = basePrice;
    } else {
      updateDoc.$unset = { basePrice: "" };
    }

    if (tierFields.data.tierSizes) {
      updateDoc.$set.tierSizes = tierFields.data.tierSizes;
    } else {
      updateDoc.$unset = { ...updateDoc.$unset, tierSizes: "" };
    }

    const result = await db.collection("diameters").updateOne(
      { _id: new ObjectId(id) },
      updateDoc
    );

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


export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdminAPI();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const { id } = await params;
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
