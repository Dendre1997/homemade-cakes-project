import { ObjectId } from "mongodb";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import type { Metadata } from "next";
import clientPromise from "@/lib/db";
import { getAppSettings } from "@/lib/api/settings";
import PaymentHubClient from "@/components/payment/PaymentHubClient";

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

  return (
    <PaymentHubClient
      orderId={orderId}
      totalAmount={order.totalAmount ?? 0}
      eTransferEmail={eTransferEmail}
      reference={orderId.slice(-6).toUpperCase()}
    />
  );
}
