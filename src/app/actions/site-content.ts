"use server";

import clientPromise from "@/lib/db";
import { VideoBannerContent } from "@/types";
import { revalidatePath } from "next/cache";

const COLLECTION_NAME = "site_content";
const BANNER_ID = "homepage-custom-cake-video";

export async function getVideoBanner(): Promise<VideoBannerContent | null> {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);
    const content = await db.collection(COLLECTION_NAME).findOne({ _id: BANNER_ID } as any);

    if (!content) return null;

    return {
      ...content,
      _id: content._id.toString(),
    } as unknown as VideoBannerContent;
  } catch (error) {
    console.error("Failed to get video banner:", error);
    return null;
  }
}

export async function saveVideoBanner(data: Partial<VideoBannerContent>) {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);

    const updateData = {
      ...data,
      updatedAt: new Date(),
    };

    await db.collection(COLLECTION_NAME).updateOne(
      { _id: BANNER_ID } as any,
      { $set: updateData },
      { upsert: true }
    );

    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Failed to save video banner:", error);
    return { success: false, error };
  }
}
