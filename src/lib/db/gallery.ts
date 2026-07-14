import { ObjectId } from "mongodb";
import { getGalleryCollection } from "@/lib/db";
import { getCollectionBySlug } from "@/lib/db/collections";
import { withMongoRetry } from "@/lib/db/withMongoRetry";
import {
  GALLERY_OTHER_COLLECTION_DESCRIPTION,
  GALLERY_OTHER_COLLECTION_ID,
  GALLERY_OTHER_COLLECTION_NAME,
  GALLERY_OTHER_COLLECTION_SLUG,
} from "@/lib/gallery/constants";
import { isValidObjectId } from "@/lib/utils";
import { GalleryCollectionCard, IGalleryImage } from "@/types";

export {
  GALLERY_OTHER_COLLECTION_DESCRIPTION,
  GALLERY_OTHER_COLLECTION_ID,
  GALLERY_OTHER_COLLECTION_NAME,
  GALLERY_OTHER_COLLECTION_SLUG,
} from "@/lib/gallery/constants";

const HAS_COLLECTION_IDS_EXPR = {
  $gt: [{ $size: { $ifNull: ["$collectionIds", []] } }, 0],
} as const;

const NO_COLLECTION_IDS_EXPR = {
  $eq: [{ $size: { $ifNull: ["$collectionIds", []] } }, 0],
} as const;

function buildActiveGalleryMatch(categoryId?: string): Record<string, unknown> {
  const match: Record<string, unknown> = { isActive: true };

  if (categoryId) {
    match.categories = {
      $in: [categoryId, new ObjectId(categoryId)],
    };
  }

  return match;
}

function serializeGalleryImage(image: IGalleryImage): IGalleryImage {
  return JSON.parse(JSON.stringify(image)) as IGalleryImage;
}

function isOtherCollectionIdentifier(value: string): boolean {
  return (
    value === GALLERY_OTHER_COLLECTION_SLUG ||
    value === GALLERY_OTHER_COLLECTION_ID
  );
}

interface AggregatedCollectionCard {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  latestImageUrl: string;
  latestImageId: ObjectId | string;
  imageCount: number;
}

/**
 * Returns gallery collection cards with the latest active image as cover.
 * Includes a virtual "Other Custom Designs" card for uncategorized images.
 */
export async function getGalleryCollectionsWithCovers(
  categoryId?: string
): Promise<GalleryCollectionCard[]> {
  return withMongoRetry(async () => {
    const galleryCollection = await getGalleryCollection();
    const baseMatch = buildActiveGalleryMatch(categoryId);

    const [result] = await galleryCollection
      .aggregate<{ withCollection: AggregatedCollectionCard[]; withoutCollection: AggregatedCollectionCard[] }>([
        { $match: baseMatch },
        {
          $facet: {
            withCollection: [
              { $match: { $expr: HAS_COLLECTION_IDS_EXPR } },
              { $sort: { createdAt: -1 } },
              { $unwind: "$collectionIds" },
              {
                $addFields: {
                  collectionIdStr: { $toString: "$collectionIds" },
                },
              },
              {
                $group: {
                  _id: "$collectionIdStr",
                  latestImageUrl: { $first: "$imageUrl" },
                  latestImageId: { $first: "$_id" },
                  imageCount: { $sum: 1 },
                },
              },
              {
                $lookup: {
                  from: "collections",
                  let: { collectionIdStr: "$_id" },
                  pipeline: [
                    {
                      $match: {
                        $expr: {
                          $eq: [{ $toString: "$_id" }, "$$collectionIdStr"],
                        },
                      },
                    },
                  ],
                  as: "collection",
                },
              },
              { $unwind: "$collection" },
              {
                $project: {
                  _id: { $toString: "$collection._id" },
                  name: "$collection.name",
                  slug: "$collection.slug",
                  description: "$collection.description",
                  latestImageUrl: 1,
                  latestImageId: 1,
                  imageCount: 1,
                },
              },
            ],
            withoutCollection: [
              { $match: { $expr: NO_COLLECTION_IDS_EXPR } },
              { $sort: { createdAt: -1 } },
              {
                $group: {
                  _id: null,
                  latestImageUrl: { $first: "$imageUrl" },
                  latestImageId: { $first: "$_id" },
                  imageCount: { $sum: 1 },
                },
              },
              {
                $project: {
                  _id: GALLERY_OTHER_COLLECTION_ID,
                  name: GALLERY_OTHER_COLLECTION_NAME,
                  slug: GALLERY_OTHER_COLLECTION_SLUG,
                  description: GALLERY_OTHER_COLLECTION_DESCRIPTION,
                  latestImageUrl: 1,
                  latestImageId: 1,
                  imageCount: 1,
                },
              },
            ],
          },
        },
      ])
      .toArray();

    const cards = [
      ...(result?.withCollection ?? []),
      ...(result?.withoutCollection ?? []),
    ].map((card) => ({
      _id: card._id,
      name: card.name,
      slug: card.slug,
      description: card.description,
      latestImageUrl: card.latestImageUrl,
      latestImageId: card.latestImageId.toString(),
      imageCount: card.imageCount,
    }));

    return cards.sort((a, b) => {
      if (a.slug === GALLERY_OTHER_COLLECTION_SLUG) return 1;
      if (b.slug === GALLERY_OTHER_COLLECTION_SLUG) return -1;
      return a.name.localeCompare(b.name);
    });
  });
}

/**
 * Fetches active gallery images for a collection slug/id or the virtual "Other" bucket.
 */
export async function getGalleryImagesByCollection(
  collectionSlugOrId: string
): Promise<IGalleryImage[]> {
  return withMongoRetry(async () => {
    const galleryCollection = await getGalleryCollection();

    if (isOtherCollectionIdentifier(collectionSlugOrId)) {
      const images = await galleryCollection
        .find({
          isActive: true,
          $expr: NO_COLLECTION_IDS_EXPR,
        })
        .sort({ createdAt: -1 })
        .toArray();

      return images.map(serializeGalleryImage);
    }

    let collectionId: string;

    if (isValidObjectId(collectionSlugOrId)) {
      collectionId = collectionSlugOrId;
    } else {
      const collection = await getCollectionBySlug(collectionSlugOrId);
      if (!collection) {
        return [];
      }
      collectionId = collection._id;
    }

    const query: Record<string, unknown> = {
      isActive: true,
      collectionIds: {
        $in: [collectionId, new ObjectId(collectionId)],
      },
    };

    const images = await galleryCollection
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();

    return images.map(serializeGalleryImage);
  });
}
