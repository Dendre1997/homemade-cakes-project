import {
  addDaysToKey,
  BAKERY_TIME_ZONE,
  isValidDateKey,
} from "@/lib/db/capacity";

/**
 * Midnight in America/Edmonton during MDT, stored as UTC.
 * Must stay aligned with `dateKeyToStoredDate` in schedule-helpers.
 */
export function dateKeyToStoredDate(dateKey: string): Date {
  return new Date(`${dateKey}T06:00:00.000Z`);
}

/** An instant that is still `dateKey` in America/Edmonton (MDT and MST). */
export function bakeryDateKeyToInstant(dateKey: string): Date {
  return new Date(`${dateKey}T18:00:00.000Z`);
}

export function formatBakeryDate(
  dateKey: string,
  options: Intl.DateTimeFormatOptions
): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: BAKERY_TIME_ZONE,
    ...options,
  }).format(bakeryDateKeyToInstant(dateKey));
}

const MONDAY_INDEX: Record<string, number> = {
  Mon: 0,
  Tue: 1,
  Wed: 2,
  Thu: 3,
  Fri: 4,
  Sat: 5,
  Sun: 6,
};

/** 0 = Monday … 6 = Sunday, matching the admin calendar columns. */
export function bakeryMondayIndex(dateKey: string): number {
  const short = new Intl.DateTimeFormat("en-US", {
    timeZone: BAKERY_TIME_ZONE,
    weekday: "short",
  }).format(bakeryDateKeyToInstant(dateKey));
  return MONDAY_INDEX[short] ?? 0;
}

export function bakeryMonthKeyFromDateKey(dateKey: string): string {
  return dateKey.slice(0, 7);
}

export function daysInBakeryMonth(monthKey: string): string[] {
  if (!isValidDateKey(`${monthKey}-01`)) return [];
  const days: string[] = [];
  let cursor = `${monthKey}-01`;
  while (cursor.startsWith(monthKey)) {
    days.push(cursor);
    cursor = addDaysToKey(cursor, 1);
  }
  return days;
}

/** Monday-first month grid. `null` pads the leading and trailing cells. */
export function bakeryMonthGrid(monthKey: string): (string | null)[] {
  const days = daysInBakeryMonth(monthKey);
  if (days.length === 0) return [];
  const cells: (string | null)[] = Array.from(
    { length: bakeryMondayIndex(days[0]) },
    () => null
  );
  cells.push(...days);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

/** Monday–Sunday date keys for the week containing `anchorKey`. */
export function bakeryWeekDateKeys(anchorKey: string): string[] {
  const offset = bakeryMondayIndex(anchorKey);
  const start = addDaysToKey(anchorKey, -offset);
  return Array.from({ length: 7 }, (_, index) => addDaysToKey(start, index));
}

export function isDateKeyInBakeryWeek(
  dateKey: string,
  anchorKey: string
): boolean {
  return bakeryWeekDateKeys(anchorKey).includes(dateKey);
}

export function shiftBakeryMonth(monthKey: string, delta: number): string {
  const [year, month] = monthKey.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, month - 1 + delta, 1));
  const nextYear = shifted.getUTCFullYear();
  const nextMonth = String(shifted.getUTCMonth() + 1).padStart(2, "0");
  return `${nextYear}-${nextMonth}`;
}
