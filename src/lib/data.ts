import { ProductCategory, Discount, Collection, HeroSlide, SeasonalEvent, ProductWithCategory } from "@/types";
import clientPromise from "@/lib/db";
import { calculateProductPrice } from "@/lib/discountUtils";
import { ObjectId } from "mongodb";

export async function getActiveCategories(): Promise<ProductCategory[]> {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);

    // 1. Fetch all categories
    const categories = await db.collection("categories").find({}).toArray();

    // 2. Fetch all unique categoryIds from ACTIVE products
    const activeProductCategories = await db.collection("products")
      .distinct("categoryId", { isActive: true });
    
    // Normalize active IDs to strings for comparison
    const activeCategoryIds = new Set(activeProductCategories.map(id => id.toString()));

    // 3. Filter categories
    const filteredCategories = categories.filter(cat => 
        activeCategoryIds.has(cat._id.toString())
    );

    return filteredCategories.map((cat) => ({
      ...cat,
      _id: cat._id.toString(),
    })) as ProductCategory[];
  } catch (error) {
    console.error("Error in getActiveCategories:", error);
    // Fallback: return all categories if filtering fails, or empty array?
    return [];
  }
}

export async function getCategories(): Promise<ProductCategory[]> {
    return getActiveCategories();
}

export async function getActiveCollections(): Promise<Collection[]> {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);

    // 1. Fetch all collections
    const collections = await db
      .collection("collections")
      .find({})
      .sort({ name: 1 })
      .toArray();

    // 2. Fetch all unique collectionIds from ACTIVE products
    const activeProducts = await db.collection("products")
        .find({ isActive: true }, { projection: { collectionIds: 1 } })
        .toArray();

    const activeCollectionIds = new Set<string>();
    activeProducts.forEach(p => {
        if (Array.isArray(p.collectionIds)) {
            p.collectionIds.forEach((id: any) => activeCollectionIds.add(id.toString()));
        }
    });

    // 3. Filter collections
    const filteredCollections = collections.filter(col => 
        activeCollectionIds.has(col._id.toString())
    );

    return filteredCollections.map((col) => ({
      ...col,
      _id: col._id.toString(),
    })) as Collection[];
  } catch (error) {
    console.error("Error fetching active collections:", error);
    return [];
  }
}

export async function getActiveSeasonalEvent(): Promise<SeasonalEvent | null> {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);
    const now = new Date();

    const events = await db
      .collection("seasonals")
      .find({
        isActive: true,
        startDate: { $lte: now },
        endDate: { $gte: now },
      })
      .sort({ endDate: 1 }) 
      .limit(1)
      .toArray();

    if (events.length === 0) return null;

    const event = events[0];
    return {
      ...event,
      _id: event._id.toString(),
      startDate: new Date(event.startDate).toISOString(),
      endDate: new Date(event.endDate).toISOString(),
    } as unknown as SeasonalEvent;
  } catch (error) {
    console.error("Error fetching seasonal event:", error);
    return null;
  }
}

export async function getHeroSlides(): Promise<HeroSlide[]> {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);
    const slides = await db.collection("hero_slides").find({}).toArray();

    return slides.map((slide) => ({
      ...slide,
      _id: slide._id.toString(),
    })) as HeroSlide[];
  } catch (error) {
    console.error("Error fetching hero slides:", error);
    return [];
  }
}

export async function getActiveDiscounts(): Promise<Discount[]> {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);
    const now = new Date();

    const discounts = await db
      .collection("discounts")
      .find({
        isActive: true,
        trigger: "automatic",
        startDate: { $lte: now },
        endDate: { $gte: now },
      })
      .toArray();

    return discounts.map((d: any) => ({
      ...d,
      _id: d._id.toString(),
      targetIds: d.targetIds.map((id: any) => id.toString()),
      startDate: d.startDate.toISOString(),
      endDate: d.endDate.toISOString(),
    })) as Discount[];
  } catch (error) {
    console.error("Error fetching active discounts:", error);
    return [];
  }
}

export async function getActiveDiscountedProducts(): Promise<ProductWithCategory[]> {
  try {
    const discounts = await getActiveDiscounts();
    if (discounts.length === 0) return [];

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);

    // 1. Identify Target IDs
    let categoryIds: string[] = [];
    let productIds: string[] = [];
    let collectionIds: string[] = [];
    let hasGlobalDiscount = false;

    discounts.forEach((d) => {
      if (d.targetType === "all") hasGlobalDiscount = true;
      if (d.targetType === "category") categoryIds.push(...(d.targetIds as string[]));
      if (d.targetType === "product") productIds.push(...(d.targetIds as string[]));
      if (d.targetType === "collection") collectionIds.push(...(d.targetIds as string[]));
    });

    // 2. Build Query
    const query: any = { isActive: true };

    if (!hasGlobalDiscount) {
      const orConditions: any[] = [];
      
      if (categoryIds.length > 0) orConditions.push({ categoryId: { $in: categoryIds } });
      if (productIds.length > 0) {
          orConditions.push({ _id: { $in: productIds.map(id => new ObjectId(id)) } });
      }
      if (collectionIds.length > 0) orConditions.push({ collectionIds: { $in: collectionIds } });
      
      orConditions.push({ seasonalEventIds: { $exists: true, $ne: [] } });

      if (orConditions.length > 0) {
        query.$or = orConditions;
      } else {
        return []; 
      }
    }

    // 3. Fetch Candidates
    const candidates = await db.collection("products").aggregate([
      { $match: query },
      {
        $lookup: {
          from: "categories",
          let: { catId: "$categoryId" },
          pipeline: [
            { $match: { $expr: { $eq: ["$_id", { $toObjectId: "$$catId" }] } } }
          ],
          as: "category"
        }
      },
      { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } },
      { $limit: 20 }
    ]).toArray();

    // 4. Format & Filter
    const formattedCandidates = candidates.map(p => {
        // Simple serialization like other helpers
        return {
            ...p,
            _id: p._id.toString(),
            categoryId: p.categoryId.toString(),
            collectionIds: p.collectionIds?.map((id: any) => id.toString()) || [],
            availableFlavorIds: p.availableFlavorIds?.map((id: any) => id.toString()) || [],
            allergenIds: p.allergenIds?.map((id: any) => id.toString()) || [],
            seasonalEventIds: p.seasonalEventIds?.map((id: any) => id.toString()) || [],
            availableDiameterConfigs: p.availableDiameterConfigs?.map((c: any) => ({
                ...c,
                diameterId: c.diameterId.toString(),
            })) || [],
            category: p.category ? { ...p.category, _id: p.category._id.toString() } : undefined,
            createdAt: p.createdAt ? new Date(p.createdAt).toISOString() : undefined,
            updatedAt: p.updatedAt ? new Date(p.updatedAt).toISOString() : undefined,
        };
    }) as unknown as ProductWithCategory[];

    const discountedProducts = formattedCandidates.filter(product => {
       const { hasDiscount } = calculateProductPrice(product, discounts);
       return hasDiscount; 
    });

    return JSON.parse(JSON.stringify(discountedProducts.slice(0, 8)));

  } catch (error) {
    console.error("Error fetching discounted products:", error);
    return [];
  }
}
