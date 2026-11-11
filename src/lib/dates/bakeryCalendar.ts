import {
  addDaysToKey,
  BAKERY_TIME_ZONE,
  isValidDateKey,
  toDateKey,
} from "@/lib/db/capacity";

const SHORT_MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

function labelFromDateKey(dateKey: string, withYear: boolean): string | null {
  const [year, month, day] = dateKey.split("-");
  const monthLabel = SHORT_MONTHS[Number(month) - 1];
  const dayNum = Number(day);
  if (!monthLabel || !year || !Number.isFinite(dayNum)) return null;
  return withYear ? `${monthLabel} ${dayNum}, ${year}` : `${monthLabel} ${dayNum}`;
}

/**
 * Calendar label for a stored event date. The day is the UTC date key, so the
 * server render and the browser print the same text.
 */
export function formatStoredDateLabel(
  value: Date | string,
  options?: { withYear?: boolean }
): string | null {
  const key =
    typeof value === "string" && isValidDateKey(value) ? value : toDateKey(value);
  if (!key) return null;
  return labelFromDateKey(key, options?.withYear ?? false);
}

/** Instant label in America/Edmonton, independent of the server or browser zone. */
export function formatBakeryInstantLabel(
  value: Date | string,
  options?: { withYear?: boolean }
): string | null {
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: BAKERY_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(parsed);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  if (!year || !month || !day) return null;
  return labelFromDateKey(`${year}-${month}-${day}`, options?.withYear ?? false);
}

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
