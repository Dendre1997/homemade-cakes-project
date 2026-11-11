"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { MessageCircle, Copy, Check } from "lucide-react";
import { CustomOrder, CustomOrderItem } from "@/types";
import { Label } from "@/components/ui/Label";
import { Textarea } from "@/components/ui/Textarea";
import { Button, buttonVariants } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { DashboardGlassCard } from "@/components/admin/dashboard/DashboardGlassCard";
import { addonQuantityMark, addonUnitCost } from "@/lib/addons/selectedAddonMath";

interface QuickMessageCardProps {
  order: CustomOrder;
  /** Set once the request is converted; used to inject the Payment Hub link for e-transfer orders. */
  convertedInfo?: { orderId: string; paymentToken?: string } | null;
}

function formatPhoneForMessaging(phone: string | undefined): string | null {
  if (!phone?.trim()) return null;

  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `1${digits}`;
  if (digits.length > 0) return digits;

  return null;
}

function formatFriendlyDate(dateInput: Date | string | undefined): string | undefined {
  if (!dateInput) return undefined;

  const parsed = new Date(dateInput);
  if (Number.isNaN(parsed.getTime())) return undefined;

  return format(parsed, "MMMM do");
}

function formatMoney(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

function hasNotableAllergies(allergies?: string): boolean {
  const value = allergies?.trim();
  if (!value) return false;
  const normalized = value.toLowerCase();
  return normalized !== "no" && normalized !== "none";
}

function singularizeCategoryName(category: string): string {
  const trimmed = category.trim();
  if (!trimmed) return "custom order";
  if (trimmed.endsWith("s") || trimmed.endsWith("S")) {
    return trimmed.slice(0, -1);
  }
  return trimmed;
}

function buildIntroLine(firstName: string, items: CustomOrderItem[]): string {
  if (items.length > 1) {
    return `Hi ${firstName}! Thanks so much for reaching out about your custom order.`;
  }

  const singularCategory = singularizeCategoryName(
    items[0]?.category?.trim() || "custom order"
  );
  return `Hi ${firstName}! Thanks so much for reaching out about your ${singularCategory}.`;
}

function buildDetailedItemBlock(item: CustomOrderItem, index: number): string {
  const lines: string[] = [];

  const category = item.category?.trim() || "Custom Item";
  lines.push(`${index + 1}. ${category}`);

  const size = item.details?.size?.trim();
  if (size) {
    lines.push(`• Size: ${size}`);
  }

  const tiers = item.details?.tiers;
  if (tiers && tiers.length > 0) {
    const flavorText = tiers
      .map((tier, tierIdx) => {
        const label = tier.flavorName?.trim() || tier.flavorId?.trim();
        if (!label) return null;
        const tierNum = (tier.tierIndex ?? tierIdx) + 1;
        return `Tier ${tierNum}: ${label}`;
      })
      .filter((part): part is string => part != null)
      .join(", ");
    if (flavorText) {
      lines.push(`• Flavor: ${flavorText}`);
    }
  } else {
    const flavor = item.details?.flavor?.trim();
    if (flavor) {
      lines.push(`• Flavor: ${flavor}`);
    }
  }

  const addons = item.addons;
  if (addons && addons.length > 0) {
    const addonText = addons
      .map((addon) => {
        const price = addonUnitCost(addon);
        return price > 0
          ? `${addon.name}${addonQuantityMark(addon.quantity)} (+${formatMoney(price)})`
          : `${addon.name}${addonQuantityMark(addon.quantity)}`;
      })
      .join(", ");
    if (addonText) {
      lines.push(`• Add-ons: ${addonText}`);
    }
  }

  const shape = item.details?.shape?.trim();
  if (shape) {
    lines.push(`• Shape: ${shape}`);
  }

  const textOnCake = item.details?.textOnCake?.trim();
  if (textOnCake) {
    lines.push(`• Inscription: "${textOnCake}"`);
  }

  const designNotes = item.details?.designNotes?.trim();
  if (designNotes) {
    lines.push(`• Design Notes: ${designNotes}`);
  }

  const agreed = Number(item.agreedPrice) || 0;
  const designQuote = Number(item.designQuote) || 0;
  const pb = item.priceBreakdown;
  const hasPricingContent =
    agreed > 0 || !!pb || designQuote > 0;

  if (hasPricingContent) {
    const pricingLines: string[] = ["Pricing Breakdown:"];

    if (pb) {
      pricingLines.push(`- Base Cake: ${formatMoney(pb.baseCakePrice)}`);
      if (pb.flavorUpcharge > 0) {
        pricingLines.push(
          `- Flavor Upcharge: ${formatMoney(pb.flavorUpcharge)}`
        );
      }
      if (pb.addonsCost > 0) {
        pricingLines.push(`- Add-ons: ${formatMoney(pb.addonsCost)}`);
      }
    } else if (agreed > 0) {
      pricingLines.push(
        `- Base: ${formatMoney(Math.max(0, agreed - designQuote))}`
      );
    }

    if (designQuote > 0) {
      pricingLines.push(`- Design & Decor: ${formatMoney(designQuote)}`);
    }

    if (agreed > 0) {
      pricingLines.push("  ---");
      pricingLines.push(`  Item Total: ${formatMoney(agreed)}`);
    }

    lines.push("", ...pricingLines);
  }

  return lines.join("\n");
}

function buildQuickMessage(
  order: CustomOrder,
  paymentLink?: string | null
): string {
  const firstName = order.contact?.name?.trim().split(/\s+/)[0] || "there";

  const items = order.items ?? [];
  const itemBlocks = items.map((item, index) =>
    buildDetailedItemBlock(item, index)
  );

  const agreedPriceTotal = items.reduce(
    (sum, it) => sum + (Number(it.agreedPrice) || 0),
    0
  );

  const scheduleSegments = [
    formatFriendlyDate(order.date),
    order.timeSlot?.trim(),
  ].filter(Boolean);

  const schedulePhrase = scheduleSegments.join(" at ");
  const fulfillment =
    order.deliveryMethod === "delivery" ? "delivery" : "pickup";

  const bodyLines = [
    buildIntroLine(firstName, items),
    "",
    schedulePhrase
      ? `We'd be happy to have it ready for ${fulfillment} on ${schedulePhrase}.`
      : `We'd be happy to have it ready for ${fulfillment}.`,
    "",
    order.deliveryMethod === "delivery"
      ? "Delivery selected. The delivery fee and exact address confirmation will be provided in the final invoice."
      : "Pickup Location: Calgary (East Village area). Exact address will be provided in the final receipt.",
    "",
  ];

  if (hasNotableAllergies(order.allergies)) {
    bodyLines.push(
      `⚠️ Allergies noted: ${order.allergies!.trim()}. Please confirm this is correct.`,
      ""
    );
  }

  if (itemBlocks.length > 0) {
    bodyLines.push("Your detailed quote:", "", itemBlocks.join("\n\n"));
    if (agreedPriceTotal > 0) {
      bodyLines.push("", `Grand Total: ${formatMoney(agreedPriceTotal)}`);
    }
  } else {
    bodyLines.push("Your quote is TBD — we'll follow up with pricing shortly.");
  }

  if (order.paymentPreference === "cash") {
    bodyLines.push(
      "",
      "Payment: Cash at pickup — full amount due when you collect."
    );
  } else if (order.paymentPreference === "e-transfer") {
    bodyLines.push(
      "",
      "Payment: E-transfer — full amount is due the day before pickup."
    );
  }

  bodyLines.push(
    "",
    "Just reply to this message if you'd like to confirm your order!"
  );

  if (paymentLink) {
    bodyLines.push(
      "",
      `To secure your order, please send your e-Transfer using this link: ${paymentLink}`
    );
  }

  bodyLines.push("", "— D&K Creations");

  return bodyLines.join("\n");
}

export function QuickMessageCard({ order, convertedInfo }: QuickMessageCardProps) {
  const [messageText, setMessageText] = useState("");
  const [showFullMessage, setShowFullMessage] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const paymentLink =
      order.paymentPreference === "e-transfer" &&
      convertedInfo?.orderId &&
      convertedInfo?.paymentToken &&
      typeof window !== "undefined"
        ? `${window.location.origin}/pay/${convertedInfo.orderId}?token=${convertedInfo.paymentToken}`
        : null;

    setMessageText(buildQuickMessage(order, paymentLink));
  }, [order, convertedInfo]);

  const formattedPhone = useMemo(
    () => formatPhoneForMessaging(order.contact?.phone),
    [order.contact?.phone]
  );

  const encodedMessage = encodeURIComponent(messageText);
  const whatsappHref = formattedPhone
    ? `https://wa.me/${formattedPhone}?text=${encodedMessage}`
    : undefined;
  const smsHref = formattedPhone
    ? `sms:+${formattedPhone}?&body=${encodedMessage}`
    : undefined;

  const actionClass = cn(buttonVariants({ variant: "secondary" }), "h-11 min-w-0 flex-1 gap-2 px-3 sm:h-10");

  return (
    <DashboardGlassCard className="space-y-4">
      <h2 className="flex items-center gap-2 font-heading text-lg font-semibold text-primary">
        <MessageCircle className="h-4 w-4 text-primary/70" aria-hidden />
        Message
      </h2>

      <div className="flex gap-2.5">
        {whatsappHref ? (
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(buttonVariants({ variant: "primary" }), "h-11 min-w-0 flex-1 text-center sm:h-10")}
          >
            WhatsApp
          </a>
        ) : (
          <Button variant="primary" className="h-11 min-w-0 flex-1 sm:h-10" disabled>
            WhatsApp
          </Button>
        )}
        {smsHref ? (
          <a href={smsHref} className={actionClass}>
            SMS
          </a>
        ) : (
          <Button variant="secondary" className="h-11 min-w-0 flex-1 sm:h-10" disabled>
            SMS
          </Button>
        )}
        <Button
          type="button"
          variant="secondary"
          className="h-11 shrink-0 px-3 sm:h-10"
          aria-label="Copy message"
          onClick={() => {
            void navigator.clipboard.writeText(messageText).then(() => {
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1500);
            });
          }}
        >
          {copied ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
        </Button>
      </div>

      {!formattedPhone && (
        <p className="text-xs text-primary/55">
          Add a valid customer phone number to enable WhatsApp and SMS links.
        </p>
      )}

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor="quick-message-body" className="text-xs font-medium text-primary/55">
            Preview
          </Label>
          <button
            type="button"
            className="text-xs font-semibold text-accent hover:underline"
            onClick={() => setShowFullMessage((open) => !open)}
          >
            {showFullMessage ? "Show less" : "Show full message"}
          </button>
        </div>
        <Textarea
          id="quick-message-body"
          value={messageText}
          onChange={(e) => setMessageText(e.target.value)}
          rows={showFullMessage ? 12 : 3}
          className={cn(
            "resize-y rounded-xl bg-background/40 font-body text-sm",
            showFullMessage ? "min-h-[220px]" : "max-h-24 min-h-0 overflow-hidden"
          )}
        />
      </div>
    </DashboardGlassCard>
  );
}

export default QuickMessageCard;
