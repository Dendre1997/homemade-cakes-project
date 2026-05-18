import { getAppSettings } from "@/lib/api/settings";
import CheckoutClientPage from "@/components/(client)/checkout/CheckoutClientPage";
import CheckoutBlocked from "@/components/(client)/checkout/CheckoutBlocked";

export const dynamic = "force-dynamic";

const IS_CHECKOUT_ENABLED = false; // Centralized local constant to toggle client checkout access

export default async function CheckoutPage() {
  if (!IS_CHECKOUT_ENABLED) {
    return <CheckoutBlocked />;
  }

  const settings = await getAppSettings();

  return <CheckoutClientPage isDeliveryEnabled={settings.checkout.isDeliveryEnabled} />;
}
