import type { Document, Filter, WithId } from "mongodb";
import { withMongoClient } from "@/lib/db";
import { compact, shortId } from "@/lib/ai/serialize";
import {
  normalizeEmail,
  normalizePhoneDigits,
} from "@/lib/crm/normalize";

/** Neutralize regex metacharacters — search input is untrusted. */
function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const CANCELLED_STATUSES = ["cancelled"] as const;
const FULFILLED_STATUSES = ["delivered"] as const;

const UNPAID_ACTIVE_FILTER = {
  isPaid: false,
  status: { $nin: [...CANCELLED_STATUSES, ...FULFILLED_STATUSES] },
} as const;

/** Paid revenue only — cancelled orders never count toward LTV. */
const LTV_FILTER = {
  isPaid: true,
  status: { $nin: [...CANCELLED_STATUSES] },
} as const;

const ORDER_LIST_PROJECTION = {
  _id: 1,
  status: 1,
  totalAmount: 1,
  isPaid: 1,
  createdAt: 1,
  "customerInfo.name": 1,
  "customerInfo.phone": 1,
  "customerInfo.email": 1,
  "customerInfo.notes": 1,
  "customerInfo.phoneDigits": 1,
} as const;

export interface CustomerHistoryInput {
  phone?: string;
  email?: string;
  nameQuery?: string;
}

export interface CustomerHistoryProfile {
  found: true;
  customerQuery: string;
  name?: string;
  phone?: string;
  email?: string;
  totalOrdersCount: number;
  lifetimeValue: number;
  unpaidBalance: number;
  favoriteFlavors: Array<{ flavor: string; count: number }>;
  recentOrders: Array<{
    _id: string;
    shortId: string;
    date?: string;
    status?: string;
    totalAmount?: number;
    isPaid: boolean;
  }>;
  allergiesAndNotes: string[];
}

export type CustomerHistoryNotFound = {
  found: false;
  customerQuery: string;
  message: string;
};

export type CustomerHistoryResult =
  | CustomerHistoryProfile
  | CustomerHistoryNotFound;

const MIN_PHONE_DIGITS = 7;

export function classifyCustomerQuery(
  customerQuery: string
): CustomerHistoryInput {
  const trimmed = customerQuery.trim();
  if (!trimmed) return {};

  if (trimmed.includes("@")) {
    return { email: trimmed };
  }

  const digits = normalizePhoneDigits(trimmed);
  const looksLikePhone =
    digits.length >= MIN_PHONE_DIGITS &&
    /^[\d\s().+\-]+$/.test(trimmed.replace(/\s/g, ""));

  if (looksLikePhone) {
    return { phone: trimmed };
  }

  return { nameQuery: trimmed };
}

function buildNameRegexFilter(field: string, nameQuery: string): Filter<Document> {
  const pattern = escapeRegex(nameQuery.trim());
  return { [field]: { $regex: pattern, $options: "i" } };
}

function buildEmailFilter(field: string, email: string): Filter<Document> {
  const normalized = normalizeEmail(email);
  if (!normalized) return {};
  return {
    $expr: {
      $eq: [
        {
          $toLower: {
            $trim: { input: { $ifNull: [`$${field}`, ""] } },
          },
        },
        normalized,
      ],
    },
  };
}

function buildPhoneFilter(field: string, phone: string): Filter<Document> | null {
  const digits = normalizePhoneDigits(phone);
  if (digits.length < MIN_PHONE_DIGITS) return null;
  return { [field]: digits };
}

type IdentityKey = { phoneDigits?: string; email?: string };

function identityKeysFromOrder(doc: WithId<Document>): IdentityKey[] {
  const keys: IdentityKey[] = [];
  const phoneDigits = doc.customerInfo?.phoneDigits as string | undefined;
  if (phoneDigits?.trim()) {
    keys.push({ phoneDigits: phoneDigits.trim() });
  }
  const email = normalizeEmail(doc.customerInfo?.email as string | undefined);
  if (email) {
    keys.push({ email });
  }
  return keys;
}

function sameIdentity(a: IdentityKey, b: IdentityKey): boolean {
  if (a.phoneDigits && b.phoneDigits && a.phoneDigits === b.phoneDigits) {
    return true;
  }
  if (a.email && b.email && a.email === b.email) {
    return true;
  }
  return false;
}

function mergeIdentityKeys(keys: IdentityKey[]): IdentityKey | null {
  if (keys.length === 0) return null;
  const root = keys[0];
  for (let index = 1; index < keys.length; index += 1) {
    if (!sameIdentity(root, keys[index])) {
      return null;
    }
  }
  return {
    phoneDigits: root.phoneDigits ?? keys.find((k) => k.phoneDigits)?.phoneDigits,
    email: root.email ?? keys.find((k) => k.email)?.email,
  };
}

function buildOrdersIdentityFilter(identity: IdentityKey): Filter<Document> {
  const clauses: Filter<Document>[] = [];
  if (identity.phoneDigits) {
    clauses.push({ "customerInfo.phoneDigits": identity.phoneDigits });
  }
  if (identity.email) {
    clauses.push(buildEmailFilter("customerInfo.email", identity.email));
  }
  if (clauses.length === 0) {
    return { _id: { $exists: false } };
  }
  return clauses.length === 1 ? clauses[0] : { $or: clauses };
}

function buildCustomOrdersIdentityFilter(identity: IdentityKey): Filter<Document> {
  const clauses: Filter<Document>[] = [];
  if (identity.phoneDigits) {
    clauses.push({ "contact.phoneDigits": identity.phoneDigits });
  }
  if (identity.email) {
    clauses.push(buildEmailFilter("contact.email", identity.email));
  }
  if (clauses.length === 0) {
    return { _id: { $exists: false } };
  }
  return clauses.length === 1 ? clauses[0] : { $or: clauses };
}

async function resolveIdentity(
  input: CustomerHistoryInput
): Promise<IdentityKey | "ambiguous" | "none"> {
  if (input.phone) {
    const filter = buildPhoneFilter("customerInfo.phoneDigits", input.phone);
    if (!filter) return "none";
    return {
      phoneDigits: normalizePhoneDigits(input.phone),
    };
  }

  if (input.email) {
    const normalized = normalizeEmail(input.email);
    if (!normalized) return "none";
    return { email: normalized };
  }

  if (input.nameQuery) {
    const nameFilter = buildNameRegexFilter(
      "customerInfo.name",
      input.nameQuery
    );
    const samples = await withMongoClient(async (client) =>
      client
        .db(process.env.MONGODB_DB_NAME)
        .collection("orders")
        .find(nameFilter, { projection: ORDER_LIST_PROJECTION })
        .sort({ createdAt: -1 })
        .limit(40)
        .toArray()
    );

    if (samples.length === 0) return "none";

    const keys = samples.flatMap((doc) => identityKeysFromOrder(doc));
    if (keys.length === 0) return "none";

    const merged = mergeIdentityKeys(keys);
    if (!merged) return "ambiguous";
    return merged;
  }

  return "none";
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export async function buildCustomerHistory(
  customerQuery: string,
  inputOverride?: CustomerHistoryInput
): Promise<CustomerHistoryResult> {
  const trimmedQuery = customerQuery.trim();
  const input = inputOverride ?? classifyCustomerQuery(trimmedQuery);

  if (!input.phone && !input.email && !input.nameQuery) {
    return {
      found: false,
      customerQuery: trimmedQuery,
      message: "Enter a customer phone, email, or name to look up.",
    };
  }

  const identity = await resolveIdentity(input);
  if (identity === "none") {
    return {
      found: false,
      customerQuery: trimmedQuery,
      message: `No customer matched "${trimmedQuery}".`,
    };
  }
  if (identity === "ambiguous") {
    return {
      found: false,
      customerQuery: trimmedQuery,
      message: `Several customers match "${trimmedQuery}". Try a phone number or email instead.`,
    };
  }

  const orderMatch = buildOrdersIdentityFilter(identity);
  const customMatch = buildCustomOrdersIdentityFilter(identity);

  const [aggregateRow, customNotesRows, profileOrder, profileCustom] =
    await withMongoClient(
    async (client) => {
      const db = client.db(process.env.MONGODB_DB_NAME);
      const orders = db.collection("orders");

      const [facetResult, customDocs, latestOrder, latestCustom] =
        await Promise.all([
        orders
          .aggregate([
            { $match: orderMatch },
            {
              $facet: {
                totals: [
                  {
                    $group: {
                      _id: null,
                      totalOrdersCount: { $sum: 1 },
                    },
                  },
                ],
                ltv: [
                  { $match: LTV_FILTER },
                  {
                    $group: {
                      _id: null,
                      lifetimeValue: { $sum: "$totalAmount" },
                    },
                  },
                ],
                unpaid: [
                  { $match: UNPAID_ACTIVE_FILTER },
                  {
                    $group: {
                      _id: null,
                      unpaidBalance: { $sum: "$totalAmount" },
                    },
                  },
                ],
                flavors: [
                  { $unwind: "$items" },
                  {
                    $project: {
                      quantity: { $ifNull: ["$items.quantity", 1] },
                      flavorLabels: {
                        $concatArrays: [
                          {
                            $cond: [
                              {
                                $and: [
                                  { $eq: [{ $type: "$items.flavor" }, "string"] },
                                  { $ne: ["$items.flavor", ""] },
                                ],
                              },
                              ["$items.flavor"],
                              [],
                            ],
                          },
                          {
                            $cond: [
                              {
                                $and: [
                                  {
                                    $eq: [
                                      { $type: "$items.customFlavor" },
                                      "string",
                                    ],
                                  },
                                  { $ne: ["$items.customFlavor", ""] },
                                ],
                              },
                              ["$items.customFlavor"],
                              [],
                            ],
                          },
                          {
                            $map: {
                              input: { $ifNull: ["$items.tiers", []] },
                              as: "tier",
                              in: "$$tier.flavorName",
                            },
                          },
                        ],
                      },
                    },
                  },
                  { $unwind: "$flavorLabels" },
                  {
                    $match: {
                      flavorLabels: { $type: "string", $ne: "" },
                    },
                  },
                  {
                    $group: {
                      _id: "$flavorLabels",
                      count: { $sum: "$quantity" },
                    },
                  },
                  { $sort: { count: -1 } },
                  { $limit: 8 },
                ],
                recent: [
                  { $sort: { createdAt: -1 } },
                  { $limit: 5 },
                  {
                    $project: {
                      _id: 1,
                      status: 1,
                      totalAmount: 1,
                      isPaid: 1,
                      createdAt: 1,
                    },
                  },
                ],
                orderNotes: [
                  {
                    $project: {
                      note: {
                        $trim: {
                          input: { $ifNull: ["$customerInfo.notes", ""] },
                        },
                      },
                    },
                  },
                  { $match: { note: { $ne: "" } } },
                ],
              },
            },
          ])
          .toArray(),
        db
          .collection("custom_orders")
          .find(customMatch, {
            projection: {
              allergies: 1,
              "contact.notes": 1,
              "items.details.designNotes": 1,
            },
          })
          .limit(30)
          .toArray(),
        orders.findOne(orderMatch, {
          projection: ORDER_LIST_PROJECTION,
          sort: { createdAt: -1 },
        }),
        db.collection("custom_orders").findOne(customMatch, {
          projection: {
            "contact.name": 1,
            "contact.phone": 1,
            "contact.email": 1,
            createdAt: 1,
          },
          sort: { createdAt: -1 },
        }),
      ]);

      return [
        facetResult[0] as Document | undefined,
        customDocs,
        latestOrder,
        latestCustom,
      ];
    }
  );

  const totals = (aggregateRow?.totals as Document[] | undefined)?.[0];
  const ltvRow = (aggregateRow?.ltv as Document[] | undefined)?.[0];
  const unpaidRow = (aggregateRow?.unpaid as Document[] | undefined)?.[0];
  const flavorRows = (aggregateRow?.flavors as Document[] | undefined) ?? [];
  const recentRows = (aggregateRow?.recent as Document[] | undefined) ?? [];
  const orderNoteRows =
    (aggregateRow?.orderNotes as Document[] | undefined) ?? [];

  const noteSet = new Set<string>();
  for (const row of orderNoteRows) {
    const note = row.note as string;
    if (note.trim()) noteSet.add(note.trim());
  }
  for (const doc of customNotesRows) {
    const allergies = doc.allergies as string | undefined;
    if (allergies?.trim()) noteSet.add(allergies.trim());
    const contactNotes = doc.contact?.notes as string | undefined;
    if (contactNotes?.trim()) noteSet.add(contactNotes.trim());
    const items = doc.items as Document[] | undefined;
    if (Array.isArray(items)) {
      for (const item of items) {
        const designNotes = item.details?.designNotes as string | undefined;
        if (designNotes?.trim()) noteSet.add(designNotes.trim());
      }
    }
  }

  const profileDoc = profileOrder as WithId<Document> | null;
  const customDoc = profileCustom as Document | null;
  const hasOrderHistory = (totals?.totalOrdersCount as number | undefined) ?? 0;

  const profileFields = compact({
    name:
      (profileDoc?.customerInfo?.name as string | undefined) ??
      (customDoc?.contact?.name as string | undefined),
    phone:
      (profileDoc?.customerInfo?.phone as string | undefined) ??
      (customDoc?.contact?.phone as string | undefined),
    email:
      (profileDoc?.customerInfo?.email as string | undefined) ??
      (customDoc?.contact?.email as string | undefined),
    totalOrdersCount: totals?.totalOrdersCount ?? 0,
    lifetimeValue: roundMoney(ltvRow?.lifetimeValue ?? 0),
    unpaidBalance: roundMoney(unpaidRow?.unpaidBalance ?? 0),
    favoriteFlavors: flavorRows.map((row) => ({
      flavor: String(row._id),
      count: row.count as number,
    })),
    recentOrders: recentRows
      .map((row) => {
        const oid = row._id?.toString();
        if (!oid) return null;
        const createdAt = row.createdAt as Date | undefined;
        return compact({
          _id: oid,
          shortId: shortId(oid),
          date: createdAt ? createdAt.toISOString() : undefined,
          status: row.status as string | undefined,
          totalAmount:
            typeof row.totalAmount === "number" ? row.totalAmount : undefined,
          isPaid: Boolean(row.isPaid),
        }) as CustomerHistoryProfile["recentOrders"][number];
      })
      .filter(
        (row): row is CustomerHistoryProfile["recentOrders"][number] =>
          row !== null
      ),
    allergiesAndNotes: [...noteSet],
  });

  if (
    hasOrderHistory === 0 &&
    customNotesRows.length === 0 &&
    !profileFields.name &&
    !profileFields.phone &&
    !profileFields.email
  ) {
    return {
      found: false,
      customerQuery: trimmedQuery,
      message: `No customer matched "${trimmedQuery}".`,
    };
  }

  return {
    found: true,
    customerQuery: trimmedQuery,
    ...profileFields,
    totalOrdersCount: profileFields.totalOrdersCount ?? 0,
    lifetimeValue: profileFields.lifetimeValue ?? 0,
    unpaidBalance: profileFields.unpaidBalance ?? 0,
    favoriteFlavors: profileFields.favoriteFlavors ?? [],
    recentOrders: profileFields.recentOrders ?? [],
    allergiesAndNotes: profileFields.allergiesAndNotes ?? [],
  };
}
