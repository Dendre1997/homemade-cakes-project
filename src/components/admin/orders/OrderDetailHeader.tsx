"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  orderEarliestPickupKey,
  orderItemUnitCount,
  orderStatusChipClass,
  orderStatusLabel,
} from "@/lib/admin/orderDetailDisplay";
import type { Order } from "@/types";
import { formatBakeryDate } from "@/lib/dates/bakeryCalendar";

type OrderDetailHeaderProps = {
  order: Order;
  toolsTrigger: React.ReactNode;
};

function KpiCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center justify-center rounded-xl border border-primary/10 bg-background/30 px-2 py-2 sm:px-3">
      <span className="truncate text-sm font-bold tabular-nums text-primary">
        {value}
      </span>
      <span className="mt-0.5 text-center text-[9px] font-semibold uppercase tracking-wide text-primary/55">
        {label}
      </span>
    </div>
  );
}

export function OrderDetailHeader({ order, toolsTrigger }: OrderDetailHeaderProps) {
  const shortId = order._id.toString().slice(-6).toUpperCase();
  const pickupKey = orderEarliestPickupKey(order);
  const pickupLabel = pickupKey
    ? formatBakeryDate(pickupKey, { month: "short", day: "numeric" })
    : "—";
  const items = orderItemUnitCount(order);

  return (
    <header className="sticky top-0 z-40 -mx-1 border-b border-primary/10 bg-background/80 px-1 pb-4 pt-1 backdrop-blur-xl backdrop-saturate-150 sm:-mx-0 sm:px-0">
      <Link
        href="/bakery-manufacturing-orders/orders"
        className="mb-3 inline-flex items-center gap-2 text-sm text-primary/65 transition-colors hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Back to orders
      </Link>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-heading text-2xl font-bold text-primary sm:text-3xl">
              Order #{shortId}
            </h1>
            <span
              className={cn(
                "rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                orderStatusChipClass(order.status)
              )}
            >
              {orderStatusLabel(order.status)}
            </span>
          </div>
          {pickupKey && (
            <p className="mt-1 text-sm text-primary/65">
              Pickup ·{" "}
              {formatBakeryDate(pickupKey, {
                weekday: "long",
                month: "short",
                day: "numeric",
              })}
            </p>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap items-start gap-2">{toolsTrigger}</div>
      </div>

      <div className="mt-4 flex gap-2 overflow-x-auto pb-0.5">
        <KpiCell label="Total" value={`$${order.totalAmount.toFixed(0)}`} />
        <KpiCell label="Items" value={String(items)} />
        <KpiCell label="Next pickup" value={pickupLabel} />
        <KpiCell
          label="Payment"
          value={order.isPaid ? "Paid" : "Pending"}
        />
      </div>
    </header>
  );
}
