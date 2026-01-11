
// Ensures this route is always re-calculated and not cached.
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/db";
import {
  startOfDay,
  eachDayOfInterval,
  addMonths,
  format,
  isWithinInterval,
  endOfDay,
} from "date-fns";
// import { ObjectId } from "mongodb";
import { extractOriginalItemId } from "@/lib/utils";


/**
 * Calculates the available manufacturing minutes for each day over the next 3 months.
 * This powers the front-end date picker by factoring in lead time, existing
 * order commitments, and admin-defined work schedules or holidays.
 */
export async function POST(request: NextRequest) {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);

    // --- 1. Fetch all required settings and lookup data ---
    const settings = await db.collection("settings").findOne({});
    const leadTimeDays = settings?.leadTimeDays || 3;
    const defaultWorkMinutes = settings?.defaultWorkMinutes || 240;
    const dateOverrides = settings?.dateOverrides || [];
    const defaultAvailableHours = settings?.defaultAvailableHours || [];

    const categories = await db.collection("categories").find({}).toArray();
    // Create a fast lookup map for category ID -> manufacturing time
    const manufacturingTimes: { [key: string]: number } = {};
    categories.forEach((cat) => {
      if (cat.manufacturingTimeInMinutes) {
        manufacturingTimes[cat._id.toString()] = cat.manufacturingTimeInMinutes;
      }
    });

    const today = startOfDay(new Date());
    const endDate = addMonths(today, 3); // Define the 3-month lookahead period

    // --- Calculate booked time from all relevant existing orders ---

    // Fetch a broad set of orders first, then process in-memory
    const potentiallyRelevantOrders = await db
      .collection("orders")
      .find({
        // Fetch all orders with at least one delivery date from today onwards
        "deliveryInfo.deliveryDates.date": { $gte: today },
        status: { $nin: ["cancelled"] }
      })
      .toArray();

    // This object will store the summed manufacturing time for all items on a given day
    const minutesBookedPerDay: Record<string, number> = {};

    potentiallyRelevantOrders.forEach((order) => {
      if (
        !order.deliveryInfo?.deliveryDates ||
        !Array.isArray(order.deliveryInfo.deliveryDates)
      ) {
        return; // Skip orders with invalid delivery data
      }

      order.deliveryInfo.deliveryDates.forEach(
        (deliveryEntry: { date: Date | string; itemIds: string[] }) => {
          if (!deliveryEntry.date || !Array.isArray(deliveryEntry.itemIds)) {
            return;
          }

          const deliveryDate = startOfDay(new Date(deliveryEntry.date));

          // Filter out any delivery dates that are outside our 3-month window
          if (
            !isWithinInterval(deliveryDate, {
              start: today,
              end: endOfDay(endDate),
            })
          ) {
            return;
          }

          const dateString = format(deliveryDate, "yyyy-MM-dd");
          let timeForThisDateEntry = 0;

          // Loop through the *specific* item units scheduled for this delivery date
          deliveryEntry.itemIds.forEach((unitId: string) => {
            const originalItemId = extractOriginalItemId(unitId);
            if (unitId.startsWith("manual-") || originalItemId === "manual") {
              // Manual items likely don't have catalog category IDs or fixed manufacturing times
              return; 
            }

            const orderItem = order.items.find(
              (item: any) => item.id === originalItemId
            );

            if (orderItem && orderItem.categoryId) {
              // Handle both string and ObjectId formats for categoryId
              const categoryIdString =
                typeof orderItem.categoryId === "string"
                  ? orderItem.categoryId
                  : orderItem.categoryId.toString();

              // Add this item's manufacturing time from our lookup map
              timeForThisDateEntry += manufacturingTimes[categoryIdString] || 0;
            } else if (unitId.includes("custom") || originalItemId.includes("custom")) {
               // Custom items often lack a categoryId. Default to "Cakes" manufacturing time.
               const cakeCategory = categories.find((c: any) => c.name.toLowerCase().includes("cake"));
               if (cakeCategory) {
                   timeForThisDateEntry += manufacturingTimes[cakeCategory._id.toString()] || 0;
               }
            } else {
              // Only warn if it's NOT a manual item we failed to find
              console.warn(
                `Could not find order item or categoryId for unitId: ${unitId} (originalId: ${originalItemId}) in order ${order._id}`
              );
            }
          });

          // Add the total calculated time for this batch of items to the day's total
          minutesBookedPerDay[dateString] =
            (minutesBookedPerDay[dateString] || 0) + timeForThisDateEntry;
        }
      );
    });

    // --- Calculate final availability for the 3-month interval ---
    const availableMinutesPerDay: Record<string, number> = {};
    const adminBlockedDates: string[] = [];
    const datesToCheck = eachDayOfInterval({ start: today, end: endDate });

    // Iterate through every single day in our 3-month window
    for (const date of datesToCheck) {
      const dateString = format(date, "yyyy-MM-dd");

      // Check if there's an admin override (holiday, custom hours) for this day
      const override = dateOverrides.find(
        (o: any) =>
          o.date &&
          format(startOfDay(new Date(o.date)), "yyyy-MM-dd") === dateString
      );

      if (override?.isBlocked) {
        // This day is fully blocked by admin
        adminBlockedDates.push(dateString);
        availableMinutesPerDay[dateString] = 0;
        continue;
      }

      // Use the override's specific work minutes, or fall back to the default
      const totalWorkMinutes = override?.workMinutes ?? defaultWorkMinutes;
      const alreadyBooked = minutesBookedPerDay[dateString] || 0;

      // Calculate remaining time, ensuring it doesn't go below zero
      availableMinutesPerDay[dateString] = Math.max(
        0,
        totalWorkMinutes - alreadyBooked
      );
    }


    // Return all calculated data for the front-end date picker
    return NextResponse.json({
      leadTimeDays,
      manufacturingTimes,
      availableMinutesPerDay,
      adminBlockedDates,
      defaultWorkMinutes,
      defaultAvailableHours,
      dateOverrides: dateOverrides.map((o: any) => ({
        ...o,
        // Ensure dates are serialized in a consistent format
        date: o.date.toISOString(),
      })),
    });
  } catch (error) {
    console.error("Error fetching availability:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { error: "Internal Server Error", details: errorMessage },
      { status: 500 }
    );
  }
}
