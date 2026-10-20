import { formatPhoneForMessaging } from "@/lib/messages/draft";

export type CustomerPhoneActionLinks = {
  tel: string;
  sms: string;
  whatsApp: string;
};

/** Builds tel / sms / WhatsApp hrefs; null when phone cannot be normalized. */
export function buildCustomerPhoneActionLinks(
  phone: string | undefined
): CustomerPhoneActionLinks | null {
  const digits = formatPhoneForMessaging(phone);
  if (!digits) return null;

  return {
    tel: `tel:+${digits}`,
    sms: `sms:+${digits}`,
    whatsApp: `https://wa.me/${digits}`,
  };
}

export function buildGoogleMapsSearchUrl(
  address: string | undefined
): string | null {
  const trimmed = address?.trim();
  if (!trimmed) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(trimmed)}`;
}
