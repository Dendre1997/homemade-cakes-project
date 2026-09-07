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

/**
 * Unified text search across `orders` and `custom_orders`.
 *
 * Lives outside the route handler so the AI tool can call it in-process
 * instead of paying for an HTTP round trip back into our own API.
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
  query: string;
  limit?: number;
}

export class SearchQueryTooShortError extends Error {
  constructor() {
    super(`Search query must be at least ${MIN_QUERY_LENGTH} characters.`);
    this.name = "SearchQueryTooShortError";
  }
}

export function clampSearchLimit(value: number | undefined): number {
  if (value === undefined || !Number.isFinite(value)) {
    return DEFAULT_SEARCH_LIMIT;
  }
  return Math.min(Math.max(Math.trunc(value), 1), MAX_SEARCH_LIMIT);
}

export async function searchBakeryRecords({ query, limit }: SearchArgs) {
  const trimmed = query.trim();
  if (trimmed.length < MIN_QUERY_LENGTH) {
    throw new SearchQueryTooShortError();
  }

  const normalizedQuery = trimmed.slice(0, MAX_QUERY_LENGTH);
  const pattern = escapeRegex(normalizedQuery);
  const phoneRegex = buildPhoneRegex(normalizedQuery);
  const resolvedLimit = clampSearchLimit(limit);

  const [maps, raw] = await Promise.all([
    getHumanReadableLookupMaps(),
    withMongoClient(async (client) => {
      const db = client.db(process.env.MONGODB_DB_NAME);

      const [orders, customOrders] = await Promise.all([
        db
          .collection("orders")
          .find(buildOrdersFilter(normalizedQuery, pattern, phoneRegex))
          .sort({ createdAt: -1 })
          .limit(resolvedLimit)
          .toArray(),
        db
          .collection("custom_orders")
          .find(buildCustomOrdersFilter(normalizedQuery, pattern, phoneRegex))
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

  return {
    query: normalizedQuery,
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

export type SearchResult = Awaited<ReturnType<typeof searchBakeryRecords>>;
