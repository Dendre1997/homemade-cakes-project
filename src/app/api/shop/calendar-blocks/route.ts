/**
 * GET /api/shop/calendar-blocks
 *
 * Public, unauthenticated, read-only endpoint.
 *
 * Returns the minimal data the Custom Order Wizard Step 1 calendar needs:
 *   - blockedDates        : string[]  — YYYY-MM-DD dates the picker must disable
 *   - leadTimeDays        : number    — minimum advance-notice days
 *   - defaultAvailableHours: string[] — time-slot options for the picker
 *
 * "Optimistic" logic: a date is blocked only when it is 100% full or
 * manually disabled by the admin.  Because Step 1 happens before the user
 * designs the cake we don't know the manufacturing cost yet, so we never
 * block a date that still has any remaining capacity.
 *
 * Security: ONLY the above three fields are ever sent to the client.
 * No order details, minute counts, revenue, or admin config are exposed.
 *
 * DO NOT alter /api/availability/route.ts — that remains the strict
 * capacity check used by the checkout flow.
 */

export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import clientPromise from "@/lib/db";
import {
  startOfDay,
  addDays,
  eachDayOfInterval,
  format,
  addMonths,
} from "date-fns";

// ─── helpers ────────────────────────────────────────────────────────────────

/** Strip the trailing "-<unitIndex>" suffix that createUnitId() appends. */
function extractOriginalItemId(id: string): string {
  return id.split("-").slice(0, -1).join("-");
}

// ─── route ──────────────────────────────────────────────────────────────────

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);

    // ── 1. Load schedule settings (same collection as /api/availability) ───
    const settings = await db.collection("settings").findOne({});
    const leadTimeDays: number = settings?.leadTimeDays ?? 3;
    const defaultWorkMinutes: number = settings?.defaultWorkMinutes ?? 240;
    const dateOverrides: any[] = settings?.dateOverrides ?? [];
    const defaultAvailableHours: string[] =
      settings?.defaultAvailableHours ?? [];

    // ── 2. Build category → manufacturingTimeInMinutes lookup ─────────────
    const categories = await db.collection("categories").find({}).toArray();
    const mfgTime: Record<string, number> = {};
    for (const cat of categories) {
      if (cat.manufacturingTimeInMinutes) {
        mfgTime[cat._id.toString()] = cat.manufacturingTimeInMinutes;
      }
    }

    // Fallback: minutes to use when a custom-order item has no category match.
    // Use the first category whose name contains "cake", else 0.
    const cakeFallbackMinutes =
      categories.find((c: any) => c.name?.toLowerCase().includes("cake"))
        ?._id?.toString()
        ? mfgTime[
            categories
              .find((c: any) => c.name?.toLowerCase().includes("cake"))!
              ._id.toString()
          ] ?? 0
        : 0;

    const today = startOfDay(new Date());
    // Look-ahead window: 60 days (enough for Step 1; checkout uses 3 months)
    const windowEnd = addMonths(today, 2);

    // ── 3. Tally booked minutes from regular orders (deliveryInfo model) ───
    const minutesBooked: Record<string, number> = {};

    const regularOrders = await db
      .collection("orders")
      .find({
        "deliveryInfo.deliveryDates.date": { $gte: today },
        status: { $nin: ["cancelled"] },
      })
      .toArray();

    for (const order of regularOrders) {
      if (!Array.isArray(order.deliveryInfo?.deliveryDates)) continue;

      for (const entry of order.deliveryInfo.deliveryDates as {
        date: Date | string;
        itemIds: string[];
      }[]) {
        if (!entry.date || !Array.isArray(entry.itemIds)) continue;

        const delivDate = startOfDay(new Date(entry.date));
        if (delivDate < today || delivDate > windowEnd) continue;

        const ds = format(delivDate, "yyyy-MM-dd");

        for (const unitId of entry.itemIds) {
          // Skip manual items — they have no catalog manufacturing time
          const originalId = extractOriginalItemId(unitId);
          if (unitId.startsWith("manual-") || originalId === "manual") continue;

          const orderItem = order.items?.find(
            (it: any) => it.id === originalId
          );

          if (orderItem?.categoryId) {
            const catKey =
              typeof orderItem.categoryId === "string"
                ? orderItem.categoryId
                : orderItem.categoryId.toString();
            minutesBooked[ds] = (minutesBooked[ds] ?? 0) + (mfgTime[catKey] ?? 0);
          } else if (
            unitId.includes("custom") ||
            originalId.includes("custom")
          ) {
            minutesBooked[ds] = (minutesBooked[ds] ?? 0) + cakeFallbackMinutes;
          }
        }
      }
    }

    // ── 4. Also tally converted custom orders (they book capacity too) ─────
    //      Custom orders store a single `date` field (not deliveryDates).
    //      Only "converted" ones are confirmed; pending / rejected don't block.
    const convertedCustomOrders = await db
      .collection("custom_orders")
      .find({
        status: "converted",
        date: { $gte: today },
      })
      .toArray();

    for (const co of convertedCustomOrders) {
      if (!co.date) continue;
      const coDate = startOfDay(new Date(co.date));
      if (coDate < today || coDate > windowEnd) continue;

      const ds = format(coDate, "yyyy-MM-dd");
      // Custom orders don't carry a categoryId — use the cake fallback
      minutesBooked[ds] = (minutesBooked[ds] ?? 0) + cakeFallbackMinutes;
    }

    // ── 5. Determine blocked dates ─────────────────────────────────────────
    const blockedSet = new Set<string>();

    // 5a. Lead-time days (today … today + leadTimeDays - 1) are always blocked
    const firstPickable = addDays(today, leadTimeDays);
    for (const d of eachDayOfInterval({ start: today, end: addDays(firstPickable, -1) })) {
      blockedSet.add(format(d, "yyyy-MM-dd"));
    }

    // 5b. Walk the full look-ahead window
    for (const d of eachDayOfInterval({ start: firstPickable, end: windowEnd })) {
      const ds = format(d, "yyyy-MM-dd");

      // Find a dateOverride for this day (if any)
      const override = dateOverrides.find(
        (o: any) =>
          o.date &&
          format(startOfDay(new Date(o.date)), "yyyy-MM-dd") === ds
      );

      // Explicitly admin-blocked?
      if (override?.isBlocked === true) {
        blockedSet.add(ds);
        continue;
      }

      // Capacity for the day: override wins over the global default
      const capacity: number = override?.workMinutes ?? defaultWorkMinutes;
      const booked: number = minutesBooked[ds] ?? 0;

      // Block only when completely full (optimistic: any remaining minute = available)
      if (booked >= capacity) {
        blockedSet.add(ds);
      }
    }

    // ── 6. Return ONLY the public-safe fields ──────────────────────────────
    return NextResponse.json({
      blockedDates: Array.from(blockedSet).sort(),
      leadTimeDays,
      defaultAvailableHours,
    });
  } catch (error) {
    console.error("[/api/shop/calendar-blocks] Error:", error);
    // Safe fallback — the calendar will still render; no blocked dates surfaced
    return NextResponse.json(
      { blockedDates: [], leadTimeDays: 7, defaultAvailableHours: [] },
      { status: 200 }
    );
  }
}
