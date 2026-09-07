import {
  addDaysToKey,
  BAKERY_TIME_ZONE,
  getBakeryToday,
  isValidDateKey,
} from "@/lib/db/capacity";

/**
 * Relative-date resolution for the Copilot (§7).
 *
 * The model must never compute a calendar date itself — it picks an expression
 * and this module turns it into explicit `YYYY-MM-DD` bounds.
 *
 * All arithmetic runs on `YYYY-MM-DD` keys anchored at UTC midnight. Calendar
 * day math never touches clock time, so it cannot drift across a DST boundary;
 * the only timezone-sensitive step is choosing "today", which comes from
 * `getBakeryToday()` and is therefore evaluated in America/Edmonton.
 */

/** Monday. Matches the admin calendar pickers, which pass `weekStartsOn: 1`. */
const WEEK_STARTS_ON_MONDAY = true;

/** Weekday name (and common abbreviation) to `getUTCDay()` index. */
const WEEKDAY_ALIASES: Record<string, number> = {
  sun: 0,
  sunday: 0,
  mon: 1,
  monday: 1,
  tue: 2,
  tues: 2,
  tuesday: 2,
  wed: 3,
  weds: 3,
  wednesday: 3,
  thu: 4,
  thur: 4,
  thurs: 4,
  thursday: 4,
  fri: 5,
  friday: 5,
  sat: 6,
  saturday: 6,
};

const MONTHS: Record<string, number> = {
  january: 1,
  jan: 1,
  february: 2,
  feb: 2,
  march: 3,
  mar: 3,
  april: 4,
  apr: 4,
  may: 5,
  june: 6,
  jun: 6,
  july: 7,
  jul: 7,
  august: 8,
  aug: 8,
  september: 9,
  sep: 9,
  sept: 9,
  october: 10,
  oct: 10,
  november: 11,
  nov: 11,
  december: 12,
  dec: 12,
};

export interface ResolvedDateExpression {
  /** The expression as understood, after normalization. */
  expression: string;
  /** Inclusive start, `YYYY-MM-DD`. */
  startDate: string;
  /** Inclusive end. Equal to `startDate` for a single day. */
  endDate: string;
  isRange: boolean;
  /** Number of calendar days covered, inclusive. */
  dayCount: number;
  /** Readable form for the UI and for the model to quote back. */
  label: string;
  /** The anchor "today" resolved in the bakery time zone. */
  today: string;
  timeZone: string;
}

/** Day of week for a date key: 0 = Sunday. */
function dayOfWeek(dateKey: string): number {
  return new Date(`${dateKey}T00:00:00.000Z`).getUTCDay();
}

function startOfWeekKey(dateKey: string): string {
  const dow = dayOfWeek(dateKey);
  const offset = WEEK_STARTS_ON_MONDAY ? (dow + 6) % 7 : dow;
  return addDaysToKey(dateKey, -offset);
}

function monthRange(
  dateKey: string,
  monthDelta: number
): { start: string; end: string } {
  const [year, month] = dateKey.split("-").map(Number);
  const first = new Date(Date.UTC(year, month - 1 + monthDelta, 1));
  const last = new Date(
    Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)
  );
  return {
    start: first.toISOString().slice(0, 10),
    end: last.toISOString().slice(0, 10),
  };
}

function daysBetweenKeys(startKey: string, endKey: string): number {
  const diff =
    new Date(`${endKey}T00:00:00.000Z`).getTime() -
    new Date(`${startKey}T00:00:00.000Z`).getTime();
  return Math.round(diff / 86_400_000) + 1;
}

function formatKey(dateKey: string): string {
  // Rendered in UTC because the key itself is already a bakery-local calendar
  // date — converting it again would shift it by a day.
  return new Intl.DateTimeFormat("en-CA", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${dateKey}T00:00:00.000Z`));
}

function buildLabel(startKey: string, endKey: string): string {
  return startKey === endKey
    ? formatKey(startKey)
    : `${formatKey(startKey)} – ${formatKey(endKey)}`;
}

/** Collapse whitespace, drop filler words the baker naturally types. */
function normalizeExpression(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[.,!?]/g, " ")
    .replace(/\b(?:on|for|the|of|orders?|please)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const NUMBER_WORDS: Record<string, number> = {
  a: 1,
  an: 1,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  fourteen: 14,
  thirty: 30,
};

function parseCount(token: string): number | null {
  if (/^\d+$/.test(token)) {
    const value = Number.parseInt(token, 10);
    return Number.isFinite(value) ? value : null;
  }
  return NUMBER_WORDS[token] ?? null;
}

/** Guards against a runaway window blowing up the prompt budget. */
const MAX_RANGE_DAYS = 120;

interface Bounds {
  start: string;
  end: string;
}

/**
 * Resolves one relative or absolute date expression against today in the
 * bakery's time zone. Returns `null` when the phrasing is not understood — the
 * caller must surface that plainly rather than guessing a date.
 */
export function resolveDateExpression(
  raw: string,
  todayKey: string = getBakeryToday()
): ResolvedDateExpression | null {
  const expression = normalizeExpression(raw ?? "");
  if (!expression) return null;

  const bounds = matchBounds(expression, todayKey);
  if (!bounds) return null;

  const { start, end } = bounds;
  if (!isValidDateKey(start) || !isValidDateKey(end)) return null;

  const [startDate, endDate] = start <= end ? [start, end] : [end, start];
  const dayCount = daysBetweenKeys(startDate, endDate);
  if (dayCount > MAX_RANGE_DAYS) return null;

  return {
    expression,
    startDate,
    endDate,
    isRange: startDate !== endDate,
    dayCount,
    label: buildLabel(startDate, endDate),
    today: todayKey,
    timeZone: BAKERY_TIME_ZONE,
  };
}

function matchBounds(expression: string, today: string): Bounds | null {
  return (
    matchExplicit(expression) ??
    matchNamedDay(expression, today) ??
    matchWeek(expression, today) ??
    matchWeekend(expression, today) ??
    matchMonth(expression, today) ??
    matchOffset(expression, today) ??
    matchWindow(expression, today) ??
    matchWeekday(expression, today) ??
    matchMonthDay(expression, today)
  );
}

/** `2026-09-18`, or `2026-09-18 to 2026-09-24`. */
function matchExplicit(expression: string): Bounds | null {
  const keys = expression.match(/\d{4}-\d{2}-\d{2}/g);
  if (!keys || keys.length === 0) return null;
  if (!keys.every(isValidDateKey)) return null;
  return { start: keys[0], end: keys[keys.length - 1] };
}

function matchNamedDay(expression: string, today: string): Bounds | null {
  switch (expression) {
    case "today":
    case "tonight":
    case "this day":
      return { start: today, end: today };
    case "tomorrow":
    case "tmr":
      return { start: addDaysToKey(today, 1), end: addDaysToKey(today, 1) };
    case "day after tomorrow":
      return { start: addDaysToKey(today, 2), end: addDaysToKey(today, 2) };
    case "yesterday":
      return { start: addDaysToKey(today, -1), end: addDaysToKey(today, -1) };
    default:
      return null;
  }
}

function matchWeek(expression: string, today: string): Bounds | null {
  const weekStart = startOfWeekKey(today);

  const offsets: Record<string, number> = {
    "this week": 0,
    "current week": 0,
    "next week": 7,
    "following week": 7,
    "week after next": 14,
    "last week": -7,
    "previous week": -7,
  };

  const offset = offsets[expression];
  if (offset === undefined) return null;

  const start = addDaysToKey(weekStart, offset);
  return { start, end: addDaysToKey(start, 6) };
}

/** Saturday and Sunday of the relevant week. */
function matchWeekend(expression: string, today: string): Bounds | null {
  const offsets: Record<string, number> = {
    "this weekend": 0,
    weekend: 0,
    "next weekend": 7,
    "last weekend": -7,
  };

  const offset = offsets[expression];
  if (offset === undefined) return null;

  const weekStart = addDaysToKey(startOfWeekKey(today), offset);
  // Monday-based week: Saturday is +5, Sunday +6.
  const saturday = addDaysToKey(weekStart, WEEK_STARTS_ON_MONDAY ? 5 : 6);
  return { start: saturday, end: addDaysToKey(saturday, 1) };
}

function matchMonth(expression: string, today: string): Bounds | null {
  const deltas: Record<string, number> = {
    "this month": 0,
    "current month": 0,
    "next month": 1,
    "last month": -1,
    "previous month": -1,
  };

  const delta = deltas[expression];
  if (delta !== undefined) return monthRange(today, delta);

  // A bare month name, e.g. "september". Picks the coming occurrence so
  // "december" in January does not silently mean 11 months ago.
  const month = MONTHS[expression];
  if (month === undefined) return null;

  const [year, currentMonth] = today.split("-").map(Number);
  const targetYear = month >= currentMonth ? year : year + 1;
  return monthRange(`${targetYear}-${String(month).padStart(2, "0")}-01`, 0);
}

/** `in 3 days`, `in two weeks`, `3 days from now`. */
function matchOffset(expression: string, today: string): Bounds | null {
  const match = expression.match(
    /^(?:in )?(\d+|[a-z]+) (day|days|week|weeks)(?: from now| ahead| later)?$/
  );
  if (!match) return null;

  const count = parseCount(match[1]);
  if (count === null) return null;

  const days = match[2].startsWith("week") ? count * 7 : count;
  const target = addDaysToKey(today, days);
  return { start: target, end: target };
}

/** `next 7 days`, `coming 2 weeks` — a window starting today. */
function matchWindow(expression: string, today: string): Bounds | null {
  const match = expression.match(
    /^(?:next|coming|upcoming|following) (\d+|[a-z]+) (day|days|week|weeks)$/
  );
  if (!match) return null;

  const count = parseCount(match[1]);
  if (count === null || count < 1) return null;

  const days = match[2].startsWith("week") ? count * 7 : count;
  return { start: today, end: addDaysToKey(today, days - 1) };
}

/**
 * `friday`, `this friday`, `next friday`, `last friday`.
 *
 * A bare or "this" weekday means the next occurrence on or after today, which
 * is how a baker means it. "next friday" means the Friday of next week — the
 * distinction matters when today is already Thursday.
 */
function matchWeekday(expression: string, today: string): Bounds | null {
  const match = expression.match(
    /^(this|next|last|coming|upcoming)? ?([a-z]+)$/
  );
  if (!match) return null;

  const qualifier = match[1];
  const target = WEEKDAY_ALIASES[match[2]];
  if (target === undefined) return null;

  if (qualifier === "next") {
    const nextWeekStart = addDaysToKey(startOfWeekKey(today), 7);
    const offset = WEEK_STARTS_ON_MONDAY ? (target + 6) % 7 : target;
    const key = addDaysToKey(nextWeekStart, offset);
    return { start: key, end: key };
  }

  if (qualifier === "last") {
    const back = (dayOfWeek(today) - target + 7) % 7 || 7;
    const key = addDaysToKey(today, -back);
    return { start: key, end: key };
  }

  const forward = (target - dayOfWeek(today) + 7) % 7;
  const key = addDaysToKey(today, forward);
  return { start: key, end: key };
}

/** `september 18`, `18 september`, `sep 18 2026`. */
function matchMonthDay(expression: string, today: string): Bounds | null {
  const monthFirst = expression.match(/^([a-z]+) (\d{1,2})(?: (\d{4}))?$/);
  const dayFirst = expression.match(/^(\d{1,2}) ([a-z]+)(?: (\d{4}))?$/);

  const parts = monthFirst
    ? { month: monthFirst[1], day: monthFirst[2], year: monthFirst[3] }
    : dayFirst
      ? { month: dayFirst[2], day: dayFirst[1], year: dayFirst[3] }
      : null;
  if (!parts) return null;

  const month = MONTHS[parts.month];
  if (month === undefined) return null;

  const day = Number.parseInt(parts.day, 10);
  if (!Number.isFinite(day) || day < 1 || day > 31) return null;

  const [currentYear, currentMonth] = today.split("-").map(Number);
  const year = parts.year
    ? Number.parseInt(parts.year, 10)
    : month >= currentMonth
      ? currentYear
      : currentYear + 1;

  const key = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  // Rejects impossible days like "february 31".
  if (!isValidDateKey(key)) return null;
  if (new Date(`${key}T00:00:00.000Z`).getUTCDate() !== day) return null;

  return { start: key, end: key };
}

/** The expressions the tool advertises, for the model and for error messages. */
export const SUPPORTED_DATE_EXPRESSIONS = [
  "today",
  "tomorrow",
  "yesterday",
  "this week",
  "next week",
  "this weekend",
  "next weekend",
  "this month",
  "next month",
  "friday / next friday / last friday",
  "next 7 days",
  "in 3 days",
  "september 18",
  "2026-09-18",
  "2026-09-18 to 2026-09-24",
] as const;
