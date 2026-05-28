/**
 * Public, read-only endpoint for client-facing availability settings.
 *
 * SAFE TO CALL FROM ANY CLIENT — no authentication required.
 *
 * Returns ONLY the data needed to render the date picker calendar:
 *   - isDeliveryEnabled    (to show/hide the Delivery option)
 *   - disabledMessage      (to explain why delivery is off)
 *
 * Intentionally omits all sensitive admin fields (pickup address,
 * delivery fees, internal notes, support config, etc.).
 */

export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getAppSettings } from "@/lib/api/settings";

export async function GET() {
  try {
    const settings = await getAppSettings();

    // Only expose the checkout fields the calendar UI actually needs.
    // Never expose pickupAddress, deliveryFee, or any other admin-only data.
    const publicPayload = {
      checkout: {
        isDeliveryEnabled: settings.checkout.isDeliveryEnabled,
        disabledMessage: settings.checkout.disabledMessage ?? "",
        pickupAddress: settings.checkout.pickupAddress ?? "",
      },
    };

    return NextResponse.json(publicPayload);
  } catch (error) {
    console.error("[/api/shop/availability-settings] Failed to load settings:", error);
    // Return safe defaults so the UI still renders rather than crashing.
    return NextResponse.json({
      checkout: {
        isDeliveryEnabled: false,
        disabledMessage: "",
      },
    });
  }
}
