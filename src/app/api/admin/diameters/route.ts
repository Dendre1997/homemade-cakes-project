import { verifyAdminAPI } from "@/lib/auth/adminOnly";
import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/db';
import { Diameter} from '@/types';
import { normalizeDiameterTierFields } from '@/lib/validation/diameterTierFields';


export async function POST(request: NextRequest) {
  const auth = await verifyAdminAPI();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
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
    }: Partial<Diameter> = body;

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

    const newDiameterData: Record<string, unknown> = {
      name,
      sizeValue,
      servings,
      illustration,
      imageUrl,
      categoryIds: categoryIds || [],
      shapeIds: shapeIds || [],
      tiersCount: tierFields.data.tiersCount,
    };
    
    if (basePrice !== undefined && basePrice !== null) {
      newDiameterData.basePrice = basePrice;
    }

    if (tierFields.data.tierSizes) {
      newDiameterData.tierSizes = tierFields.data.tierSizes;
    }

    const result = await db.collection('diameters').insertOne(newDiameterData);

    return NextResponse.json(
      {
        message: 'Diameter created successfully',
        diameterId: result.insertedId,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating diameter:', error);
    return NextResponse.json(
      { error: 'An error occurred while creating the diameter.' },
      { status: 500 }
    );
  }
}


export async function GET(request: NextRequest) {
  const auth = await verifyAdminAPI();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

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
