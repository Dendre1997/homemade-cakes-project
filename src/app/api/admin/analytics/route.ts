import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/db";
import { ObjectId } from "mongodb";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");

    let startDate = new Date();
    startDate.setDate(startDate.getDate() - 30); // Default to 30 days ago
    let endDate = new Date();

    if (startDateParam) startDate = new Date(startDateParam);
    if (endDateParam) endDate = new Date(endDateParam);
    
    if (endDate) {
      endDate.setHours(23, 59, 59, 999);
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);

    const pipeline = [
      //Match Stage: Filter by Date and exclude 'cancelled' orders
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          status: { $ne: "cancelled" },
        },
      },
      // Facet Stage: Parallel Calculations
      {
        $facet: {
          // KPI: Total Revenue, Orders, etc.
          kpis: [
            {
              $group: {
                _id: null,
                totalRevenue: { $sum: "$totalAmount" },
                totalOrders: { $count: {} },
                totalItemsSold: { $sum: { $sum: "$items.quantity" } }, // Correctly sums quantity of all items
              },
            },
            {
              $project: {
                _id: 0,
                totalRevenue: 1,
                totalOrders: 1,
                totalItemsSold: 1,
                averageOrderValue: {
                  $cond: [
                    { $eq: ["$totalOrders", 0] },
                    0,
                    { $divide: ["$totalRevenue", "$totalOrders"] },
                  ],
                },
              },
            },
          ],

          // Sales Over Time (for Line Chart)
          salesOverTime: [
            {
              $group: {
                _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                revenue: { $sum: "$totalAmount" },
                orders: { $count: {} },
              },
            },
            { $sort: { _id: 1 } },
          ],

          // Flavor Stats (Pie Chart)
          flavorStats: [
            { $unwind: "$items" },
            {
              $group: {
                _id: "$items.flavor",
                count: { $sum: "$items.quantity" },
              },
            },
            { $sort: { count: -1 } },
            { $limit: 5 }, // Top 5 flavors
          ],

          // Category Stats (Pie Chart)
          categoryStats: [
            { $unwind: "$items" },
            {
              $addFields: {
                productObjectId: { $toObjectId: "$items.productId" }
              }
            },
            {
              $lookup: {
                from: "products",
                localField: "productObjectId",
                foreignField: "_id",
                as: "productInfo"
              }
            },
            { $unwind: "$productInfo" },
            {
              $addFields: {
                categoryObjectId: { $toObjectId: "$productInfo.categoryId" }
              }
            },
            {
              $lookup: {
                from: "categories",
                localField: "categoryObjectId",
                foreignField: "_id",
                as: "categoryInfo"
              }
            },
            { $unwind: "$categoryInfo" },
            {
              $group: {
                _id: "$categoryInfo.name",
                count: { $sum: "$items.quantity" },
                revenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } }
              }
            },
            { $sort: { revenue: -1 } }
          ],

          // Diameter Stats (Bar Chart) - WITH LOOKUP
          diameterStats: [
            { $unwind: "$items" },
            {
              $group: {
                _id: { $toObjectId: "$items.diameterId" }, // Ensure it's ObjectId for lookup
                count: { $sum: "$items.quantity" },
              },
            },
            {
              $lookup: {
                from: "diameters",
                localField: "_id",
                foreignField: "_id",
                as: "diameterInfo",
              },
            },
            { $unwind: "$diameterInfo" },
            {
              $project: {
                name: "$diameterInfo.name", // e.g., "6 inch"
                count: 1,
              },
            },
            { $sort: { count: -1 } },
          ],

          // Top Products (Table)
          topProducts: [
            { $unwind: "$items" },
            {
              $group: {
                _id: { $toObjectId: "$items.productId" },
                totalSold: { $sum: "$items.quantity" }, 
                revenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } },
              },
            },
            {
              $lookup: {
                from: "products",
                localField: "_id",
                foreignField: "_id",
                as: "productInfo",
              },
            },
            { $unwind: "$productInfo" },
            {
              $project: {
                name: "$productInfo.name",
                totalSold: 1,
                revenue: 1,
              },
            },
            { $sort: { totalSold: -1 } },
            { $limit: 10 },
          ],

          // Detailed Orders (for CSV)
          detailedOrders: [
            { $sort: { createdAt: -1 } },
            {
              $project: {
                _id: 1,
                createdAt: 1,
                totalAmount: 1,
                itemsCount: { $size: "$items" },
              },
            },
          ],

          // Detailed Product Stats (for CSV - Summarized)
          detailedProductStats: [
            { $unwind: "$items" },
            {
              $group: {
                _id: {
                  productId: { $toObjectId: "$items.productId" },
                  flavor: "$items.flavor",
                  diameterId: { $toObjectId: "$items.diameterId" }
                },
                quantity: { $sum: "$items.quantity" },
                revenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } },
              },
            },
            {
              $lookup: {
                from: "products",
                localField: "_id.productId",
                foreignField: "_id",
                as: "productInfo",
              },
            },
            {
              $lookup: {
                from: "diameters",
                localField: "_id.diameterId",
                foreignField: "_id",
                as: "diameterInfo",
              },
            },
            { $unwind: "$productInfo" },
            { $unwind: "$diameterInfo" },
            {
              $project: {
                _id: 0,
                productName: "$productInfo.name",
                flavor: "$_id.flavor",
                size: "$diameterInfo.name",
                quantity: 1,
                revenue: 1,
              },
            },
            { $sort: { quantity: -1 } },
          ],

          // Sold Items Log (Granular for CSV)
          soldItemsLog: [
            { $unwind: "$items" },
            {
              $addFields: {
                productObjectId: { $toObjectId: "$items.productId" },
                diameterObjectId: { $toObjectId: "$items.diameterId" }
              }
            },
            {
              $lookup: {
                from: "products",
                localField: "productObjectId",
                foreignField: "_id",
                as: "productInfo",
              },
            },
            {
              $lookup: {
                from: "diameters",
                localField: "diameterObjectId",
                foreignField: "_id",
                as: "diameterInfo",
              },
            },
            { $unwind: { path: "$productInfo", preserveNullAndEmptyArrays: true } },
            { $unwind: { path: "$diameterInfo", preserveNullAndEmptyArrays: true } },
            {
              $project: {
                _id: 0,
                date: "$createdAt",
                productName: { $ifNull: ["$productInfo.name", "Unknown Product"] },
                flavor: "$items.flavor",
                size: { $ifNull: ["$diameterInfo.name", "Unknown Size"] },
                price: "$items.price",
                quantity: "$items.quantity"
              }
            },
            { $sort: { date: -1 } }
          ],

          // Discount Stats (Granular - Per Item - Promo Codes)
          discountStats: [
            { $match: { "discountInfo.code": { $exists: true, $ne: null } } },
            { $unwind: "$items" },
            {
              $group: {
                _id: "$discountInfo.code",
                totalItemsSold: { $sum: "$items.quantity" },
                totalRevenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } }
              },
            },
            { $sort: { totalItemsSold: -1 } },
          ],

          // Automatic Discount Stats (Granular - Per Item - Database Lookup)
          automaticDiscountStats: [
            { $unwind: "$items" },
            { $match: { "items.discountId": { $exists: true, $ne: null } } },
            {
              $addFields: {
                discountObjectId: { $toObjectId: "$items.discountId" }
              }
            },
            {
              $lookup: {
                from: "discounts",
                localField: "discountObjectId",
                foreignField: "_id",
                as: "discountDoc"
              }
            },
            { $unwind: "$discountDoc" },
            {
              $group: {
                _id: "$discountDoc.name",
                totalItemsSold: { $sum: "$items.quantity" },
                totalRevenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } }
              }
            },
            { $sort: { totalItemsSold: -1 } }
          ],

          // Source Stats (Pie Chart)
          sourceStats: [
            {
              $group: {
                _id: "$source",
                count: { $sum: 1 },
              },
            },
            {
              $project: {
                name: { $ifNull: ["$_id", "Unknown"] },
                value: "$count",
                _id: 0,
              },
            },
            { $sort: { value: -1 } },
          ],
        },
      },
    ];

    const results = await db.collection("orders").aggregate(pipeline).toArray();

    // Aggregation returns an array with one object containing the facets
    const data = results[0];

    return NextResponse.json(data);
  } catch (error) {
    console.error("Analytics API Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics data" },
      { status: 500 }
    );
  }
}
