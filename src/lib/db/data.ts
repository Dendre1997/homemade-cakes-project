import clientPromise from "@/lib/db";
import { ProductWithCategory, Flavor, Blog, SeasonalEvent } from "@/types";
import { ObjectId } from "mongodb";

// --- 1. Helper to safely format MongoDB documents for the Client ---
const formatProductForClient = (p: any): ProductWithCategory => {
  const formatted = {
    ...p,
    _id: p._id.toString(),
    categoryId: p.categoryId.toString(),
    // Ensure arrays exist and map ObjectIds to strings
    collectionIds: p.collectionIds?.map((id: any) => id.toString()) || [],
    availableFlavorIds:
      p.availableFlavorIds?.map((id: any) => id.toString()) || [],
    allergenIds: p.allergenIds?.map((id: any) => id.toString()) || [],
    seasonalEventIds: p.seasonalEventIds?.map((id: any) => id.toString()) || [],
    // Ensure diameters structure is clean
    availableDiameterConfigs:
      p.availableDiameterConfigs?.map((c: any) => ({
        ...c,
        diameterId: c.diameterId.toString(),
      })) || [],
    // Format the nested category object
    category: { ...p.category, _id: p.category._id.toString() },
    // Dates to strings
    createdAt: p.createdAt ? new Date(p.createdAt).toISOString() : undefined,
    updatedAt: p.updatedAt ? new Date(p.updatedAt).toISOString() : undefined,
  };
  // Final safety net: explicit serialization to remove any hidden non-plain objects (e.g. buffers)
  return JSON.parse(JSON.stringify(formatted));
};

export async function getBestsellers(): Promise<ProductWithCategory[]> {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);

    // 1. Find Top Selling IDs (Limit 4 per user request)
    const topSellingIds = await db
      .collection("orders")
      .aggregate([
        { $unwind: "$items" },
        {
          $group: {
            _id: "$items.productId",
            totalSold: { $sum: "$items.quantity" },
          },
        },
        { $sort: { totalSold: -1 } },
        { $limit: 4 },
      ])
      .toArray();

    const productIds = topSellingIds
      .map((item) => item._id)
      .filter((id) => id); // Filter out null/undefined IDs

    // 2. Fetch the actual products
    const products = await db
      .collection("products")
      .aggregate([
        { $match: { _id: { $in: productIds } } },
        {
          $lookup: {
            from: "categories",
            localField: "categoryId",
            foreignField: "_id",
            as: "category",
          },
        },
        { $unwind: "$category" },
        { $match: { isActive: true } }, // Filter inactive
      ])
      .toArray();

    // 3. Format and Sort Bestsellers
    const cleanBestsellers = products.map(formatProductForClient);

    cleanBestsellers.sort((a, b) => {
      const rankA = productIds.findIndex((id) => String(id) === a._id);
      const rankB = productIds.findIndex((id) => String(id) === b._id);
      return rankA - rankB;
    });

    // 4. Smart Backfill Logic
    if (cleanBestsellers.length < 4) {
      const needed = 4 - cleanBestsellers.length;
      // Convert string IDs back to ObjectId for the exclusion query
      const existingIds = cleanBestsellers.map((p) => new ObjectId(p._id));

      const newest = await db
        .collection("products")
        .aggregate([
          {
            $match: {
              isActive: true,
              _id: { $nin: existingIds }, // Exclude items we already have
            },
          },
          {
            $lookup: {
              from: "categories",
              localField: "categoryId",
              foreignField: "_id",
              as: "category",
            },
          },
          { $unwind: "$category" },
          { $sort: { createdAt: -1 } },
          { $limit: needed },
        ])
        .toArray();

      const cleanNewest = newest.map(formatProductForClient);

      // Merge: Bestsellers First + Newest Backfill
      return [...cleanBestsellers, ...cleanNewest];
    }

    return cleanBestsellers;
  } catch (error) {
    console.error("Error fetching bestsellers:", error);
    return [];
  }
}

export async function getActiveFlavors(): Promise<Flavor[]> {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);

    // Assuming we want all flavors for now as there is no isActive field in the interface
    // but typically we might want to filter. For now, fetch all.
    const flavors = await db.collection("flavors").find({}).toArray();

    return flavors.map((f: any) => ({
      ...f,
      _id: f._id.toString(),
      // Ensure other potential ObjectIds are converted if necessary
      categoryIds: f.categoryIds?.map((id: any) => id.toString()) || [],
    }));
  } catch (error) {
    console.error("Error fetching active flavors:", error);
    return [];
  }
}

export async function getLatestBlogs(): Promise<Blog[]> {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);
    const blogs = await db.collection<Blog>("blogs")
      .find({ isActive: true })
      .sort({ publishedAt: -1 })
      .limit(6)
      .toArray();
      
    return JSON.parse(JSON.stringify(blogs)) as Blog[];
  } catch (error) {
    console.error("Failed to fetch blogs:", error);
    return [];
  }
}

export async function getSeasonalEventBySlug(slug: string): Promise<SeasonalEvent | null> {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);
    const event = await db.collection("seasonals").findOne({ slug, isActive: true });

    if (!event) return null;

    return {
      ...event,
      _id: event._id.toString(),
      createdAt: event.createdAt ? new Date(event.createdAt).toISOString() : undefined,
      updatedAt: event.updatedAt ? new Date(event.updatedAt).toISOString() : undefined,
      startDate: event.startDate ? new Date(event.startDate).toISOString() : undefined,
      endDate: event.endDate ? new Date(event.endDate).toISOString() : undefined,
    } as unknown as SeasonalEvent;
  } catch (err) {
    console.error("Error fetching seasonal event:", err);
    return null;
  }
}

export async function getSeasonalProducts(eventId: string): Promise<ProductWithCategory[]> {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);

    const products = await db
      .collection("products")
      .aggregate([
        { 
            $match: { 
                isActive: true,
                seasonalEventIds: new ObjectId(eventId) 
            } 
        },
        {
          $lookup: {
            from: "categories",
            localField: "categoryId",
            foreignField: "_id",
            as: "category",
          },
        },
        { $unwind: "$category" },
      ])
      .toArray();

    return products.map(formatProductForClient);
  } catch (err) {
    console.error("Error fetching seasonal products:", err);
    return [];
  }
}
