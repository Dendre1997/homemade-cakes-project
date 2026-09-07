/**
 * Deterministic customer-message drafting.
 *
 * This is a refinement of `buildQuickMessage()` in `QuickMessageCard.tsx`,
 * which §10 designates as the baseline and the ground truth for tone. The
 * structure (intro → schedule → logistics → allergy warning → itemized quote →
 * grand total → payment note → reply invite → sign-off) is intentionally
 * identical; only the opening line and the payment paragraph vary by intent.
 *
 * The LLM never writes this text and never touches the numbers (§7). It picks
 * the order and the intent; every dollar figure and every line break comes from
 * here.
 */

import { BAKERY_TIME_ZONE } from "@/lib/db/capacity";

/** Tuple (not a widened array) so `z.enum(MESSAGE_INTENTS)` stays type-safe. */
export const MESSAGE_INTENTS = [
  "payment_reminder",
  "order_ready",
  "inquiry_response",
  "general_update",
] as const;

export type MessageIntent = (typeof MESSAGE_INTENTS)[number];

export interface DraftSourceAddon {
  name: string;
  price: number;
}

export interface DraftSourceItem {
  /** Product name (regular orders) or category (custom requests). */
  label: string;
  quantity?: number;
  size?: string;
  /** Pre-resolved flavor text, including multi-tier breakdowns. */
  flavor?: string;
  shape?: string;
  inscription?: string;
  designNotes?: string;
  addons?: DraftSourceAddon[];
  baseCakePrice?: number;
  flavorUpcharge?: number;
  addonsCost?: number;
  designQuote?: number;
  itemTotal?: number;
}

export interface DraftSource {
  orderType: "regular" | "custom";
  shortId: string;
  customerName?: string;
  fulfillmentMethod?: "pickup" | "delivery";
  /** Raw date; formatted here in the bakery time zone. */
  fulfillmentDate?: Date | string;
  timeSlot?: string;
  allergies?: string;
  paymentPreference?: "cash" | "e-transfer";
  isPaid?: boolean;
  /** Computed in TypeScript by the caller — never by the model. */
  grandTotal?: number;
  items: DraftSourceItem[];
  /** Payment Hub URL. Surfaced as the email button, not inlined in the body. */
  paymentLink?: string;
}

export interface DraftOptions {
  intent: MessageIntent;
  customNotes?: string;
}

export interface MessageDraft {
  subject: string;
  bodyText: string;
  actionButton?: { label: string; url: string };
}

const PICKUP_AREA_NOTE =
  "Pickup Location: Calgary (East Village area). Exact address will be provided in the final receipt.";

const DELIVERY_NOTE =
  "Delivery selected. The delivery fee and exact address confirmation will be provided in the final invoice.";

function formatMoney(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

/**
 * "September 12th" in the bakery's time zone. Formatting on the server's zone
 * would shift the date for late-evening pickups.
 */
function formatFriendlyDate(value: Date | string | undefined): string | undefined {
  if (!value) return undefined;

  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) return undefined;

  const month = new Intl.DateTimeFormat("en-CA", {
    month: "long",
    timeZone: BAKERY_TIME_ZONE,
  }).format(parsed);
  const day = Number(
    new Intl.DateTimeFormat("en-CA", {
      day: "numeric",
      timeZone: BAKERY_TIME_ZONE,
    }).format(parsed)
  );

  return `${month} ${day}${ordinalSuffix(day)}`;
}

function ordinalSuffix(day: number): string {
  if (day % 100 >= 11 && day % 100 <= 13) return "th";
  switch (day % 10) {
    case 1:
      return "st";
    case 2:
      return "nd";
    case 3:
      return "rd";
    default:
      return "th";
  }
}

function firstNameOf(fullName: string | undefined): string {
  return fullName?.trim().split(/\s+/)[0] || "there";
}

/** Customers answer "no"/"none" in the allergy field; that is not an allergy. */
function hasNotableAllergies(allergies: string | undefined): boolean {
  const value = allergies?.trim();
  if (!value) return false;
  const normalized = value.toLowerCase();
  return normalized !== "no" && normalized !== "none";
}

function singularizeCategoryName(category: string): string {
  const trimmed = category.trim();
  if (!trimmed) return "custom order";
  return /s$/i.test(trimmed) ? trimmed.slice(0, -1) : trimmed;
}

function buildIntroLine(source: DraftSource, intent: MessageIntent): string {
  const firstName = firstNameOf(source.customerName);
  const subject =
    source.items.length === 1 && source.items[0]?.label
      ? singularizeCategoryName(source.items[0].label)
      : "order";

  switch (intent) {
    case "payment_reminder":
      return `Hi ${firstName}! Just a friendly reminder about the balance on your ${subject}.`;
    case "order_ready":
      return `Hi ${firstName}! Great news — your ${subject} is ready.`;
    case "inquiry_response":
      return `Hi ${firstName}! Thanks so much for reaching out about your ${subject}.`;
    case "general_update":
      return `Hi ${firstName}! A quick update on your ${subject}.`;
  }
}

function buildScheduleLine(
  source: DraftSource,
  intent: MessageIntent
): string | undefined {
  const datePhrase = formatFriendlyDate(source.fulfillmentDate);
  const slot = source.timeSlot?.trim();
  const schedule = [datePhrase, slot].filter(Boolean).join(" at ");
  const fulfillment =
    source.fulfillmentMethod === "delivery" ? "delivery" : "pickup";

  if (intent === "order_ready") {
    return schedule
      ? `It's all set for ${fulfillment} on ${schedule}.`
      : `It's all set for ${fulfillment} — just let us know when you're on the way.`;
  }

  if (!schedule) return undefined;

  return intent === "inquiry_response"
    ? `We'd be happy to have it ready for ${fulfillment} on ${schedule}.`
    : `It's scheduled for ${fulfillment} on ${schedule}.`;
}

/** Mirrors `buildDetailedItemBlock()` from the baseline, field for field. */
function buildItemBlock(item: DraftSourceItem, index: number): string {
  const lines: string[] = [`${index + 1}. ${item.label.trim() || "Custom Item"}`];

  if (item.size?.trim()) lines.push(`• Size: ${item.size.trim()}`);
  if (item.flavor?.trim()) lines.push(`• Flavor: ${item.flavor.trim()}`);
  if (item.shape?.trim()) lines.push(`• Shape: ${item.shape.trim()}`);

  const addons = item.addons?.filter((addon) => addon.name?.trim());
  if (addons?.length) {
    const addonText = addons
      .map((addon) =>
        addon.price > 0
          ? `${addon.name} (+${formatMoney(addon.price)})`
          : addon.name
      )
      .join(", ");
    lines.push(`• Add-ons: ${addonText}`);
  }

  if (item.inscription?.trim()) {
    lines.push(`• Inscription: "${item.inscription.trim()}"`);
  }
  if (item.designNotes?.trim()) {
    lines.push(`• Design Notes: ${item.designNotes.trim()}`);
  }
  if (item.quantity !== undefined && item.quantity > 1) {
    lines.push(`• Quantity: ${item.quantity}`);
  }

  const pricingLines = buildItemPricingLines(item);
  if (pricingLines.length > 0) {
    lines.push("", ...pricingLines);
  }

  return lines.join("\n");
}

function buildItemPricingLines(item: DraftSourceItem): string[] {
  const designQuote = item.designQuote ?? 0;
  const hasBreakdown =
    item.baseCakePrice !== undefined ||
    (item.flavorUpcharge ?? 0) > 0 ||
    (item.addonsCost ?? 0) > 0;

  if (!hasBreakdown && designQuote <= 0 && item.itemTotal === undefined) {
    return [];
  }

  const lines: string[] = ["Pricing Breakdown:"];

  if (item.baseCakePrice !== undefined) {
    lines.push(`- Base Cake: ${formatMoney(item.baseCakePrice)}`);
    if ((item.flavorUpcharge ?? 0) > 0) {
      lines.push(`- Flavor Upcharge: ${formatMoney(item.flavorUpcharge!)}`);
    }
    if ((item.addonsCost ?? 0) > 0) {
      lines.push(`- Add-ons: ${formatMoney(item.addonsCost!)}`);
    }
  } else if (item.itemTotal !== undefined && item.itemTotal > 0) {
    lines.push(`- Base: ${formatMoney(Math.max(0, item.itemTotal - designQuote))}`);
  }

  if (designQuote > 0) {
    lines.push(`- Design & Decor: ${formatMoney(designQuote)}`);
  }

  if (item.itemTotal !== undefined && item.itemTotal > 0) {
    lines.push("  ---", `  Item Total: ${formatMoney(item.itemTotal)}`);
  }

  return lines;
}

function buildPaymentLines(
  source: DraftSource,
  intent: MessageIntent
): string[] {
  if (source.isPaid) {
    return ["Payment: Received in full — thank you!"];
  }

  const total =
    source.grandTotal !== undefined && source.grandTotal > 0
      ? formatMoney(source.grandTotal)
      : null;

  if (source.paymentPreference === "cash") {
    return [
      total
        ? `Payment: Cash at pickup — ${total} due when you collect.`
        : "Payment: Cash at pickup — full amount due when you collect.",
    ];
  }

  if (source.paymentPreference === "e-transfer") {
    return [
      intent === "payment_reminder" && total
        ? `Payment: E-transfer — ${total} is still outstanding and due the day before pickup.`
        : "Payment: E-transfer — full amount is due the day before pickup.",
    ];
  }

  if (intent === "payment_reminder") {
    return [
      total
        ? `Payment: ${total} is still outstanding. Let us know which method you'd prefer.`
        : "Payment: there's still a balance outstanding. Let us know which method you'd prefer.",
    ];
  }

  return [];
}

function buildClosingLine(intent: MessageIntent): string {
  switch (intent) {
    case "payment_reminder":
      return "If you've already sent it, just ignore this note — and thank you!";
    case "order_ready":
      return "Reply here if you need to adjust your pickup time.";
    case "inquiry_response":
      return "Just reply to this message if you'd like to confirm your order!";
    case "general_update":
      return "Reply here if you have any questions.";
  }
}

function buildSubject(source: DraftSource, intent: MessageIntent): string {
  const ref = `#${source.shortId}`;

  switch (intent) {
    case "payment_reminder":
      return `Payment reminder for your D&K Creations order ${ref}`;
    case "order_ready":
      return `Your D&K Creations order ${ref} is ready!`;
    case "inquiry_response":
      return `Re: your custom cake request ${ref}`;
    case "general_update":
      return `Update on your D&K Creations order ${ref}`;
  }
}

/**
 * Builds the subject, body and optional call-to-action button.
 *
 * The payment URL is deliberately NOT inlined in `bodyText`: the email renders
 * it as a button, and duplicating it would show the link twice. Channels
 * without buttons (WhatsApp, SMS, clipboard) append `actionButton.url`
 * themselves.
 */
export function buildCustomerMessageDraft(
  source: DraftSource,
  { intent, customNotes }: DraftOptions
): MessageDraft {
  const lines: string[] = [buildIntroLine(source, intent)];

  const scheduleLine = buildScheduleLine(source, intent);
  if (scheduleLine) lines.push("", scheduleLine);

  lines.push(
    "",
    source.fulfillmentMethod === "delivery" ? DELIVERY_NOTE : PICKUP_AREA_NOTE
  );

  if (hasNotableAllergies(source.allergies)) {
    lines.push(
      "",
      `⚠️ Allergies noted: ${source.allergies!.trim()}. Please confirm this is correct.`
    );
  }

  const itemBlocks = source.items.map(buildItemBlock).filter(Boolean);
  if (itemBlocks.length > 0) {
    const heading =
      intent === "inquiry_response" ? "Your detailed quote:" : "Your order:";
    lines.push("", heading, "", itemBlocks.join("\n\n"));

    if (source.grandTotal !== undefined && source.grandTotal > 0) {
      lines.push("", `Grand Total: ${formatMoney(source.grandTotal)}`);
    }
  } else if (intent === "inquiry_response") {
    lines.push("", "Your quote is TBD — we'll follow up with pricing shortly.");
  }

  const paymentLines = buildPaymentLines(source, intent);
  if (paymentLines.length > 0) {
    lines.push("", ...paymentLines);
  }

  const notes = customNotes?.trim();
  if (notes) {
    lines.push("", notes);
  }

  lines.push("", buildClosingLine(intent), "", "— D&K Creations");

  return {
    subject: buildSubject(source, intent),
    bodyText: lines.join("\n"),
    ...(source.paymentLink
      ? { actionButton: { label: "Pay Now via e-Transfer", url: source.paymentLink } }
      : {}),
  };
}

/** Digits-only, E.164-ish phone for `wa.me` / `sms:` links. */
export function formatPhoneForMessaging(
  phone: string | undefined
): string | null {
  if (!phone?.trim()) return null;

  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `1${digits}`;
  return digits.length > 0 ? digits : null;
}
