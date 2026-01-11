import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import clientPromise from "@/lib/db";
import { ObjectId } from "mongodb";
import cloudinary from "@/lib/cloudinary";
import { slugify } from "@/lib/utils";
import { getPublicIdFromUrl } from '@/lib/cloudinaryUtils'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);

    const seasonalEvent = await db
      .collection("seasonals")
      .findOne({ _id: new ObjectId(id) });

    if (!seasonalEvent) {
      return NextResponse.json(
        { error: "Seasonal event not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(seasonalEvent);
  } catch (error) {
    console.error("Error fetching seasonal event:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}


export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const {
      name,
      description,
      heroBannerUrl,
      themeColor,
      startDate,
      endDate,
      isActive,
      selectedProductIds,
    } = body;

    if (!name)
      return NextResponse.json({ error: "Name is required" }, { status: 400 });

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);
    const seasonalsCollection = db.collection("seasonals");
    const productsCollection = db.collection("products");
    const seasonalObjectId = new ObjectId(id);

    const existingEvent = await seasonalsCollection.findOne({
      _id: seasonalObjectId,
    });
    if (!existingEvent)
      return NextResponse.json({ error: "Event not found" }, { status: 404 });

    const oldBannerUrl = existingEvent.heroBannerUrl;
    let finalBannerUrl = oldBannerUrl;

    if (heroBannerUrl === "") {
      if (oldBannerUrl) {
        const publicId = getPublicIdFromUrl(oldBannerUrl);
        if (publicId)
          cloudinary.uploader.destroy(publicId, { invalidate: true });
      }
      finalBannerUrl = "";
    } else if (heroBannerUrl && heroBannerUrl !== oldBannerUrl) {
      if (oldBannerUrl) {
        const publicId = getPublicIdFromUrl(oldBannerUrl);
        if (publicId)
          cloudinary.uploader.destroy(publicId, { invalidate: true });
      }
      finalBannerUrl = heroBannerUrl;
    }

    await seasonalsCollection.updateOne(
      { _id: seasonalObjectId },
      {
        $set: {
          name,
          slug: slugify(name),
          description: description || "",
          heroBannerUrl: finalBannerUrl,
          themeColor: themeColor || "#000000",
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          isActive: isActive,
        },
      }
    );

    if (selectedProductIds && Array.isArray(selectedProductIds)) {
      const productObjectIds = selectedProductIds.map(
        (pid: string) => new ObjectId(pid)
      );

      await productsCollection.updateMany(
        {
          seasonalEventIds: seasonalObjectId,
          _id: { $nin: productObjectIds },
        },
        { $pull: { seasonalEventIds: seasonalObjectId } } as any
      );
      
      await productsCollection.updateMany(
        { _id: { $in: productObjectIds } },
        { $addToSet: { seasonalEventIds: seasonalObjectId } } 
      );
    }

    revalidatePath("/", "page");

    return NextResponse.json({
      message: "Seasonal event and products updated",
    });
  } catch (error) {
    console.error("Error updating seasonal event:", error);
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
    const collection = db.collection("seasonals");

    const existingEvent = await collection.findOne({ _id: new ObjectId(id) });
    if (!existingEvent)
      return NextResponse.json({ error: "Not found" }, { status: 404 });

    await collection.deleteOne({ _id: new ObjectId(id) });

    if (existingEvent.heroBannerUrl) {
      const publicId = getPublicIdFromUrl(existingEvent.heroBannerUrl);
      if (publicId) cloudinary.uploader.destroy(publicId, { invalidate: true });
    }

    revalidatePath("/", "page");

    return NextResponse.json({ message: "Deleted successfully" });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
