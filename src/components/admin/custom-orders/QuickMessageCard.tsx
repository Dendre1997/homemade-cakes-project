"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { MessageCircle } from "lucide-react";
import { CustomOrder, CustomOrderItem } from "@/types";
import { Label } from "@/components/ui/Label";
import { Textarea } from "@/components/ui/Textarea";
import { Button, buttonVariants } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

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
        const price = Number(addon.price) || 0;
        return price > 0
          ? `${addon.name} (+${formatMoney(price)})`
          : addon.name;
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

  return (
    <div className="bg-card-background p-lg rounded-large shadow-md border border-border/40 space-y-4">
      <h2 className="font-heading text-h4 text-primary border-b border-border/40 pb-4 flex items-center gap-2">
        <MessageCircle className="w-5 h-5" />
        Quick Message
      </h2>

      <div className="space-y-2">
        <Label htmlFor="quick-message-body" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Message Preview
        </Label>
        <Textarea
          id="quick-message-body"
          value={messageText}
          onChange={(e) => setMessageText(e.target.value)}
          rows={16}
          className="resize-y min-h-[280px] font-body text-sm"
        />
      </div>

      {!formattedPhone && (
        <p className="text-xs text-muted-foreground">
          Add a valid customer phone number to enable WhatsApp and SMS links.
        </p>
      )}

      <div className="flex flex-col sm:flex-row gap-3 pt-1">
        {whatsappHref ? (
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(buttonVariants({ variant: "primary" }), "flex-1 text-center")}
          >
            WhatsApp
          </a>
        ) : (
          <Button variant="primary" className="flex-1" disabled>
            WhatsApp
          </Button>
        )}
        {smsHref ? (
          <a
            href={smsHref}
            className={cn(buttonVariants({ variant: "secondary" }), "flex-1 text-center")}
          >
            SMS
          </a>
        ) : (
          <Button variant="secondary" className="flex-1" disabled>
            SMS
          </Button>
        )}
      </div>
    </div>
  );
}

export default QuickMessageCard;
