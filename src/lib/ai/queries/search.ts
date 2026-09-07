import { ObjectId } from "mongodb";
import type { Document, Filter, WithId } from "mongodb";
import { withMongoClient } from "@/lib/db";
import {
  getHumanReadableLookupMaps,
  type LookupMaps,
} from "@/lib/db/lookupMaps";
import {
  compact,
  shapeCustomer,
  shapeCustomOrderItem,
  shapeOrderItem,
  shortId,
} from "@/lib/ai/serialize";
import { normalizeCustomOrder } from "@/lib/normalizeCustomOrder";
import { isValidDateKey, utcDayRange } from "@/lib/db/capacity";

/**
 * Unified text and date search across `orders` and `custom_orders`.
 *
 * Lives outside the route handler so the AI tool can call it in-process
 * instead of paying for an HTTP round trip back into our own API.
 *
 * Text and date criteria combine with AND, so "Olivia" plus a range answers
 * "what has Olivia got booked next week".
 */

export const MIN_QUERY_LENGTH = 2;
export const MAX_QUERY_LENGTH = 100;
export const DEFAULT_SEARCH_LIMIT = 10;
export const MAX_SEARCH_LIMIT = 25;
/** Below this, a numeric query is more likely an order total than a phone number. */
const MIN_PHONE_DIGITS = 7;

/** Neutralize regex metacharacters — the query string is untrusted input. */
function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Phone numbers are stored with whatever formatting the customer typed, so a
 * search for "4035551234" must still match "(403) 555-1234". Allows any
 * non-digit run between consecutive digits.
 */
function buildPhoneRegex(query: string): RegExp | null {
  const digits = query.replace(/\D/g, "");
  if (digits.length < MIN_PHONE_DIGITS) return null;
  return new RegExp(digits.split("").join("\\D*"));
}

/**
 * Clauses matching the document `_id`. Covers a full 24-char ObjectId as well
 * as the 6-character short code the baker sees in the UI and on receipts.
 */
function buildIdClauses(query: string, pattern: string): Filter<Document>[] {
  const clauses: Filter<Document>[] = [
    {
      $expr: {
        $regexMatch: {
          input: { $toString: "$_id" },
          regex: pattern,
          options: "i",
        },
      },
    },
  ];

  if (ObjectId.isValid(query)) {
    clauses.push({ _id: new ObjectId(query) });
  }

  return clauses;
}

export class InvalidSearchDateError extends Error {
  constructor(value: string) {
    super(`"${value}" is not a valid date. Use YYYY-MM-DD.`);
    this.name = "InvalidSearchDateError";
  }
}

interface ResolvedRange {
  startKey: string;
  endKey: string;
  /** Inclusive UTC instant boundaries, for the BSON Date comparisons. */
  start: Date;
  end: Date;
}

/**
 * Turns optional `YYYY-MM-DD` bounds into an inclusive window. One bound alone
 * means a single day. Reversed bounds are normalized rather than rejected — the
 * resolved window is echoed back in the result, so the correction stays visible.
 */
function resolveRange(
  startDate: string | null | undefined,
  endDate: string | null | undefined
): ResolvedRange | null {
  const rawStart = startDate?.trim() || null;
  const rawEnd = endDate?.trim() || null;
  if (!rawStart && !rawEnd) return null;

  for (const value of [rawStart, rawEnd]) {
    if (value !== null && !isValidDateKey(value)) {
      throw new InvalidSearchDateError(value);
    }
  }

  const first = rawStart ?? (rawEnd as string);
  const second = rawEnd ?? (rawStart as string);
  const [startKey, endKey] = first <= second ? [first, second] : [second, first];

  return {
    startKey,
    endKey,
    start: utcDayRange(startKey).start,
    end: utcDayRange(endKey).end,
  };
}

/**
 * Orders carry one entry per fulfillment date, so matching the array field
 * matches the document when ANY of its dates falls inside the window.
 */
function ordersDateClause(range: ResolvedRange): Filter<Document> {
  return {
    "deliveryInfo.deliveryDates.date": { $gte: range.start, $lte: range.end },
  };
}

/**
 * `custom_orders.date` is a BSON Date on current documents but a full ISO
 * string on a legacy batch. MongoDB compares only within a BSON type, so a
 * Date-only range silently skips those legacy rows — hence both branches.
 * ISO-8601 sorts lexicographically, which is what makes the string bounds work.
 */
function customOrdersDateClause(range: ResolvedRange): Filter<Document> {
  return {
    $or: [
      { date: { $gte: range.start, $lte: range.end } },
      {
        date: {
          $type: "string",
          $gte: range.startKey,
          $lte: `${range.endKey}T23:59:59.999Z`,
        },
      },
    ],
  };
}

function combineFilters(
  ...filters: (Filter<Document> | null)[]
): Filter<Document> {
  const active = filters.filter((f): f is Filter<Document> => f !== null);
  if (active.length === 0) return {};
  if (active.length === 1) return active[0];
  return { $and: active };
}

function buildOrdersFilter(
  query: string,
  pattern: string,
  phoneRegex: RegExp | null
): Filter<Document> {
  const rx = { $regex: pattern, $options: "i" };

  const clauses: Filter<Document>[] = [
    { "customerInfo.name": rx },
    { "customerInfo.phone": rx },
    { "customerInfo.email": rx },
    { "customerInfo.socialNickname": rx },
    { "items.name": rx },
    // Free-text describing the cake itself — the reason a baker searches at all.
    { "items.inscription": rx },
    { "items.designInstructions": rx },
    ...buildIdClauses(query, pattern),
  ];

  if (phoneRegex) {
    clauses.push({ "customerInfo.phone": { $regex: phoneRegex } });
  }

  return { $or: clauses };
}

function buildCustomOrdersFilter(
  query: string,
  pattern: string,
  phoneRegex: RegExp | null
): Filter<Document> {
  const rx = { $regex: pattern, $options: "i" };

  const clauses: Filter<Document>[] = [
    // Custom orders keep the customer under `contact`, not `customerInfo`.
    { "contact.name": rx },
    { "contact.phone": rx },
    { "contact.email": rx },
    { "contact.socialNickname": rx },
    { "items.category": rx },
    { "items.details.designNotes": rx },
    { "items.details.textOnCake": rx },
    { "items.details.flavor": rx },
    // Legacy flat documents stored these at the root.
    { customerName: rx },
    { "details.designNotes": rx },
    { "details.textOnCake": rx },
    { description: rx },
    ...buildIdClauses(query, pattern),
  ];

  if (phoneRegex) {
    clauses.push({ "contact.phone": { $regex: phoneRegex } });
  }

  return { $or: clauses };
}

function shapeOrder(doc: WithId<Document>, maps: LookupMaps) {
  const id = doc._id.toString();

  const deliveryDates = Array.isArray(doc.deliveryInfo?.deliveryDates)
    ? doc.deliveryInfo.deliveryDates.map((entry: Document) =>
        compact({ date: entry.date, timeSlot: entry.timeSlot })
      )
    : undefined;

  return compact({
    type: "order" as const,
    _id: id,
    shortId: shortId(id),
    status: doc.status,
    isPaid: Boolean(doc.isPaid),
    totalAmount: doc.totalAmount,
    source: doc.source,
    createdAt: doc.createdAt,
    customer: shapeCustomer(doc.customerInfo),
    fulfillment: compact({
      method: doc.deliveryInfo?.method,
      address: doc.deliveryInfo?.address,
      dates: deliveryDates,
    }),
    items: Array.isArray(doc.items)
      ? doc.items.map((item: Document) => shapeOrderItem(item, maps))
      : [],
  });
}

function shapeCustomOrder(doc: WithId<Document>, maps: LookupMaps) {
  const normalized = normalizeCustomOrder(doc);
  const id = String(normalized._id);

  return compact({
    type: "customOrder" as const,
    _id: id,
    shortId: shortId(id),
    status: normalized.status,
    eventDate: normalized.date ?? doc.eventDate,
    timeSlot: normalized.timeSlot,
    deliveryMethod: normalized.deliveryMethod,
    allergies: normalized.allergies,
    paymentPreference: normalized.paymentPreference,
    approximatePriceTotal: normalized.approximatePriceTotal,
    agreedPriceTotal: normalized.agreedPriceTotal,
    convertedOrderId: normalized.convertedOrderId,
    adminNotes: normalized.adminNotes,
    createdAt: normalized.createdAt,
    contact: compact({
      name: normalized.contact?.name ?? doc.customerName,
      phone: normalized.contact?.phone,
      email: normalized.contact?.email,
      social: normalized.contact?.socialNickname,
      socialPlatform: normalized.contact?.socialPlatform,
    }),
    items: normalized.items.map((item) =>
      shapeCustomOrderItem(item, maps, { includeReferenceImages: true })
    ),
  });
}

export interface SearchArgs {
  /** Free text. Optional when a date window is supplied instead. */
  query?: string | null;
  /** Inclusive `YYYY-MM-DD` lower bound on the fulfillment/event date. */
  startDate?: string | null;
  /** Inclusive `YYYY-MM-DD` upper bound. Omit for a single day. */
  endDate?: string | null;
  limit?: number;
}

export class SearchQueryTooShortError extends Error {
  constructor() {
    super(
      `Provide a search query of at least ${MIN_QUERY_LENGTH} characters, a date, or both.`
    );
    this.name = "SearchQueryTooShortError";
  }
}

export function clampSearchLimit(value: number | undefined): number {
  if (value === undefined || !Number.isFinite(value)) {
    return DEFAULT_SEARCH_LIMIT;
  }
  return Math.min(Math.max(Math.trunc(value), 1), MAX_SEARCH_LIMIT);
}

export async function searchBakeryRecords({
  query,
  startDate,
  endDate,
  limit,
}: SearchArgs) {
  const trimmed = query?.trim() ?? "";

  // A bare "2026-09-18" is a date, not a name. Promote it to the window so it
  // filters on delivery dates instead of failing a regex against text fields —
  // that mismatch is what made date questions return "nothing matched".
  const queryIsDateKey = trimmed.length > 0 && isValidDateKey(trimmed);
  const explicitRange = resolveRange(startDate, endDate);
  const range =
    explicitRange ?? (queryIsDateKey ? resolveRange(trimmed, trimmed) : null);

  const textQuery = queryIsDateKey ? "" : trimmed;
  const hasText = textQuery.length >= MIN_QUERY_LENGTH;

  if (!hasText && !range) {
    throw new SearchQueryTooShortError();
  }

  const normalizedQuery = textQuery.slice(0, MAX_QUERY_LENGTH);
  const pattern = escapeRegex(normalizedQuery);
  const phoneRegex = hasText ? buildPhoneRegex(normalizedQuery) : null;
  const resolvedLimit = clampSearchLimit(limit);

  const ordersFilter = combineFilters(
    hasText ? buildOrdersFilter(normalizedQuery, pattern, phoneRegex) : null,
    range ? ordersDateClause(range) : null
  );
  const customOrdersFilter = combineFilters(
    hasText
      ? buildCustomOrdersFilter(normalizedQuery, pattern, phoneRegex)
      : null,
    range ? customOrdersDateClause(range) : null
  );

  const [maps, raw] = await Promise.all([
    getHumanReadableLookupMaps(),
    withMongoClient(async (client) => {
      const db = client.db(process.env.MONGODB_DB_NAME);

      const [orders, customOrders] = await Promise.all([
        db
          .collection("orders")
          .find(ordersFilter)
          // A date search reads as a schedule, so show it chronologically.
          .sort(
            range
              ? { "deliveryInfo.deliveryDates.date": 1 }
              : { createdAt: -1 }
          )
          .limit(resolvedLimit)
          .toArray(),
        range
          ? db
              .collection("custom_orders")
              .aggregate<WithId<Document>>([
                { $match: customOrdersFilter },
                // BSON orders strings before dates, so the legacy string rows
                // would all bunch at the top of a chronological list — and win
                // the limit on a wide range. Normalize before sorting.
                {
                  $addFields: {
                    sortDate: {
                      $convert: {
                        input: "$date",
                        to: "date",
                        onError: null,
                        onNull: null,
                      },
                    },
                  },
                },
                { $sort: { sortDate: 1 } },
                { $limit: resolvedLimit },
                { $project: { sortDate: 0 } },
              ])
              .toArray()
          : db
              .collection("custom_orders")
              .find(customOrdersFilter)
              .sort({ date: -1 })
              .limit(resolvedLimit)
              .toArray(),
      ]);

      return { orders, customOrders };
    }),
  ]);

  const orders = raw.orders.map((doc) => shapeOrder(doc, maps));
  const customOrders = raw.customOrders.map((doc) =>
    shapeCustomOrder(doc, maps)
  );

  const dateRange = range
    ? { startDate: range.startKey, endDate: range.endKey }
    : undefined;

  return {
    query: normalizedQuery || undefined,
    dateRange,
    /** One label describing what was actually searched, for prose and the UI. */
    criteria: describeCriteria(normalizedQuery, dateRange),
    limit: resolvedLimit,
    counts: {
      orders: orders.length,
      customOrders: customOrders.length,
      total: orders.length + customOrders.length,
    },
    truncated:
      orders.length === resolvedLimit || customOrders.length === resolvedLimit,
    orders,
    customOrders,
  };
}

function describeCriteria(
  query: string,
  dateRange: { startDate: string; endDate: string } | undefined
): string {
  const parts: string[] = [];
  if (query) parts.push(`"${query}"`);
  if (dateRange) {
    parts.push(
      dateRange.startDate === dateRange.endDate
        ? dateRange.startDate
        : `${dateRange.startDate} to ${dateRange.endDate}`
    );
  }
  return parts.join(" · ");
}

export type SearchResult = Awaited<ReturnType<typeof searchBakeryRecords>>;
