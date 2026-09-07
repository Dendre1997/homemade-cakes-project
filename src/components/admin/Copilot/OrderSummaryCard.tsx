"use client";

import Link from "next/link";
import { format } from "date-fns";
import { CalendarDays, MapPin, Package, ShoppingBag, Truck } from "lucide-react";
import type { OrderSearchHit } from "@/lib/ai/uiMessage";
import { cn } from "@/lib/utils";

const PAID_STATUSES: Record<string, string> = {
  new: "New",
  paid: "Paid",
  "in-progress": "In progress",
  ready: "Ready",
  delivered: "Delivered",
  cancelled: "Cancelled",
  pending_confirmation: "Needs confirmation",
  awaiting_payment: "Awaiting payment",
  confirmed: "Confirmed",
};

function formatMoney(amount: number | undefined): string {
  if (typeof amount !== "number") return "—";
  return `$${amount.toFixed(2)}`;
}

function formatDate(value: unknown): string | null {
  if (typeof value !== "string" && !(value instanceof Date)) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return format(parsed, "MMM d, yyyy");
}

/** First delivery/pickup date on the order, which is what the baker cares about. */
function firstFulfillmentDate(order: OrderSearchHit): string | null {
  const dates = order.fulfillment?.dates;
  if (!Array.isArray(dates) || dates.length === 0) return null;
  const entry = dates[0];
  const formatted = formatDate(entry?.date);
  if (!formatted) return null;
  return entry?.timeSlot ? `${formatted} · ${entry.timeSlot}` : formatted;
}

export function OrderSummaryCard({ order }: { order: OrderSearchHit }) {
  const fulfillmentDate = firstFulfillmentDate(order);
  const isDelivery = order.fulfillment?.method === "delivery";
  const statusLabel = order.status
    ? (PAID_STATUSES[order.status] ?? order.status)
    : "Unknown";

  return (
    <Link
      href={`/bakery-manufacturing-orders/orders/${order._id}`}
      className="block rounded-medium border border-border bg-card-background p-md transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      <div className="flex items-start justify-between gap-sm">
        <div className="min-w-0">
          <p className="flex items-center gap-xs font-body text-small text-accent">
            <ShoppingBag className="h-3.5 w-3.5 shrink-0" />
            <span className="font-semibold tracking-wide">
              #{order.shortId}
            </span>
          </p>
          <p className="truncate font-body text-body text-primary">
            {order.customer?.name ?? "No name"}
          </p>
        </div>

        <div className="shrink-0 text-right">
          <p className="font-body text-body text-primary">
            {formatMoney(order.totalAmount)}
          </p>
          <span
            className={cn(
              "mt-xs inline-block rounded-small px-xs py-[2px] font-body text-[11px]",
              order.isPaid
                ? "bg-success/15 text-success"
                : "bg-error/15 text-error"
            )}
          >
            {order.isPaid ? "Paid" : "Unpaid"}
          </span>
        </div>
      </div>

      <div className="mt-sm flex flex-wrap items-center gap-x-md gap-y-xs font-body text-small text-primary/70">
        <span className="inline-flex items-center gap-xs">
          {isDelivery ? (
            <Truck className="h-3.5 w-3.5" />
          ) : (
            <MapPin className="h-3.5 w-3.5" />
          )}
          {isDelivery ? "Delivery" : "Pickup"}
        </span>

        {fulfillmentDate && (
          <span className="inline-flex items-center gap-xs">
            <CalendarDays className="h-3.5 w-3.5" />
            {fulfillmentDate}
          </span>
        )}

        {order.items && order.items.length > 0 && (
          <span className="inline-flex items-center gap-xs">
            <Package className="h-3.5 w-3.5" />
            {order.items.length} item{order.items.length === 1 ? "" : "s"}
          </span>
        )}

        <span className="rounded-small bg-background px-xs py-[2px] text-[11px]">
          {statusLabel}
        </span>
      </div>

      {order.items && order.items.length > 0 && (
        <p className="mt-sm truncate font-body text-small text-primary/60">
          {order.items
            .map((item) =>
              [item.name, item.size, item.flavor].filter(Boolean).join(" · ")
            )
            .join(" | ")}
        </p>
      )}
    </Link>
  );
}

export default OrderSummaryCard;
