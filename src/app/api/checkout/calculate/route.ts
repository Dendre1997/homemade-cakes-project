import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/db";
import { calculateOrderPricing } from "@/lib/pricing";

export async function POST(request: NextRequest) {
  try {
    const { items, promoCode } = await request.json();

    if (!items || items.length === 0) {
      return NextResponse.json({
        subtotal: 0,
        discountTotal: 0,
        finalTotal: 0,
        appliedDiscount: null,
      });
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);

    // Use the robust server-side logic from pricing.ts
    const { subtotal, discountTotal, finalTotal, appliedCode, itemBreakdown } =
      await calculateOrderPricing(db, items, promoCode);

    return NextResponse.json({
      subtotal,
      discountTotal,
      finalTotal,
      appliedDiscount: discountTotal > 0 ? "Discount Applied" : null,
      appliedCode,
      itemBreakdown,

      // Error handling: If a code was sent but resulted in no discount/code application
      error:
        promoCode && !appliedCode ? "Invalid or not applicable code" : null,
    });
  } catch (error) {
    console.error("Calculation error:", error);
    return NextResponse.json({ error: "Calculation failed" }, { status: 500 });
  }
}
