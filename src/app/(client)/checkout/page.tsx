import { getAppSettings } from "@/lib/api/settings";
import CheckoutClientPage from "@/components/(client)/checkout/CheckoutClientPage";

export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const settings = await getAppSettings();

  return <CheckoutClientPage isDeliveryEnabled={settings.checkout.isDeliveryEnabled} />;
}
