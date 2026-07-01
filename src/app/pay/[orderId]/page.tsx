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

interface PayPageProps {
  params: Promise<{ orderId: string }>;
  searchParams: Promise<{ token?: string }>;
}

function InvalidLink() {
  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md bg-card-background rounded-large shadow-lg border border-border p-8 text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-error/10 text-error mb-4">
          <AlertTriangle className="w-7 h-7" />
        </div>
        <h1 className="font-heading text-2xl text-primary">
          Invalid or Expired Payment Link
        </h1>
        <p className="text-sm text-primary/60 mt-3 leading-relaxed">
          This payment link is not valid. It may have been mistyped, or the
          order it points to could not be found. Please contact us and we&apos;ll
          be happy to send you a fresh link.
        </p>
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

export default async function PayPage({ params, searchParams }: PayPageProps) {
  const { orderId } = await params;
  const { token } = await searchParams;

  // Guard: token is required and orderId must be a valid ObjectId.
  if (!token || !ObjectId.isValid(orderId)) {
    return <InvalidLink />;
  }

  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB_NAME);

  // STRICT match: both the id AND the secure token must line up.
  const order = await db.collection("orders").findOne({
    _id: new ObjectId(orderId),
    paymentToken: token,
  });

  if (!order) {
    return <InvalidLink />;
  }

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
