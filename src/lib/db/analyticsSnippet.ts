import type { Db } from "mongodb";
import {
  addDaysToKey,
  getBakeryToday,
  utcDayRange,
} from "@/lib/db/capacity";

export type TopFlavorRow = { name: string; count: number };

/**
 * Top flavors by item quantity over the last 7 bakery calendar days (inclusive).
 * Lightweight alternative to GET /api/admin/analytics for dashboard snippets.
 */
export async function fetchTopFlavorsLast7Days(db: Db): Promise<TopFlavorRow[]> {
  const todayKey = getBakeryToday();
  const startKey = addDaysToKey(todayKey, -6);
  const { start } = utcDayRange(startKey);
  const { end } = utcDayRange(todayKey);

  const rows = await db
    .collection("orders")
    .aggregate<TopFlavorRow>([
      {
        $match: {
          createdAt: { $gte: start, $lte: end },
          status: { $ne: "cancelled" },
        },
      },
      { $unwind: "$items" },
      {
        $addFields: {
          resolvedFlavorId: {
            $ifNull: [
              "$items.selectedConfig.cake.flavorId",
              "$items.flavorId",
            ],
          },
        },
      },
      {
        $lookup: {
          from: "flavors",
          let: { fid: "$resolvedFlavorId" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: [{ $toString: "$_id" }, { $toString: "$$fid" }],
                },
              },
            },
            { $project: { name: 1 } },
          ],
          as: "flavorDoc",
        },
      },
      {
        $addFields: {
          flavorName: {
            $ifNull: [
              { $arrayElemAt: ["$flavorDoc.name", 0] },
              { $ifNull: ["$items.flavor", "Unknown"] },
            ],
          },
          qty: { $ifNull: ["$items.quantity", 1] },
        },
      },
      {
        $group: {
          _id: "$flavorName",
          count: { $sum: "$qty" },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 3 },
      {
        $project: {
          _id: 0,
          name: "$_id",
          count: 1,
        },
      },
    ])
    .toArray();

  return rows;
}
