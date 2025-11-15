import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/db';
import { ObjectId } from 'mongodb';
import cloudinary from "@/lib/cloudinary";
import { getPublicIdFromUrl } from "@/lib/cloudinaryUtils";
interface Context {
    params: { id: string }
}


export async function GET(_request: Request, { params }: Context) {
  try {
    const { id } = params;
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);

    const products = await db
      .collection("products")
      .aggregate([
        { $match: { _id: new ObjectId(id) } },
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
  { params }: { params: { id: string } }
) {
  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB_NAME);
  try {
    const { id } = params;
    const body = await request.json();
    const collection = db.collection("products");

    const existingProduct = await collection.findOne({ _id: new ObjectId(id) });
    if (!existingProduct) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const oldImageUrls: string[] = existingProduct.imageUrls || [];
    const newImageUrls: string[] = body.imageUrls || [];
    const imagesToDelete = oldImageUrls.filter(
      (oldUrl) => !newImageUrls.includes(oldUrl)
    );

    if (body.categoryId) body.categoryId = new ObjectId(body.categoryId);
    if (body.availableFlavorIds)
      body.availableFlavorIds = body.availableFlavorIds.map(
        (id: string) => new ObjectId(id)
      );
    if (body.allergenIds)
      body.allergenIds = body.allergenIds.map((id: string) => new ObjectId(id));
    if (body.availableDiameterConfigs) {
      body.availableDiameterConfigs = body.availableDiameterConfigs.map(
        (config: any) => ({
          ...config,
          diameterId: new ObjectId(config.diameterId),
        })
      );
    }
    
    if (body.collectionIds) {
      body.collectionIds = body.collectionIds.map(
        (id: string) => new ObjectId(id)
      );
    }

    const result = await collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: body }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

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
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
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
