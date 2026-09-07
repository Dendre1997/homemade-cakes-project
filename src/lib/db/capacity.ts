import type { Document, WithId } from "mongodb";
import { extractOriginalItemId } from "@/lib/utils";

/**
 * Single-date capacity math for the Baker AI.
 *
 * Mirrors the rules in /api/availability (override → isBlocked / workMinutes,
 * minus booked minutes derived from `categories.manufacturingTimeInMinutes`)
 * but evaluates one day instead of walking a 3-month window.
 *
 * Dates are keyed as `YYYY-MM-DD` interpreted in UTC, which matches how the
 * existing engine formats them on the (UTC) server.
 */

/** Calgary. Alberta observes MST/MDT, so the IANA zone is America/Edmonton. */
export const BAKERY_TIME_ZONE = "America/Edmonton";

const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function isValidDateKey(value: string): boolean {
  if (!DATE_KEY_PATTERN.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime());
}

/** Today's calendar date in the bakery's local time zone, not the server's. */
export function getBakeryToday(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: BAKERY_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** Convert a stored Date (or ISO string) to its UTC calendar-day key. */
export function toDateKey(value: Date | string): string | null {
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

/** Inclusive UTC day boundaries for a `YYYY-MM-DD` key. */
export function utcDayRange(dateKey: string): { start: Date; end: Date } {
  return {
    start: new Date(`${dateKey}T00:00:00.000Z`),
    end: new Date(`${dateKey}T23:59:59.999Z`),
  };
}

export function addDaysToKey(dateKey: string, days: number): string {
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export interface ManufacturingTimes {
  /** categoryId -> minutes */
  byCategoryId: Record<string, number>;
  /** Minutes charged for custom items, which carry no categoryId. */
  cakeFallbackMinutes: number;
}

export function buildManufacturingTimes(
  categories: WithId<Document>[]
): ManufacturingTimes {
  const byCategoryId: Record<string, number> = {};
  for (const category of categories) {
    if (typeof category.manufacturingTimeInMinutes === "number") {
      byCategoryId[category._id.toString()] =
        category.manufacturingTimeInMinutes;
    }
  }

  const cakeCategory = categories.find(
    (category) =>
      typeof category.name === "string" &&
      category.name.toLowerCase().includes("cake")
  );

  return {
    byCategoryId,
    cakeFallbackMinutes: cakeCategory
      ? (byCategoryId[cakeCategory._id.toString()] ?? 0)
      : 0,
  };
}

/**
 * Sums manufacturing minutes booked on a single day. Only the delivery-date
 * entries matching `dateKey` are counted, because one order can be split
 * across several bake days.
 */
export function computeBookedMinutes(
  orders: WithId<Document>[],
  dateKey: string,
  times: ManufacturingTimes
): number {
  let total = 0;

  for (const order of orders) {
    const deliveryDates = order.deliveryInfo?.deliveryDates;
    if (!Array.isArray(deliveryDates)) continue;

    for (const entry of deliveryDates) {
      if (!entry?.date || !Array.isArray(entry.itemIds)) continue;
      if (toDateKey(entry.date) !== dateKey) continue;

      for (const unitId of entry.itemIds as string[]) {
        const originalItemId = extractOriginalItemId(unitId);

        // Manual items have no catalog category, so no known bake time.
        if (unitId.startsWith("manual-") || originalItemId === "manual") {
          continue;
        }

        const orderItem = Array.isArray(order.items)
          ? order.items.find((item: Document) => item.id === originalItemId)
          : undefined;

        if (orderItem?.categoryId) {
          const key =
            typeof orderItem.categoryId === "string"
              ? orderItem.categoryId
              : orderItem.categoryId.toString();
          total += times.byCategoryId[key] ?? 0;
        } else if (
          unitId.includes("custom") ||
          originalItemId.includes("custom")
        ) {
          total += times.cakeFallbackMinutes;
        }
      }
    }
  }

  return total;
}

export interface DayCapacity {
  date: string;
  isBlocked: boolean;
  blockReason?: "admin_block" | "lead_time";
  workMinutes: number;
  bookedMinutes: number;
  availableMinutes: number;
  utilizationPercent: number;
  isFull: boolean;
  availableHours: string[];
  leadTimeDays: number;
  /** True when the date falls inside the lead-time buffer and cannot take new bookings. */
  isWithinLeadTime: boolean;
}

interface ComputeDayCapacityArgs {
  dateKey: string;
  todayKey: string;
  settings: WithId<Document> | null;
  categories: WithId<Document>[];
  ordersOnDate: WithId<Document>[];
}

export function computeDayCapacity({
  dateKey,
  todayKey,
  settings,
  categories,
  ordersOnDate,
}: ComputeDayCapacityArgs): DayCapacity {
  const leadTimeDays: number = settings?.leadTimeDays ?? 3;
  const defaultWorkMinutes: number = settings?.defaultWorkMinutes ?? 240;
  const defaultAvailableHours: string[] = settings?.defaultAvailableHours ?? [];
  const weekdayHours: Record<number, string[]> = settings?.weekdayHours ?? {};
  const dateOverrides: Document[] = Array.isArray(settings?.dateOverrides)
    ? settings.dateOverrides
    : [];

  const override = dateOverrides.find(
    (entry) => entry?.date && toDateKey(entry.date) === dateKey
  );

  const weekday = new Date(`${dateKey}T00:00:00.000Z`).getUTCDay();
  const availableHours: string[] =
    override?.availableHours ?? weekdayHours[weekday] ?? defaultAvailableHours;

  const times = buildManufacturingTimes(categories);
  const bookedMinutes = computeBookedMinutes(ordersOnDate, dateKey, times);

  const isAdminBlocked = override?.isBlocked === true;
  const workMinutes = isAdminBlocked
    ? 0
    : (override?.workMinutes ?? defaultWorkMinutes);

  const isWithinLeadTime = dateKey < addDaysToKey(todayKey, leadTimeDays);

  return {
    date: dateKey,
    isBlocked: isAdminBlocked,
    blockReason: isAdminBlocked
      ? "admin_block"
      : isWithinLeadTime
        ? "lead_time"
        : undefined,
    workMinutes,
    bookedMinutes,
    availableMinutes: Math.max(0, workMinutes - bookedMinutes),
    utilizationPercent:
      workMinutes > 0 ? Math.round((bookedMinutes / workMinutes) * 100) : 100,
    isFull: bookedMinutes >= workMinutes,
    availableHours,
    leadTimeDays,
    isWithinLeadTime,
  };
}
