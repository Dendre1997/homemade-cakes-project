import { ObjectId } from "mongodb";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import type { Metadata } from "next";
import clientPromise from "@/lib/db";
import { getAppSettings } from "@/lib/api/settings";
import PaymentHubClient from "@/components/payment/PaymentHubClient";
import type { PublicOrderSummary, PublicOrderAddon } from "@/types";

export const metadata: Metadata = {
  title: "Complete Your Payment | D&K Creations",
  robots: { index: false, follow: false },
};

// Payment links are per-order and token-guarded; never cache.
export const dynamic = "force-dynamic";
// The MongoDB driver relies on TCP sockets — force the Node.js runtime so this
// page never gets optimized onto the Edge runtime (which would fail server selection).
export const runtime = "nodejs";

interface PayPageProps {
  params: Promise<{ orderId: string }>;
  searchParams: Promise<{ token?: string }>;
}

function PayNotice({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md bg-card-background rounded-large shadow-lg border border-border p-8 text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-error/10 text-error mb-4">
          <AlertTriangle className="w-7 h-7" />
        </div>
        <h1 className="font-heading text-2xl text-primary">{title}</h1>
        <p className="text-sm text-primary/60 mt-3 leading-relaxed">{message}</p>
        <Link
          href="/contact"
          className="inline-block mt-6 rounded-medium bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent/90 transition-colors"
        >
          Contact Us
        </Link>
      </div>
    </main>
  );
}

function InvalidLink() {
  return (
    <PayNotice
      title="Invalid or Expired Payment Link"
      message="This payment link is not valid. It may have been mistyped, or the order it points to could not be found. Please contact us and we'll be happy to send you a fresh link."
    />
  );
}

// ── contact masking helpers ──────────────────────────────────────────────────
function maskEmail(email?: string): string | undefined {
  const trimmed = email?.trim();
  if (!trimmed || trimmed.includes("placeholder.com")) return undefined;
  const [local, domain] = trimmed.split("@");
  if (!domain || !local) return undefined;
  return `${local.charAt(0)}***@${domain}`;
}

function maskPhone(phone?: string): string | undefined {
  const digits = phone?.replace(/\D/g, "") ?? "";
  if (digits.length < 4) return undefined;
  return `***-***-${digits.slice(-4)}`;
}

function formatDeliveryAddress(
  address:
    | string
    | { street?: string; unit?: string; city?: string; postalCode?: string }
    | undefined
): string {
  if (!address) return "";
  if (typeof address === "string") return address.trim();
  const streetLine = [address.street, address.unit].filter(Boolean).join(", ");
  return [streetLine, address.city, address.postalCode].filter(Boolean).join(", ");
}

interface ScrubContext {
  flavorMap: Record<string, string>;
  diameterMap: Record<string, string>;
  shapeMap: Record<string, string>;
  pickupAddress?: string;
  eTransferEmail?: string;
}

/**
 * Scrubs a raw Order document into a customer-safe PublicOrderSummary.
 * STRICTLY drops: notesLog, claimedByUid, paymentToken, source,
 * paymentDetails.transactionId. Masks contact data and derives pricing here so
 * the client never sees DB internals or how the total is composed.
 */
function mapToPublicOrder(order: any, ctx: ScrubContext): PublicOrderSummary {
  const { flavorMap, diameterMap, shapeMap, pickupAddress, eTransferEmail } = ctx;

  const resolveFlavor = (id?: unknown): string => {
    if (!id) return "";
    const key = String(id);
    if (key.length === 24 && /^[0-9a-fA-F]+$/.test(key)) return flavorMap[key] || key;
    return key;
  };
  const resolveDiameter = (id?: unknown): string => {
    if (!id) return "";
    const key = String(id);
    return diameterMap[key] || key;
  };
  const resolveShape = (id?: unknown): string => {
    if (!id) return "";
    const key = String(id);
    if (key.length === 24 && /^[0-9a-fA-F]+$/.test(key)) return shapeMap[key] || "";
    return key;
  };

  const rawItems: any[] = Array.isArray(order.items) ? order.items : [];
  const referenceImages: string[] = Array.isArray(order.referenceImages)
    ? order.referenceImages
    : [];

  const items = rawItems.map((item) => {
    const isCustom = item.productType === "custom" || item.isCustom;

    const displaySize = isCustom
      ? item.customSize ||
        resolveDiameter(item.diameterId || item.selectedConfig?.cake?.diameterId)
      : resolveDiameter(item.diameterId);
    const displayShape = isCustom
      ? item.customShape ||
        resolveShape(item.shapeId || item.selectedConfig?.cake?.shapeId)
      : resolveShape(item.shapeId);
    const displayFlavor = isCustom
      ? item.customFlavor ||
        resolveFlavor(item.selectedConfig?.cake?.flavorId || item.flavor)
      : resolveFlavor(item.flavor || item.selectedConfig?.cake?.flavorId);

    // Show EVERY image the customer will care about: prefer the item's own
    // gallery; otherwise fall back to the FULL set of uploaded reference images
    // (custom orders store all references on the order, not on the item).
    let imageUrls: string[];
    if (item.imageUrls?.length) {
      imageUrls = item.imageUrls;
    } else if (referenceImages.length) {
      imageUrls = referenceImages;
    } else if (item.imageUrl) {
      imageUrls = [item.imageUrl];
    } else {
      imageUrls = [];
    }

    const addons: PublicOrderAddon[] = (item.addons || []).map((a: any) => ({
      name: a.name,
      variantName: a.variantName,
      price: Number(a.price) || 0,
      itemQuantity: Number(item.quantity) || 1,
    }));

    return {
      name: item.name,
      quantity: Number(item.quantity) || 0,
      rowTotal: Number(item.rowTotal ?? item.price * item.quantity) || 0,
      displaySize: displaySize || undefined,
      displayShape: displayShape || undefined,
      displayFlavor: displayFlavor || undefined,
      flavorNote: item.flavorNote || undefined,
      inscription: item.inscription || undefined,
      designInstructions: item.designInstructions || undefined,
      imageUrls,
      isCombo: !!item.isCombo,
      comboCenter:
        item.isCombo && item.selectedConfig?.cake
          ? {
              flavorName: resolveFlavor(item.selectedConfig.cake.flavorId),
              inscription: item.selectedConfig.cake.inscription || undefined,
            }
          : undefined,
      comboBox:
        item.isCombo && item.selectedConfig?.items?.length
          ? {
              label: item.selectedConfig.quantityConfigId,
              items: item.selectedConfig.items.map((si: any) => ({
                count: Number(si.count) || 0,
                flavorName: resolveFlavor(si.flavorId),
              })),
            }
          : undefined,
      addons,
    };
  });

  const addonsFlat: PublicOrderAddon[] = rawItems.flatMap((item) =>
    (item.addons || []).map((a: any) => ({
      name: a.name,
      variantName: a.variantName,
      price: Number(a.price) || 0,
      itemQuantity: Number(item.quantity) || 1,
    }))
  );
  const addonsCost = rawItems.reduce((acc, item) => {
    const perItem = (item.addons || []).reduce(
      (s: number, a: any) => s + (Number(a.price) || 0),
      0
    );
    return acc + perItem * (Number(item.quantity) || 1);
  }, 0);

  const total = Number(order.totalAmount) || 0;
  const baseCakePrice = Math.max(0, total - addonsCost);

  const deliveryDates = Array.isArray(order.deliveryInfo?.deliveryDates)
    ? order.deliveryInfo.deliveryDates.map((d: any) => ({
        date: d?.date ? new Date(d.date).toISOString() : "",
        timeSlot: d?.timeSlot || undefined,
      }))
    : [];

  const method: "pickup" | "delivery" =
    order.deliveryInfo?.method === "delivery" ? "delivery" : "pickup";

  return {
    orderIdShort: String(order._id).slice(-6).toUpperCase(),
    createdAt: order.createdAt ? new Date(order.createdAt).toISOString() : null,
    customer: {
      name: order.customerInfo?.name?.trim() || undefined,
      emailMasked: maskEmail(order.customerInfo?.email),
      phoneMasked: maskPhone(order.customerInfo?.phone),
      socialPlatform: order.customerInfo?.socialPlatform,
      socialNickname: order.customerInfo?.socialNickname?.trim() || undefined,
    },
    fulfillment: {
      method,
      deliveryDates,
      addressText:
        method === "delivery"
          ? formatDeliveryAddress(order.deliveryInfo?.address)
          : undefined,
    },
    items,
    pricing: {
      baseCakePrice,
      addons: addonsFlat,
      discount:
        order.discountInfo && Number(order.discountInfo.amount) > 0
          ? {
              code: order.discountInfo.code,
              name: order.discountInfo.name,
              amount: Number(order.discountInfo.amount) || 0,
            }
          : undefined,
      total,
    },
    payment: {
      isPaid: !!order.isPaid,
      // Only the expected method is exposed — transactionId is intentionally dropped.
      expectedMethod: order.paymentDetails?.expectedMethod,
    },
    pickupAddress,
    eTransferEmail,
  };
}

export default async function PayPage({ params, searchParams }: PayPageProps) {
  const { orderId } = await params;
  const { token } = await searchParams;

  // (1) VALIDATE FIRST — a non-24-char / non-hex id must never reach `new ObjectId()`.
  //     Passing an invalid id to the driver can throw or stall server selection.
  if (!token || !ObjectId.isValid(orderId)) {
    console.warn(
      `[/pay] Rejected invalid params: orderId="${orderId}", hasToken=${!!token}`
    );
    return <InvalidLink />;
  }

  let order;
  let flavorMap: Record<string, string> = {};
  let diameterMap: Record<string, string> = {};
  let shapeMap: Record<string, string> = {};
  try {
    // (2) Reuse the app-wide cached, pooled client — do NOT instantiate a new MongoClient.
    //     Timed separately so the logs reveal whether the CONNECT or the QUERY stalls.
    const tConnect = Date.now();
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);
    console.log(`[/pay] Mongo client acquired in ${Date.now() - tConnect}ms`);

    // STRICT match: both the id AND the secure token must line up.
    const tQuery = Date.now();
    order = await db.collection("orders").findOne({
      _id: new ObjectId(orderId),
      paymentToken: token,
    });
    console.log(
      `[/pay] Order query finished in ${Date.now() - tQuery}ms (found=${!!order})`
    );

    // Resolve id → name maps server-side so the public payload carries no raw ids.
    if (order) {
      const [flavors, diameters, shapes] = await Promise.all([
        db.collection("flavors").find({}).toArray(),
        db.collection("diameters").find({}).toArray(),
        db.collection("shapes").find({}).toArray(),
      ]);
      flavorMap = flavors.reduce((acc, f) => {
        acc[String(f._id)] = f.name;
        return acc;
      }, {} as Record<string, string>);
      diameterMap = diameters.reduce((acc, d) => {
        acc[String(d._id)] = d.name || `${d.sizeValue ?? ""}"`;
        return acc;
      }, {} as Record<string, string>);
      shapeMap = shapes.reduce((acc, s) => {
        acc[String(s._id)] = s.name;
        return acc;
      }, {} as Record<string, string>);
    }
  } catch (err) {
    // (3) Log the REAL error (name/message/code/stack) BEFORE rendering the fallback UI,
    //     so the actual cause is visible in the Vercel / server logs.
    const e = err as Error & { code?: unknown };
    console.error("[/pay] DB error while loading order:", {
      name: e?.name,
      message: e?.message,
      code: e?.code,
      orderId,
      dbName: process.env.MONGODB_DB_NAME ?? "(undefined)",
      stack: e?.stack,
    });
    return (
      <PayNotice
        title="Payment Page Temporarily Unavailable"
        message="We couldn't load your payment details right now. Please refresh the page in a moment, or contact us if the problem persists."
      />
    );
  }

  if (!order) {
    return <InvalidLink />;
  }

  // getAppSettings() uses the same cached client and safely falls back to defaults on error.
  const settings = await getAppSettings();
  const eTransferEmail = settings.eTransferEmail?.trim() || "";
  const pickupAddress = settings.checkout?.pickupAddress?.trim() || "";

  const publicOrder = mapToPublicOrder(order, {
    flavorMap,
    diameterMap,
    shapeMap,
    pickupAddress,
    eTransferEmail,
  });

  return (
    <PaymentHubClient
      totalAmount={publicOrder.pricing.total}
      eTransferEmail={eTransferEmail}
      reference={publicOrder.orderIdShort}
      order={publicOrder}
    />
  );
}
