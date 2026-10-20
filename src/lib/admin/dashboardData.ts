import type { Document, WithId } from "mongodb";
import { withMongoClient } from "@/lib/db";
import { fetchTopFlavorsLast7Days, type TopFlavorRow } from "@/lib/db/analyticsSnippet";
import {
  computeDayCapacity,
  getBakeryToday,
  utcDayRange,
  type DayCapacity,
} from "@/lib/db/capacity";
import {
  CUSTOM_ORDER_LIST_PROJECTION,
  ORDER_LIST_PROJECTION,
} from "@/lib/db/orderProjections";
import { normalizeCustomOrder } from "@/lib/normalizeCustomOrder";
import { CustomOrder, Order, OrderStatus } from "@/types";

const ACTIVE_CHAT_STATUSES = ["waiting_admin", "admin_active"] as const;

const PRODUCTION_STATUSES = [
  OrderStatus.NEW,
  OrderStatus.PAID,
  OrderStatus.IN_PROGRESS,
  OrderStatus.READY,
] as const;

const PENDING_CUSTOM_FILTER = {
  $or: [
    { status: "pending_review" },
    { status: { $exists: false } },
    { status: null },
  ],
};

export type DashboardSupportPreview = {
  chatId: string;
  displayName: string;
  updatedAt: string;
};

export type AdminDashboardPayload = {
  kpi: {
    inboxCount: number;
    pendingConfirmationCount: number;
    dueTodayCount: number;
  };
  inboxOrders: Order[];
  pendingConfirmationOrders: Order[];
  productionQueue: Order[];
  flavorMap: Record<string, string>;
  todayCapacity: DayCapacity;
  todayKey: string;
  customLeadsTop3: CustomOrder[];
  support: {
    unreadCount: number;
    preview: DashboardSupportPreview | null;
  };
  analytics: {
    topFlavors7d: TopFlavorRow[];
  };
  errorMsg: string | null;
};

function serializeOrder(order: WithId<Document>): Order {
  const deliveryInfo = order.deliveryInfo ?? { deliveryDates: [] };
  const mapped = {
    ...order,
    _id: order._id.toString(),
    deliveryInfo: {
      ...deliveryInfo,
      deliveryDates: (deliveryInfo.deliveryDates ?? []).map(
        (d: { date: Date | string }) => ({
          ...d,
          date: new Date(d.date),
        })
      ),
    },
  };
  return JSON.parse(JSON.stringify(mapped)) as Order;
}

function buildProductionQueue(
  nextDeliveries: WithId<Document>[],
  startOfToday: Date
): Order[] {
  const productionQueue = nextDeliveries.map((order) => {
    const sortedDates = (order.deliveryInfo?.deliveryDates ?? [])
      .map((d: { date: Date | string }) => ({
        ...d,
        dateObj: new Date(d.date),
      }))
      .sort(
        (a: { dateObj: Date }, b: { dateObj: Date }) =>
          a.dateObj.getTime() - b.dateObj.getTime()
      );

    const upcoming = sortedDates.filter(
      (d: { dateObj: Date }) => d.dateObj >= startOfToday
    );
    const past = sortedDates.filter(
      (d: { dateObj: Date }) => d.dateObj < startOfToday
    );

    const reorderedDates = [...upcoming, ...past].map(
      (d: { dateObj: Date; date?: Date | string }) => ({
        ...d,
        date: d.dateObj,
      })
    );

    return {
      ...order,
      _id: order._id.toString(),
      deliveryInfo: {
        ...order.deliveryInfo,
        deliveryDates: reorderedDates,
      },
    };
  });

  return JSON.parse(JSON.stringify(productionQueue)) as Order[];
}

const EMPTY_PAYLOAD: AdminDashboardPayload = {
  kpi: {
    inboxCount: 0,
    pendingConfirmationCount: 0,
    dueTodayCount: 0,
  },
  inboxOrders: [],
  pendingConfirmationOrders: [],
  productionQueue: [],
  flavorMap: {},
  todayCapacity: {
    date: getBakeryToday(),
    isBlocked: false,
    workMinutes: 0,
    bookedMinutes: 0,
    availableMinutes: 0,
    utilizationPercent: 0,
    isFull: false,
    availableHours: [],
    leadTimeDays: 3,
    isWithinLeadTime: false,
  },
  todayKey: getBakeryToday(),
  customLeadsTop3: [],
  support: { unreadCount: 0, preview: null },
  analytics: { topFlavors7d: [] },
  errorMsg: null,
};

export async function getAdminDashboardPayload(): Promise<AdminDashboardPayload> {
  try {
    return await withMongoClient(async (client) => {
      const db = client.db(process.env.MONGODB_DB_NAME);
      const todayKey = getBakeryToday();
      const { start, end } = utcDayRange(todayKey);
      const startOfToday = start;

      const dueTodayMatch = {
        "deliveryInfo.deliveryDates.date": { $gte: start, $lte: end },
        status: { $in: [...PRODUCTION_STATUSES] },
      };

      const [
        inboxCount,
        pendingConfirmationCount,
        dueTodayCount,
        pendingConfirmationOrdersRaw,
        inboxOrdersRaw,
        nextDeliveriesRaw,
        flavorsRaw,
        settings,
        categories,
        ordersOnDateRaw,
        customLeadsRaw,
        supportUnreadCount,
        supportPreviewRows,
        topFlavors7d,
      ] = await Promise.all([
        db.collection("orders").countDocuments({
          status: { $in: [OrderStatus.NEW, OrderStatus.PAID] },
        }),
        db.collection("orders").countDocuments({
          status: OrderStatus.PENDING_CONFIRMATION,
        }),
        db.collection("orders").countDocuments(dueTodayMatch),
        db
          .collection("orders")
          .find(
            { status: OrderStatus.PENDING_CONFIRMATION },
            { projection: ORDER_LIST_PROJECTION }
          )
          .sort({ createdAt: 1 })
          .toArray(),
        db
          .collection("orders")
          .find(
            { status: { $in: [OrderStatus.NEW, OrderStatus.PAID] } },
            { projection: ORDER_LIST_PROJECTION }
          )
          .sort({ createdAt: 1 })
          .toArray(),
        db
          .collection("orders")
          .find(
            {
              "deliveryInfo.deliveryDates.date": { $gte: startOfToday },
              status: { $in: [...PRODUCTION_STATUSES] },
            },
            { projection: ORDER_LIST_PROJECTION }
          )
          .sort({ "deliveryInfo.deliveryDates.date": 1 })
          .limit(5)
          .toArray(),
        db
          .collection("flavors")
          .find({}, { projection: { name: 1 } })
          .toArray(),
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
              status: { $ne: OrderStatus.CANCELLED },
            },
            { projection: ORDER_LIST_PROJECTION }
          )
          .toArray(),
        db
          .collection("custom_orders")
          .find(PENDING_CUSTOM_FILTER, {
            projection: CUSTOM_ORDER_LIST_PROJECTION,
          })
          .sort({ date: 1 })
          .limit(3)
          .toArray(),
        db.collection("chats").countDocuments({
          status: { $in: [...ACTIVE_CHAT_STATUSES] },
          hasUnread: true,
        }),
        db
          .collection("chats")
          .aggregate([
            {
              $match: {
                status: { $in: [...ACTIVE_CHAT_STATUSES] },
                hasUnread: true,
              },
            },
            { $sort: { updatedAt: -1 } },
            { $limit: 1 },
            {
              $addFields: {
                userObjectId: { $toObjectId: "$userId" },
              },
            },
            {
              $lookup: {
                from: "users",
                localField: "userObjectId",
                foreignField: "_id",
                as: "userData",
              },
            },
            {
              $unwind: { path: "$userData", preserveNullAndEmptyArrays: true },
            },
            {
              $project: {
                _id: 1,
                updatedAt: 1,
                userName: "$userData.name",
                userEmail: "$userData.email",
              },
            },
          ])
          .toArray(),
        fetchTopFlavorsLast7Days(db),
      ]);

      const flavorMap: Record<string, string> = {};
      flavorsRaw.forEach((f) => {
        flavorMap[f._id.toString()] = f.name as string;
      });

      const todayCapacity = computeDayCapacity({
        dateKey: todayKey,
        todayKey,
        settings,
        categories,
        ordersOnDate: ordersOnDateRaw,
      });

      const customLeadsTop3 = customLeadsRaw.map((order) =>
        normalizeCustomOrder({
          ...order,
          _id: order._id.toString(),
          contact: order.contact || {
            name: order.customerName || "Legacy Customer",
            email: order.customerEmail || "",
            phone: order.customerPhone || "",
          },
          date: order.date || order.eventDate,
          category: order.category || order.eventType || "Unknown",
          details: order.details || {
            size: order.servingSize || "",
            flavor: order.flavorPreferences || "",
            textOnCake: "",
            designNotes: order.description || "",
          },
          referenceImages:
            order.referenceImages || order.referenceImageUrls || [],
        })
      ) as CustomOrder[];

      let supportPreview: DashboardSupportPreview | null = null;
      const previewDoc = supportPreviewRows[0] as
        | {
            _id: { toString(): string };
            updatedAt?: Date | string;
            userName?: string;
            userEmail?: string;
          }
        | undefined;

      if (previewDoc) {
        const displayName =
          previewDoc.userName?.trim() ||
          previewDoc.userEmail?.trim() ||
          "Customer";
        supportPreview = {
          chatId: previewDoc._id.toString(),
          displayName,
          updatedAt: new Date(
            previewDoc.updatedAt ?? Date.now()
          ).toISOString(),
        };
      }

      return {
        kpi: {
          inboxCount,
          pendingConfirmationCount,
          dueTodayCount,
        },
        inboxOrders: inboxOrdersRaw.map(serializeOrder),
        pendingConfirmationOrders: JSON.parse(
          JSON.stringify(pendingConfirmationOrdersRaw)
        ) as Order[],
        productionQueue: buildProductionQueue(nextDeliveriesRaw, startOfToday),
        flavorMap,
        todayCapacity,
        todayKey,
        customLeadsTop3,
        support: {
          unreadCount: supportUnreadCount,
          preview: supportPreview,
        },
        analytics: { topFlavors7d },
        errorMsg: null,
      };
    });
  } catch (error) {
    console.error("Admin dashboard database fetch failed:", error);
    return {
      ...EMPTY_PAYLOAD,
      todayKey: getBakeryToday(),
      errorMsg:
        "We timed out trying to connect to the database. This frequently occurs during cold starts. Please reload the page to try again.",
    };
  }
}
