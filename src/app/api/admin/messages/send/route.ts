import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { verifyAdminAPI } from "@/lib/auth/adminOnly";
import { withMongoClient } from "@/lib/db";
import { mongoUnavailableResponse } from "@/lib/db/mongoHttp";
import { DEFAULT_FROM, resend } from "@/lib/email";
import { shortId } from "@/lib/ai/serialize";
import { normalizeCustomOrder } from "@/lib/normalizeCustomOrder";
import AdminMessageEmail from "@/emails/AdminMessageEmail";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * Guest checkouts without a real email get a synthetic `@placeholder.com`
 * address. Sending there bounces and can hurt domain reputation.
 */
const PLACEHOLDER_EMAIL_DOMAIN = "placeholder.com";

/** Hosts allowed to use `http:` — everything customer-facing must be https. */
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

/**
 * `z.url()` accepts `javascript:` and `data:` URLs. This button is rendered
 * inside a branded, customer-facing email, so an unchecked scheme here is a
 * phishing / script-injection vector — especially once an AI tool populates it.
 */
const actionButtonSchema = z.object({
  label: z.string().trim().min(1).max(60),
  url: z
    .url()
    .refine((value) => {
      let parsed: URL;
      try {
        parsed = new URL(value);
      } catch {
        return false;
      }
      if (parsed.protocol === "https:") return true;
      return parsed.protocol === "http:" && LOCAL_HOSTS.has(parsed.hostname);
    }, "actionButton.url must be an https:// link."),
});

const sendMessageSchema = z.object({
  orderId: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, "orderId must be a 24-character ObjectId."),
  orderType: z.enum(["regular", "custom"]),
  recipientEmail: z.email(),
  subject: z.string().trim().min(3).max(200),
  bodyText: z.string().trim().min(10).max(5000),
  actionButton: actionButtonSchema.optional(),
});

type SendMessageInput = z.infer<typeof sendMessageSchema>;

/** Only the contact fields — never pull item arrays or reference images. */
const ORDER_CONTACT_PROJECTION = {
  "customerInfo.name": 1,
  "customerInfo.email": 1,
} as const;

const CUSTOM_ORDER_CONTACT_PROJECTION = { contact: 1 } as const;

/**
 * Emails are case-insensitive in practice and admins retype them with stray
 * whitespace, so compare on the normalized form rather than the raw string.
 */
function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

type OrderContact = { name?: string; email?: string };

async function loadOrderContact(
  orderId: string,
  orderType: SendMessageInput["orderType"]
): Promise<OrderContact | null> {
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
      };
    }

    const doc = await db
      .collection("custom_orders")
      .findOne({ _id }, { projection: CUSTOM_ORDER_CONTACT_PROJECTION });

    if (!doc) return null;

    // Never read custom_orders raw — legacy documents vary in shape (§2).
    const normalized = normalizeCustomOrder(doc);
    return {
      name: normalized.contact?.name,
      email: normalized.contact?.email,
    };
  });
}

/**
 * Send a one-off branded message to the customer attached to an order.
 *
 * This route is the ONLY sanctioned path for ad-hoc outbound email (§1c). The
 * recipient is validated against the address stored on the order, so neither an
 * admin typo nor a future AI tool can address a stranger.
 */
export async function POST(request: Request) {
  const session = await verifyAdminAPI();
  if (!("user" in session) || !session.user) {
    return NextResponse.json(
      { error: "error" in session ? session.error : "Unauthorized" },
      { status: "status" in session ? session.status : 401 }
    );
  }

  const adminUid = session.user.firebaseUid || "unknown-admin";

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = sendMessageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: parsed.error.issues
          .map((issue) => `${issue.path.join(".") || "body"}: ${issue.message}`)
          .join("; "),
      },
      { status: 400 }
    );
  }

  const { orderId, orderType, recipientEmail, subject, bodyText, actionButton } =
    parsed.data;

  try {
    const contact = await loadOrderContact(orderId, orderType);

    if (!contact) {
      return NextResponse.json(
        {
          error: `No ${orderType === "regular" ? "order" : "custom request"} found for that id.`,
        },
        { status: 404 }
      );
    }

    const storedEmail = contact.email?.trim();

    if (!storedEmail) {
      return NextResponse.json(
        { error: "This order has no customer email on file." },
        { status: 422 }
      );
    }

    if (normalizeEmail(storedEmail).endsWith(`@${PLACEHOLDER_EMAIL_DOMAIN}`)) {
      return NextResponse.json(
        {
          error:
            "This order uses a placeholder email address. Reach the customer by phone or social DM instead.",
        },
        { status: 422 }
      );
    }

    // ── THE GUARDRAIL (§11): recipient must be the customer on the order ──
    if (normalizeEmail(recipientEmail) !== normalizeEmail(storedEmail)) {
      return NextResponse.json(
        { error: "Recipient does not match order customer" },
        { status: 403 }
      );
    }

    const orderNumber = shortId(orderId);

    // Send to the STORED address, not the request's — the two are already
    // proven equal, and this removes any doubt about which one wins.
    const { data, error: resendError } = await resend.emails.send({
      from: DEFAULT_FROM,
      to: storedEmail,
      replyTo: process.env.ADMIN_EMAIL || undefined,
      subject,
      react: AdminMessageEmail({
        customerName: contact.name?.trim() || "there",
        bodyText,
        orderNumber,
        actionButton,
      }),
    });

    if (resendError || !data?.id) {
      console.error("[POST /api/admin/messages/send] Resend failed:", resendError);
      return NextResponse.json(
        { error: resendError?.message || "Email delivery failed." },
        { status: 502 }
      );
    }

    const messageId = data.id;
    const now = new Date();

    // Audit AFTER a confirmed send: the email cannot be unsent, so a logged
    // failure would be a lie. An unlogged send is loud in the server logs.
    try {
      await withMongoClient(async (client) =>
        client
          .db(process.env.MONGODB_DB_NAME)
          .collection("ai_action_log")
          .insertOne({
            adminUid,
            tool: "sendCustomerMessage",
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
            output: { success: true, messageId },
            approvedAt: now,
            targetCollection:
              orderType === "regular" ? "orders" : "custom_orders",
            targetId: orderId,
            createdAt: now,
          })
      );
    } catch (auditError) {
      console.error(
        `[POST /api/admin/messages/send] AUDIT WRITE FAILED for sent message ${messageId} (order ${orderId}):`,
        auditError
      );
    }

    return NextResponse.json({ success: true, messageId });
  } catch (error) {
    console.error("[POST /api/admin/messages/send]", error);
    return (
      mongoUnavailableResponse(error) ??
      NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    );
  }
}
