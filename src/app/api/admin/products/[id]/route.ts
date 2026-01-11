import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from "next/cache";
import clientPromise from '@/lib/db';
import { ObjectId } from 'mongodb';
import cloudinary from "@/lib/cloudinary";
import { getPublicIdFromUrl } from "@/lib/cloudinaryUtils";
import { generateSlug, isValidObjectId } from '../../../../../lib/utils';
interface Context {
    params: Promise<{ id: string }>
}


export async function GET(_request: Request, { params }: Context) {
  try {
    const { id } = await params;
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);
    
    const query = isValidObjectId(id) ? { _id: new ObjectId(id) } : { slug: id };

    const products = await db
      .collection("products")
      .aggregate([
        { $match: query },
        {
          $lookup: {
            from: "categories",
            localField: "categoryId",
            foreignField: "_id",
            as: "category",
          },
        },
        {
          $lookup: {
            from: "flavors",
            localField: "availableFlavorIds",
            foreignField: '_id',
            as: 'availableFlavors'
          }
        },
        {
          $lookup: {
            from: 'diameters',
            localField: 'availableDiameterConfigs.diameterId',
            foreignField: '_id',
            as: 'availableDiameters'
          }
        },
        {
          $lookup: {
            from: 'collections',
            localField: 'collectionIds',
            foreignField: '_id',
            as: 'collections'
          }
        },
         {
          $lookup: {
            from: 'seasonals',
            localField: 'seasonalEventIds',
            foreignField: '_id',
            as: 'seasonalEvents'
          }
        },
        { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } },
      ])
      .toArray();

    if (products.length === 0) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json(products[0]);
  } catch (error) {
    console.error('Error fetching product:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}


export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB_NAME);

  try {
    const { id } = await params;
    const body = await request.json();
    const collection = db.collection("products");

    const existingProduct = await collection.findOne({ _id: new ObjectId(id) });
    if (!existingProduct) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    if (body.imageUrls !== undefined) {
      const oldImageUrls: string[] = existingProduct.imageUrls || [];
      const newImageUrls: string[] = body.imageUrls;
      const imagesToDelete = oldImageUrls.filter(
        (oldUrl) => !newImageUrls.includes(oldUrl)
      );

      if (imagesToDelete.length > 0) {
        const publicIds = imagesToDelete
          .map(getPublicIdFromUrl)
          .filter((id) => id !== null) as string[];

        if (publicIds.length > 0) {
          cloudinary.api
            .delete_resources(publicIds, { invalidate: true })
            .then((result) => console.log("Deleted old images:", result))
            .catch((err) =>
              console.error("Error deleting old images from Cloudinary:", err)
            );
        }
      }
    }

    // RULE: Auto-set Base Price for Sets
    // Determine Effective State
    const effectiveProductType = body.productType || existingProduct.productType;
    const effectiveComboConfig = body.comboConfig !== undefined ? body.comboConfig : existingProduct.comboConfig;
    const effectiveQtyConfigs = body.availableQuantityConfigs !== undefined ? body.availableQuantityConfigs : existingProduct.availableQuantityConfigs;
    
    // Only recalculate if it's a Set
    if (effectiveProductType === 'set') {
         
         if (body.structureBasePrice !== undefined) {
             let userInputPrice = Number(body.structureBasePrice) || 0;
             const firstBoxPrice = (effectiveQtyConfigs && effectiveQtyConfigs.length > 0) 
                ? Number(effectiveQtyConfigs[0].price) || 0 
                : 0;
             
             if (effectiveComboConfig && effectiveComboConfig.hasCake) {
                 // Combo: Input + Box
                 body.structureBasePrice = userInputPrice + firstBoxPrice;
             } else {
                 // Simple: Box only
                 body.structureBasePrice = firstBoxPrice;
             }
         }
    }

    if (body.categoryId) body.categoryId = new ObjectId(String(body.categoryId));
    if (body.availableFlavorIds) {
      body.availableFlavorIds = body.availableFlavorIds.map(
        (id: string) => new ObjectId(id)
      );
    }
    if (body.allergenIds) {
      body.allergenIds = body.allergenIds.map((id: string) => new ObjectId(id));
    }
    if (body.availableDiameterConfigs) {
      body.availableDiameterConfigs = body.availableDiameterConfigs.map(
        (config: any) => ({
          ...config,
          diameterId: new ObjectId(String(config.diameterId)),
        })
      );
    }
    if (body.collectionIds) {
      body.collectionIds = body.collectionIds.map(
        (id: string) => new ObjectId(id)
      );
    }
    
    // Convert Combo Config IDs if present
    if (body.comboConfig) {
        if (body.comboConfig.cakeFlavorIds) {
            body.comboConfig.cakeFlavorIds = body.comboConfig.cakeFlavorIds.map(
                (id: string) => new ObjectId(id)
            );
        }
        if (body.comboConfig.cakeDiameterIds) {
            body.comboConfig.cakeDiameterIds = body.comboConfig.cakeDiameterIds.map(
                (id: string) => new ObjectId(id)
            );
        }
    }

    // SLUG LOGIC (Immutable by default)
    // If body contains a slug, we use it (Manual Override).
    // If body does NOT contain a slug, we do NOT regenerate it, even if name changes.
    // However, we must ensure uniqueness if it IS provided.
    if (body.slug) {
         let slug = body.slug;
         // Normalize
         slug = generateSlug(slug);
         
         const existing = await collection.findOne({ slug: slug, _id: { $ne: new ObjectId(id) } });
         if (existing) {
             return NextResponse.json({ error: "Slug already currently in use" }, { status: 409 });
         }
         body.slug = slug;
    }

    const result = await collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: body }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    revalidatePath("/", "page");
    return NextResponse.json({ message: "Product updated successfully" });
  } catch (error) {
    console.error("Error updating product:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}



export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);
    const productsCollection = db.collection("products");

    const productToDelete = await productsCollection.findOne({
      _id: new ObjectId(id),
    });

    if (!productToDelete) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const publicIds = productToDelete.imageUrls
      .map(getPublicIdFromUrl)
      .filter(
        (publicId: string | null): publicId is string => publicId !== null
      );

    if (publicIds.length > 0) {
      await cloudinary.api.delete_resources(publicIds);
    }

    const result = await productsCollection.deleteOne({
      _id: new ObjectId(id),
    });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: "Product not found during deletion" },
        { status: 404 }
      );
    }

    revalidatePath("/", "page");

    return NextResponse.json({
      message: "Product and associated images deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting product:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
