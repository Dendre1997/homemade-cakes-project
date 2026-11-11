import { verifyAdminAPI } from "@/lib/auth/adminOnly";
import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from "next/cache";
import { revalidateLayoutData } from "@/lib/cache/layoutData";
import clientPromise from '@/lib/db';
import { Product } from '@/types'; 
import { ObjectId } from 'mongodb';
import { generateSlug } from '../../../../lib/utils';
import { normalizeProductSetConfigs } from '@/lib/validation/productSetConfigs';
import { defaultSetBoxPrice } from '@/lib/sets/setLinePrice';

// GET
export async function GET(request: NextRequest) {
  const auth = await verifyAdminAPI();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const searchParams = request.nextUrl.searchParams;
    const context = searchParams.get('context')
    const categoryId = searchParams.get("categoryId");

    const matchFilter: { isActive?: boolean; categoryId?: ObjectId } = {};

    if (categoryId) {
      matchFilter.categoryId = new ObjectId(categoryId);
    }

    if (context !== 'admin') {
      matchFilter.isActive = true
    }
    
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);

    const products = await db
      .collection("products")
      .aggregate([
        {
          $match:  matchFilter ,
        },
        {
          $lookup: {
            from: "categories",
            localField: "categoryId",
            foreignField: "_id",
            as: "category",
          },
        },
        {
          $unwind: "$category",
        },
      ])
      .toArray();

    return NextResponse.json(products, { status: 200 });
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// POST
export async function POST(request: NextRequest) {
  const auth = await verifyAdminAPI();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const body: Partial<Product> = await request.json();

    let {
      name,
      description,
      imageUrls,
      categoryId,
      structureBasePrice,
      availableFlavorIds,
      availableDiameterConfigs,
      allergenIds,
      isActive,
      inscriptionSettings,
      collectionIds,
      // New Fields
      productType,
      availableQuantityConfigs,
      comboConfig,
      defaultAddons
    } = body;

    if (!name || !categoryId) {
      return NextResponse.json(
        { error: 'Name and a valid base price are required' },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);

    const setConfigs = await normalizeProductSetConfigs(
      db,
      productType === 'set' ? body.availableSetConfigs : [],
      categoryId
    );
    if (!setConfigs.ok) {
      return NextResponse.json({ error: setConfigs.error }, { status: 400 });
    }

    // RULE: Auto-set Base Price for Sets
    let finalPrice = Number(structureBasePrice) || 0;

    if (productType === 'set') {
        const firstBoxPrice = defaultSetBoxPrice({
          availableQuantityConfigs,
          availableSetConfigs: setConfigs.data,
        });

        if (comboConfig && comboConfig.hasCake) {
             // Combo Set: Base Price = Input (Cake) + first set or box price
             finalPrice = finalPrice + firstBoxPrice;
        } else {
             // Simple Set: Base Price = first set or box price
             finalPrice = firstBoxPrice;
        }
    }
    structureBasePrice = finalPrice;
    
    // Process Combo Config IDs if present
    const processedComboConfig = comboConfig ? {
        ...comboConfig,
        cakeFlavorIds: comboConfig.cakeFlavorIds?.map((id: string) => new ObjectId(id)) || [],
        cakeDiameterIds: comboConfig.cakeDiameterIds?.map((id: string) => new ObjectId(id)) || [],
    } : null;

    const newProduct = {
      name,
      description: description || "",
      categoryId: new ObjectId(categoryId),
      imageUrls: imageUrls || [],
      structureBasePrice,
      availableFlavorIds:
        availableFlavorIds?.map((id) => new ObjectId(id)) || [],
      allergenIds: allergenIds?.map((id) => new ObjectId(id)) || [],
      availableDiameterConfigs:
        availableDiameterConfigs?.map((config) => ({
          ...config,
          diameterId: new ObjectId(config.diameterId),
        })) || [],
      isActive: isActive === true,
      inscriptionSettings: inscriptionSettings || {
        isAvailable: false,
        price: 0,
        maxLength: 0,
      },
      collectionIds: collectionIds?.map((id) => new ObjectId(id)) || [],
      
      // New Fields Logic
      productType: productType || 'cake',
      availableQuantityConfigs: availableQuantityConfigs || [],
      availableSetConfigs: setConfigs.data,
      comboConfig: processedComboConfig,
      defaultAddons: defaultAddons?.map((da) => ({
          addonId: new ObjectId(String(da.addonId)),
          variantId: new ObjectId(String(da.variantId))
      })) || [],
    };
    
    // SLUG GENERATION
    let slug = generateSlug(name);
    let counter = 0;
    let isUnique = false;
    
    while (!isUnique) {
        const existing = await db.collection("products").findOne({ slug: slug });
        if (!existing) {
            isUnique = true;
        } else {
            counter++;
            slug = `${generateSlug(name)}-${counter}`;
        }
    }
    
    const productToInsert = {
        ...newProduct,
        slug
    };

    const result = await db.collection('products').insertOne(productToInsert);

    revalidatePath("/", "page");
    revalidateLayoutData();

    return NextResponse.json(
      { message: 'Product created successfully', productId: result.insertedId },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating product:', error);
    return NextResponse.json(
      { error: 'An error occurred while creating the product.' },
      { status: 500 }
    );
  }
}
