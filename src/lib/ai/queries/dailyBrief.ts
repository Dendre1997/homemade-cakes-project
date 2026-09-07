import type { Document, WithId } from "mongodb";
import { withMongoClient } from "@/lib/db";
import {
  BAKERY_TIME_ZONE,
  computeDayCapacity,
  getBakeryToday,
  isValidDateKey,
  toDateKey,
  utcDayRange,
  type DayCapacity,
} from "@/lib/db/capacity";
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
 * The single aggregation behind the daily briefing. Extracted from the route so
 * the AI tool can call it directly without an internal HTTP hop.
 */

/** Keeps the payload inside a reasonable prompt budget. */
const LIST_LIMIT = 10;

/**
 * Heavy fields an LLM never needs. Excluding them at the driver level means
 * they never cross the wire, not just that they get dropped afterwards.
 */
const ORDER_PROJECTION = {
  notesLog: 0,
  paymentToken: 0,
  referenceImages: 0,
  "items.imageUrl": 0,
  "items.imageUrls": 0,
  "items.selectedConfig": 0,
} as const;

const CUSTOM_ORDER_PROJECTION = {
  "items.referenceImages": 0,
  "items.priceBreakdown": 0,
  referenceImages: 0,
  referenceImageUrls: 0,
  adminSelectedImage: 0,
} as const;

export class InvalidDateKeyError extends Error {
  constructor() {
    super('Parameter "date" must be in YYYY-MM-DD format.');
    this.name = "InvalidDateKeyError";
  }
}

function daysBetween(
  from: Date | string | undefined,
  toKey: string
): number | undefined {
  if (!from) return undefined;
  const fromKey = toDateKey(from);
  if (!fromKey) return undefined;
  const diffMs =
    new Date(`${toKey}T00:00:00.000Z`).getTime() -
    new Date(`${fromKey}T00:00:00.000Z`).getTime();
  return Math.round(diffMs / 86_400_000);
}

/** Only the delivery-date entries falling on the target day. */
function slotsForDate(doc: WithId<Document>, dateKey: string) {
  const deliveryDates = doc.deliveryInfo?.deliveryDates;
  if (!Array.isArray(deliveryDates)) return [];

  return deliveryDates
    .filter(
      (entry: Document) => entry?.date && toDateKey(entry.date) === dateKey
    )
    .map((entry: Document) =>
      compact({ timeSlot: entry.timeSlot, itemCount: entry.itemIds?.length })
    );
}

function shapeTodaysOrder(
  doc: WithId<Document>,
  dateKey: string,
  maps: LookupMaps
) {
  const id = doc._id.toString();

  return compact({
    _id: id,
    shortId: shortId(id),
    status: doc.status,
    isPaid: Boolean(doc.isPaid),
    totalAmount: doc.totalAmount,
    fulfillmentMethod: doc.deliveryInfo?.method,
    address:
      doc.deliveryInfo?.method === "delivery"
        ? doc.deliveryInfo?.address
        : undefined,
    slots: slotsForDate(doc, dateKey),
    customer: shapeCustomer(doc.customerInfo),
    items: Array.isArray(doc.items)
      ? doc.items.map((item: Document) => shapeOrderItem(item, maps))
      : [],
  });
}

function shapeUnpaidOrder(doc: WithId<Document>, todayKey: string) {
  const id = doc._id.toString();

  const dueDate = Array.isArray(doc.deliveryInfo?.deliveryDates)
    ? doc.deliveryInfo.deliveryDates
        .map((entry: Document) => toDateKey(entry?.date))
        .filter(Boolean)
        .sort()[0]
    : undefined;

  return compact({
    _id: id,
    shortId: shortId(id),
    status: doc.status,
    totalAmount: doc.totalAmount,
    createdAt: doc.createdAt,
    ageDays: daysBetween(doc.createdAt, todayKey),
    dueDate,
    expectedMethod:
      doc.paymentDetails?.expectedMethod ?? doc.paymentDetails?.method,
    hasPaymentLink: Boolean(doc.paymentToken),
    customer: shapeCustomer(doc.customerInfo),
  });
}

function shapePendingRequest(
  doc: WithId<Document>,
  todayKey: string,
  maps: LookupMaps
) {
  const normalized = normalizeCustomOrder(doc);
  const id = String(normalized._id);
  const eventDateKey = normalized.date ? toDateKey(normalized.date) : undefined;

  return compact({
    _id: id,
    shortId: shortId(id),
    eventDate: eventDateKey,
    daysUntilEvent: eventDateKey
      ? daysBetween(todayKey, eventDateKey)
      : undefined,
    timeSlot: normalized.timeSlot,
    deliveryMethod: normalized.deliveryMethod,
    allergies: normalized.allergies,
    paymentPreference: normalized.paymentPreference,
    approximatePriceTotal: normalized.approximatePriceTotal,
    agreedPriceTotal: normalized.agreedPriceTotal,
    createdAt: normalized.createdAt,
    waitingDays: daysBetween(normalized.createdAt, todayKey),
    contact: compact({
      name: normalized.contact?.name ?? doc.customerName,
      phone: normalized.contact?.phone,
      email: normalized.contact?.email,
      social: normalized.contact?.socialNickname,
    }),
    items: normalized.items.map((item) => shapeCustomOrderItem(item, maps)),
  });
}

function buildSummary(
  capacity: DayCapacity,
  todaysOrders: ReturnType<typeof shapeTodaysOrder>[],
  unpaidCount: number,
  unpaidAmount: number,
  pendingCount: number
) {
  const itemsToMake = todaysOrders.reduce(
    (sum, order) =>
      sum +
      (order.items ?? []).reduce(
        (itemSum, item) => itemSum + (Number(item.quantity) || 0),
        0
      ),
    0
  );

  const unpaidToday = todaysOrders.filter((order) => !order.isPaid).length;

  return {
    ordersDueToday: todaysOrders.length,
    itemsToMake,
    unpaidDueToday: unpaidToday,
    capacityUsedPercent: capacity.utilizationPercent,
    minutesRemaining: capacity.availableMinutes,
    outstandingPaymentsCount: unpaidCount,
    outstandingPaymentsAmount: Math.round(unpaidAmount * 100) / 100,
    pendingCustomRequests: pendingCount,
  };
}

export interface DailyBriefArgs {
  /** `YYYY-MM-DD`. Defaults to today in the bakery's local time zone. */
  date?: string | null;
}

export async function buildDailyBrief({ date }: DailyBriefArgs = {}) {
  const todayKey = getBakeryToday();
  const requested = date?.trim() ?? null;

  if (requested !== null && requested !== "" && !isValidDateKey(requested)) {
    throw new InvalidDateKeyError();
  }

  const dateKey = requested && requested !== "" ? requested : todayKey;
  const { start, end } = utcDayRange(dateKey);

  const [maps, data] = await Promise.all([
    getHumanReadableLookupMaps(),
    withMongoClient(async (client) => {
      const db = client.db(process.env.MONGODB_DB_NAME);

      const unpaidFilter = {
        isPaid: false,
        status: { $nin: ["cancelled"] },
      };
      const pendingFilter = { status: "pending_review" };

      const [
        settings,
        categories,
        ordersOnDate,
        unpaidOrders,
        unpaidStats,
        pendingRequests,
        pendingCount,
      ] = await Promise.all([
        db.collection("settings").findOne({}),
        db
          .collection("categories")
          .find({}, { projection: { name: 1, manufacturingTimeInMinutes: 1 } })
          .toArray(),
        db
          .collection("orders")
          .find(
            {
              "deliveryInfo.deliveryDates.date": { $gte: start, $lte: end },
              status: { $nin: ["cancelled"] },
            },
            { projection: ORDER_PROJECTION }
          )
          .toArray(),
        db
          .collection("orders")
          .find(unpaidFilter, { projection: ORDER_PROJECTION })
          .sort({ createdAt: 1 })
          .limit(LIST_LIMIT)
          .toArray(),
        db
          .collection("orders")
          .aggregate([
            { $match: unpaidFilter },
            {
              $group: {
                _id: null,
                count: { $sum: 1 },
                amount: { $sum: "$totalAmount" },
              },
            },
          ])
          .toArray(),
        db
          .collection("custom_orders")
          .find(pendingFilter, { projection: CUSTOM_ORDER_PROJECTION })
          .sort({ createdAt: 1 })
          .limit(LIST_LIMIT)
          .toArray(),
        db.collection("custom_orders").countDocuments(pendingFilter),
      ]);

      return {
        settings,
        categories,
        ordersOnDate,
        unpaidOrders,
        unpaidCount: (unpaidStats[0]?.count as number | undefined) ?? 0,
        unpaidAmount: (unpaidStats[0]?.amount as number | undefined) ?? 0,
        pendingRequests,
        pendingCount,
      };
    }),
  ]);

  const capacity = computeDayCapacity({
    dateKey,
    todayKey,
    settings: data.settings,
    categories: data.categories,
    ordersOnDate: data.ordersOnDate,
  });

  const todaysOrders = data.ordersOnDate.map((doc) =>
    shapeTodaysOrder(doc, dateKey, maps)
  );
  const unpaidOrders = data.unpaidOrders.map((doc) =>
    shapeUnpaidOrder(doc, todayKey)
  );
  const pendingCustomRequests = data.pendingRequests.map((doc) =>
    shapePendingRequest(doc, todayKey, maps)
  );

  return {
    date: dateKey,
    today: todayKey,
    isToday: dateKey === todayKey,
    timeZone: BAKERY_TIME_ZONE,
    summary: buildSummary(
      capacity,
      todaysOrders,
      data.unpaidCount,
      data.unpaidAmount,
      data.pendingCount
    ),
    capacity,
    todaysOrders,
    unpaidOrders: {
      totalCount: data.unpaidCount,
      totalAmount: Math.round(data.unpaidAmount * 100) / 100,
      truncated: data.unpaidCount > unpaidOrders.length,
      items: unpaidOrders,
    },
    pendingCustomRequests: {
      totalCount: data.pendingCount,
      truncated: data.pendingCount > pendingCustomRequests.length,
      items: pendingCustomRequests,
    },
  };
}

export type DailyBriefResult = Awaited<ReturnType<typeof buildDailyBrief>>;
