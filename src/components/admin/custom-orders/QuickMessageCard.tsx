"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { MessageCircle } from "lucide-react";
import { CustomOrder } from "@/types";
import { Input } from "@/components/ui/Input";
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

function buildQuickMessage(
  order: CustomOrder,
  priceInput: string,
  paymentLink?: string | null
): string {
  const firstName = order.contact?.name?.trim().split(/\s+/)[0] || "there";
  const category = order.category?.trim() || "custom order";

  const detailSegments = [
    order.details?.size?.trim(),
    order.details?.flavor?.trim(),
    order.details?.textOnCake?.trim()
      ? `"${order.details.textOnCake.trim()}" inscription`
      : undefined,
  ].filter(Boolean);

  const detailsSuffix = detailSegments.length
    ? ` — ${detailSegments.join(", ")}`
    : "";

  const scheduleSegments = [
    formatFriendlyDate(order.date),
    order.timeSlot?.trim(),
  ].filter(Boolean);

  const schedulePhrase = scheduleSegments.join(" at ");
  const fulfillment =
    order.deliveryMethod === "delivery" ? "delivery" : "pickup";

  const priceReplacement = priceInput.trim() ? `$${priceInput.trim()}` : "TBD";

  const bodyLines = [
    `Hi ${firstName}! Thanks so much for reaching out about your ${category}${detailsSuffix}.`,
"",
schedulePhrase
  ? `We'd be happy to have it ready for ${fulfillment} on ${schedulePhrase}.`
  : `We'd be happy to have it ready for ${fulfillment}.`,
"",
"Your quote comes to $[Price]. Just reply to this message if you'd like to confirm your order!",
  ];

  if (paymentLink) {
    bodyLines.push(
      "",
      `To secure your order, please send your e-Transfer using this link: ${paymentLink}`
    );
  }

  bodyLines.push("", "— D&K Creations");

  return bodyLines.join("\n").replace("$[Price]", priceReplacement);
}

export function QuickMessageCard({ order, convertedInfo }: QuickMessageCardProps) {
  const [priceInput, setPriceInput] = useState(() =>
    order.agreedPrice != null && !Number.isNaN(Number(order.agreedPrice))
      ? String(order.agreedPrice)
      : ""
  );
  const [messageText, setMessageText] = useState("");

  useEffect(() => {
    // Inject the secure Payment Hub link only for converted e-transfer orders.
    const paymentLink =
      order.paymentPreference === "e-transfer" &&
      convertedInfo?.orderId &&
      convertedInfo?.paymentToken &&
      typeof window !== "undefined"
        ? `${window.location.origin}/pay/${convertedInfo.orderId}?token=${convertedInfo.paymentToken}`
        : null;

    setMessageText(buildQuickMessage(order, priceInput, paymentLink));
  }, [order, priceInput, convertedInfo]);

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
        <Label htmlFor="quick-message-price" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Quote Price ($)
        </Label>
        <Input
          id="quick-message-price"
          type="number"
          step="0.01"
          min="0"
          value={priceInput}
          onChange={(e) => setPriceInput(e.target.value)}
          placeholder="Leave empty for TBD"
          className="h-11"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="quick-message-body" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Message Preview
        </Label>
        <Textarea
          id="quick-message-body"
          value={messageText}
          onChange={(e) => setMessageText(e.target.value)}
          rows={8}
          className="resize-y min-h-[160px] font-body text-sm"
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
