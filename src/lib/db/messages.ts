import { ObjectId } from "mongodb";
import type { Document, Filter, WithId } from "mongodb";
import { withMongoClient } from "@/lib/db";
import {
  getHumanReadableLookupMaps,
  resolveName,
  type LookupMaps,
} from "@/lib/db/lookupMaps";
import { normalizeCustomOrder } from "@/lib/normalizeCustomOrder";
import { shortId } from "@/lib/ai/serialize";
import { DEFAULT_FROM, resend } from "@/lib/email";
import AdminMessageEmail from "@/emails/AdminMessageEmail";
import type {
  DraftSource,
  DraftSourceItem,
} from "@/lib/messages/draft";
import type {
  CakeTierSelection,
  CartItem,
  CustomOrder,
  CustomOrderItem,
  SelectedAddon,
} from "@/types";

/**
 * Shared messaging data access for both `POST /api/admin/messages/send` and the
 * Copilot tools. Tools call these helpers in-process — no internal HTTP hop.
 */

export type MessageOrderType = "regular" | "custom";

export class SendCustomerMessageError extends Error {
  constructor(
    message: string,
    readonly statusCode: number
  ) {
    super(message);
    this.name = "SendCustomerMessageError";
  }
}

/**
 * Guest checkouts without a real email get a synthetic `@placeholder.com`
 * address. Sending there bounces and damages domain reputation.
 */
const PLACEHOLDER_EMAIL_DOMAIN = "placeholder.com";

const OBJECT_ID_PATTERN = /^[0-9a-fA-F]{24}$/;

/** Below this, a numeric query is more likely an order total than a phone. */
const MIN_PHONE_DIGITS = 7;

/** How many candidates to pull per collection when resolving a free-text query. */
const LOOKUP_LIMIT = 5;

const baseUrl = process.env.NEXT_PUBLIC_API_URL
  ? process.env.NEXT_PUBLIC_API_URL
  : process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000";

/**
 * Exclusion-only projections: drop the heavy fields (§2) while keeping the
 * pricing and payment fields the draft builder needs. `paymentToken` is kept
 * deliberately — §10 lists the payment link as part of the baseline message —
 * and only ever leaves in `actionButton.url`, never in model prose.
 */
const ORDER_DRAFT_PROJECTION = {
  notesLog: 0,
  referenceImages: 0,
  "items.imageUrl": 0,
  "items.imageUrls": 0,
  "items.selectedConfig": 0,
} as const;

const CUSTOM_ORDER_DRAFT_PROJECTION = {
  referenceImages: 0,
  referenceImageUrls: 0,
  adminSelectedImage: 0,
  "items.referenceImages": 0,
} as const;

const ORDER_CONTACT_PROJECTION = {
  "customerInfo.name": 1,
  "customerInfo.email": 1,
  "customerInfo.phone": 1,
} as const;

const CUSTOM_ORDER_CONTACT_PROJECTION = { contact: 1 } as const;

export interface MessagingContact {
  name?: string;
  email?: string;
  phone?: string;
}

export interface MessagingTarget {
  orderId: string;
  orderType: MessageOrderType;
  shortId: string;
  contact: MessagingContact;
  draftSource: DraftSource;
}

// ─── query building ─────────────────────────────────────────────────────────

/** Neutralize regex metacharacters — the query string is untrusted input. */
function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Phones are stored with whatever formatting the customer typed, so a search
 * for "4035551234" must still match "(403) 555-1234".
 */
function buildPhoneRegex(query: string): RegExp | null {
  const digits = query.replace(/\D/g, "");
  if (digits.length < MIN_PHONE_DIGITS) return null;
  return new RegExp(digits.split("").join("\\D*"));
}

/** `_id` cannot take `$regex` directly — cast it first (§2). */
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

function buildOrderLookupFilter(
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
    ...buildIdClauses(query, pattern),
  ];

  if (phoneRegex) {
    clauses.push({ "customerInfo.phone": { $regex: phoneRegex } });
  }

  return { $or: clauses };
}

function buildCustomOrderLookupFilter(
  query: string,
  pattern: string,
  phoneRegex: RegExp | null
): Filter<Document> {
  const rx = { $regex: pattern, $options: "i" };
  const clauses: Filter<Document>[] = [
    { "contact.name": rx },
    { "contact.phone": rx },
    { "contact.email": rx },
    { "contact.socialNickname": rx },
    // Legacy flat documents stored the name at the root.
    { customerName: rx },
    ...buildIdClauses(query, pattern),
  ];

  if (phoneRegex) {
    clauses.push({ "contact.phone": { $regex: phoneRegex } });
  }

  return { $or: clauses };
}

// ─── document → DraftSource ─────────────────────────────────────────────────

function mapAddons(addons: SelectedAddon[] | undefined) {
  return addons
    ?.filter((addon) => addon?.name?.trim())
    .map((addon) => ({
      name: addon.variantName?.trim()
        ? `${addon.name} — ${addon.variantName}`
        : addon.name,
      price: Number(addon.price) || 0,
    }));
}

/**
 * Denormalized `flavorName` wins over the live lookup map (§2): it is a
 * historical snapshot and more accurate than today's catalog name.
 */
function tierFlavorText(
  tiers: CakeTierSelection[] | undefined,
  maps: LookupMaps
): string | undefined {
  if (!tiers?.length) return undefined;

  const parts = tiers
    .map((tier, index) => {
      const label =
        tier.flavorName?.trim() || resolveName(maps.flavors, tier.flavorId);
      if (!label) return null;
      return `Tier ${(tier.tierIndex ?? index) + 1}: ${label}`;
    })
    .filter((part): part is string => part !== null);

  return parts.length > 0 ? parts.join(", ") : undefined;
}

function orderItemToDraftItem(
  item: CartItem,
  maps: LookupMaps
): DraftSourceItem {
  const quantity = Number(item.quantity) || 1;
  const designQuote = Number(item.designQuote) || 0;
  const rowTotal =
    item.rowTotal !== undefined
      ? Number(item.rowTotal)
      : (Number(item.price) || 0) * quantity;

  return {
    label: item.name?.trim() || "Item",
    quantity,
    size: item.customSize?.trim() || resolveName(maps.diameters, item.diameterId),
    flavor:
      tierFlavorText(item.tiers, maps) ??
      (item.customFlavor?.trim() || resolveName(maps.flavors, item.flavor)),
    shape: item.customShape?.trim() || resolveName(maps.shapes, item.shapeId),
    inscription: item.inscription?.trim(),
    designNotes: item.designInstructions?.trim(),
    addons: mapAddons(item.addons),
    ...(designQuote > 0 ? { designQuote } : {}),
    ...(rowTotal > 0 ? { itemTotal: rowTotal } : {}),
  };
}

function customItemToDraftItem(
  item: CustomOrderItem,
  maps: LookupMaps
): DraftSourceItem {
  const breakdown = item.priceBreakdown;
  const designQuote = Number(item.designQuote) || 0;
  const agreed = Number(item.agreedPrice) || 0;

  return {
    label:
      item.category?.trim() ||
      resolveName(maps.categories, item.categoryId) ||
      "Custom Item",
    size: item.details?.size?.trim(),
    flavor:
      tierFlavorText(item.details?.tiers, maps) ?? item.details?.flavor?.trim(),
    shape: item.details?.shape?.trim(),
    inscription: item.details?.textOnCake?.trim(),
    designNotes: item.details?.designNotes?.trim(),
    addons: mapAddons(item.addons),
    ...(breakdown
      ? {
          baseCakePrice: breakdown.baseCakePrice,
          flavorUpcharge: breakdown.flavorUpcharge,
          addonsCost: breakdown.addonsCost,
        }
      : {}),
    ...(designQuote > 0 ? { designQuote } : {}),
    ...(agreed > 0 ? { itemTotal: agreed } : {}),
  };
}

/** Payment Hub link — only for unpaid regular orders that carry a token. */
function buildPaymentLink(doc: Document, orderId: string): string | undefined {
  if (doc.isPaid === true) return undefined;
  const token = typeof doc.paymentToken === "string" ? doc.paymentToken : null;
  if (!token) return undefined;
  return `${baseUrl}/pay/${orderId}?token=${token}`;
}

function orderToMessagingTarget(
  doc: WithId<Document>,
  maps: LookupMaps
): MessagingTarget {
  const orderId = doc._id.toString();
  const items: CartItem[] = Array.isArray(doc.items) ? doc.items : [];
  const firstDate = Array.isArray(doc.deliveryInfo?.deliveryDates)
    ? doc.deliveryInfo.deliveryDates[0]
    : undefined;

  return {
    orderId,
    orderType: "regular",
    shortId: shortId(orderId),
    contact: {
      name: doc.customerInfo?.name,
      email: doc.customerInfo?.email,
      phone: doc.customerInfo?.phone,
    },
    draftSource: {
      orderType: "regular",
      shortId: shortId(orderId),
      customerName: doc.customerInfo?.name,
      fulfillmentMethod:
        doc.deliveryInfo?.method === "delivery" ? "delivery" : "pickup",
      fulfillmentDate: firstDate?.date,
      timeSlot: firstDate?.timeSlot,
      paymentPreference: doc.paymentDetails?.expectedMethod,
      isPaid: Boolean(doc.isPaid),
      grandTotal:
        typeof doc.totalAmount === "number" ? doc.totalAmount : undefined,
      items: items.map((item) => orderItemToDraftItem(item, maps)),
      paymentLink: buildPaymentLink(doc, orderId),
    },
  };
}

function customOrderToMessagingTarget(
  doc: WithId<Document>,
  maps: LookupMaps
): MessagingTarget {
  // Never read custom_orders raw — legacy documents vary in shape (§2).
  const order: CustomOrder = normalizeCustomOrder(doc);
  const orderId = String(order._id);

  return {
    orderId,
    orderType: "custom",
    shortId: shortId(orderId),
    contact: {
      name: order.contact?.name,
      email: order.contact?.email,
      phone: order.contact?.phone,
    },
    draftSource: {
      orderType: "custom",
      shortId: shortId(orderId),
      customerName: order.contact?.name,
      fulfillmentMethod:
        order.deliveryMethod === "delivery" ? "delivery" : "pickup",
      fulfillmentDate: order.date,
      timeSlot: order.timeSlot,
      allergies: order.allergies,
      paymentPreference: order.paymentPreference,
      grandTotal: order.agreedPriceTotal,
      items: order.items.map((item) => customItemToDraftItem(item, maps)),
    },
  };
}

// ─── lookups ────────────────────────────────────────────────────────────────

export interface FindMessagingTargetResult {
  target: MessagingTarget | null;
  /** Additional records that also matched, so the caller can flag ambiguity. */
  otherMatches: number;
}

/**
 * Resolve a free-text query (ObjectId, 6-char short code, name, phone, email)
 * to a single best messaging target. Regular orders outrank custom requests
 * because a placed order is the more actionable record; within each collection
 * the most recent wins.
 */
export async function findMessagingTarget(
  orderQuery: string
): Promise<FindMessagingTargetResult> {
  const trimmed = orderQuery.trim().slice(0, 100);
  if (trimmed.length < 2) {
    throw new SendCustomerMessageError(
      "orderQuery must be at least 2 characters.",
      400
    );
  }

  const pattern = escapeRegex(trimmed);
  const phoneRegex = buildPhoneRegex(trimmed);

  const [maps, raw] = await Promise.all([
    getHumanReadableLookupMaps(),
    withMongoClient(async (client) => {
      const db = client.db(process.env.MONGODB_DB_NAME);

      const [orders, customOrders] = await Promise.all([
        db
          .collection("orders")
          .find(buildOrderLookupFilter(trimmed, pattern, phoneRegex), {
            projection: ORDER_DRAFT_PROJECTION,
          })
          .sort({ createdAt: -1 })
          .limit(LOOKUP_LIMIT)
          .toArray(),
        db
          .collection("custom_orders")
          .find(buildCustomOrderLookupFilter(trimmed, pattern, phoneRegex), {
            projection: CUSTOM_ORDER_DRAFT_PROJECTION,
          })
          .sort({ date: -1 })
          .limit(LOOKUP_LIMIT)
          .toArray(),
      ]);

      return { orders, customOrders };
    }),
  ]);

  const totalMatches = raw.orders.length + raw.customOrders.length;

  if (raw.orders.length > 0) {
    return {
      target: orderToMessagingTarget(raw.orders[0], maps),
      otherMatches: totalMatches - 1,
    };
  }

  if (raw.customOrders.length > 0) {
    return {
      target: customOrderToMessagingTarget(raw.customOrders[0], maps),
      otherMatches: totalMatches - 1,
    };
  }

  return { target: null, otherMatches: 0 };
}

/** Load one known order by id, with everything the draft builder needs. */
export async function loadMessagingTarget(
  orderId: string,
  orderType: MessageOrderType
): Promise<MessagingTarget | null> {
  if (!OBJECT_ID_PATTERN.test(orderId)) {
    throw new SendCustomerMessageError(
      "orderId must be a 24-character ObjectId.",
      400
    );
  }

  const [maps, doc] = await Promise.all([
    getHumanReadableLookupMaps(),
    withMongoClient(async (client) => {
      const db = client.db(process.env.MONGODB_DB_NAME);
      const _id = new ObjectId(orderId);

      return orderType === "regular"
        ? db
            .collection("orders")
            .findOne({ _id }, { projection: ORDER_DRAFT_PROJECTION })
        : db
            .collection("custom_orders")
            .findOne({ _id }, { projection: CUSTOM_ORDER_DRAFT_PROJECTION });
    }),
  ]);

  if (!doc) return null;

  return orderType === "regular"
    ? orderToMessagingTarget(doc, maps)
    : customOrderToMessagingTarget(doc, maps);
}

/** Contact-only read for the send path — cheaper than a full draft load. */
export async function loadOrderContact(
  orderId: string,
  orderType: MessageOrderType
): Promise<MessagingContact | null> {
  return withMongoClient(async (client) => {
    const db = client.db(process.env.MONGODB_DB_NAME);
    const _id = new ObjectId(orderId);

    if (orderType === "regular") {
      const doc = await db
        .collection("orders")
        .findOne({ _id }, { projection: ORDER_CONTACT_PROJECTION });

      if (!doc) return null;
      return {
        name: doc.customerInfo?.name,
        email: doc.customerInfo?.email,
        phone: doc.customerInfo?.phone,
      };
    }

    const doc = await db
      .collection("custom_orders")
      .findOne({ _id }, { projection: CUSTOM_ORDER_CONTACT_PROJECTION });

    if (!doc) return null;

    const normalized = normalizeCustomOrder(doc);
    return {
      name: normalized.contact?.name,
      email: normalized.contact?.email,
      phone: normalized.contact?.phone,
    };
  });
}

// ─── send ───────────────────────────────────────────────────────────────────

/**
 * Emails are case-insensitive in practice and admins retype them with stray
 * whitespace, so compare on the normalized form rather than the raw string.
 */
function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * Whether an address can actually receive mail. Lets callers disable a "Send
 * email" affordance up front instead of surfacing a 422 after the fact.
 */
export function isSendableEmail(email: string | undefined): boolean {
  const value = email?.trim();
  if (!value) return false;
  if (normalizeEmail(value).endsWith(`@${PLACEHOLDER_EMAIL_DOMAIN}`)) {
    return false;
  }
  return value.includes("@");
}

export interface SendCustomerMessageInput {
  orderId: string;
  orderType: MessageOrderType;
  recipientEmail: string;
  subject: string;
  bodyText: string;
  actionButton?: { label: string; url: string };
  adminUid: string;
  /** Distinguishes a Copilot send from a dashboard send in the audit trail. */
  tool?: string;
}

export interface SendCustomerMessageResult {
  success: true;
  messageId: string;
  recipientEmail: string;
  subject: string;
}

/**
 * Send a one-off branded message to the customer attached to an order.
 *
 * The recipient is validated against the address stored on the order (§11), so
 * neither an admin typo nor a hallucinated AI argument can address a stranger.
 * Every send is written to `ai_action_log` (§6).
 */
export async function sendCustomerMessage({
  orderId,
  orderType,
  recipientEmail,
  subject,
  bodyText,
  actionButton,
  adminUid,
  tool = "sendCustomerMessage",
}: SendCustomerMessageInput): Promise<SendCustomerMessageResult> {
  if (!OBJECT_ID_PATTERN.test(orderId)) {
    throw new SendCustomerMessageError(
      "orderId must be a 24-character ObjectId.",
      400
    );
  }

  const contact = await loadOrderContact(orderId, orderType);

  if (!contact) {
    throw new SendCustomerMessageError(
      `No ${orderType === "regular" ? "order" : "custom request"} found for that id.`,
      404
    );
  }

  const storedEmail = contact.email?.trim();

  if (!storedEmail) {
    throw new SendCustomerMessageError(
      "This order has no customer email on file.",
      422
    );
  }

  if (normalizeEmail(storedEmail).endsWith(`@${PLACEHOLDER_EMAIL_DOMAIN}`)) {
    throw new SendCustomerMessageError(
      "This order uses a placeholder email address. Reach the customer by phone or social DM instead.",
      422
    );
  }

  // ── THE GUARDRAIL (§11): recipient must be the customer on the order ──
  if (normalizeEmail(recipientEmail) !== normalizeEmail(storedEmail)) {
    throw new SendCustomerMessageError(
      "Recipient does not match order customer",
      403
    );
  }

  // Send to the STORED address, not the request's — the two are already proven
  // equal, and this removes any doubt about which one wins.
  const { data, error: resendError } = await resend.emails.send({
    from: DEFAULT_FROM,
    to: storedEmail,
    replyTo: process.env.ADMIN_EMAIL || undefined,
    subject,
    react: AdminMessageEmail({
      customerName: contact.name?.trim() || "there",
      bodyText,
      orderNumber: shortId(orderId),
      actionButton,
    }),
  });

  if (resendError || !data?.id) {
    console.error("[sendCustomerMessage] Resend failed:", resendError);
    throw new SendCustomerMessageError(
      resendError?.message || "Email delivery failed.",
      502
    );
  }

  const messageId = data.id;
  const now = new Date();
  const result: SendCustomerMessageResult = {
    success: true,
    messageId,
    recipientEmail: storedEmail,
    subject,
  };

  // Audit AFTER a confirmed send: the email cannot be unsent, so a log written
  // beforehand would be a lie on delivery failure. An unlogged send is loud in
  // the server logs instead.
  try {
    await withMongoClient(async (client) =>
      client
        .db(process.env.MONGODB_DB_NAME)
        .collection("ai_action_log")
        .insertOne({
          adminUid,
          tool,
          action: "send_customer_message",
          orderId,
          orderType,
          input: {
            orderId,
            orderType,
            recipientEmail: storedEmail,
            subject,
            bodyText,
            ...(actionButton ? { actionButton } : {}),
          },
          output: result,
          approvedAt: now,
          targetCollection: orderType === "regular" ? "orders" : "custom_orders",
          targetId: orderId,
          createdAt: now,
        })
    );
  } catch (auditError) {
    console.error(
      `[sendCustomerMessage] AUDIT WRITE FAILED for sent message ${messageId} (order ${orderId}):`,
      auditError
    );
  }

  return result;
}
