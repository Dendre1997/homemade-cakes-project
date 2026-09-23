"use client";

import Link from "next/link";
import { format } from "date-fns";
import {
  AlertTriangle,
  Ban,
  CircleDollarSign,
  Clock,
  Sparkles,
} from "lucide-react";
import type { DailyBrief } from "@/lib/ai/uiMessage";
import { formatBakeryDate } from "./composeAnswer";
import { cn } from "@/lib/utils";

function formatMoney(amount: number | undefined): string {
  if (typeof amount !== "number") return "$0.00";
  return `$${amount.toFixed(2)}`;
}

function formatDayLabel(dateKey: string, isToday: boolean): string {
  const parsed = new Date(`${dateKey}T12:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return dateKey;
  const label = format(parsed, "EEEE, MMM d");
  return isToday ? `Today · ${label}` : label;
}

/** Green under 70%, amber to 99%, red once the day is full. */
function utilizationTone(percent: number): string {
  if (percent >= 100) return "bg-error";
  if (percent >= 70) return "bg-accent";
  return "bg-success";
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "default" | "error";
}) {
  return (
    <div className="rounded-medium bg-background p-sm">
      <p className="font-body text-[11px] uppercase tracking-wide text-primary/60">
        {label}
      </p>
      <p
        className={cn(
          "font-body text-body",
          tone === "error" ? "text-error" : "text-primary"
        )}
      >
        {value}
      </p>
    </div>
  );
}

export function DailyBriefCard({ brief }: { brief: DailyBrief }) {
  const { capacity, summary } = brief;
  const percent = Math.min(capacity.utilizationPercent, 100);

  return (
    <div className="rounded-medium border border-border bg-card-background p-md">
      <div className="flex items-start justify-between gap-sm">
        <p className="font-body text-body text-primary">
          {formatDayLabel(brief.date, brief.isToday)}
        </p>
        {capacity.isBlocked && (
          <span className="inline-flex shrink-0 items-center gap-xs rounded-small bg-error/15 px-xs py-[2px] font-body text-[11px] text-error">
            <Ban className="h-3 w-3" />
            Blocked
          </span>
        )}
      </div>

      {/* Capacity gauge */}
      <div className="mt-md">
        <div className="flex items-baseline justify-between font-body text-small text-primary/70">
          <span className="inline-flex items-center gap-xs">
            <Clock className="h-3.5 w-3.5" />
            Kitchen load
          </span>
          <span>
            {capacity.bookedMinutes} / {capacity.workMinutes} min
          </span>
        </div>

        <div
          className="mt-xs h-2 w-full overflow-hidden rounded-small bg-background"
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Kitchen capacity used"
        >
          <div
            className={cn("h-full rounded-small", utilizationTone(percent))}
            style={{ width: `${percent}%` }}
          />
        </div>

        <p className="mt-xs font-body text-small text-primary/60">
          {capacity.isFull
            ? "Day is full — no minutes left."
            : `${capacity.availableMinutes} min still free (${capacity.utilizationPercent}% used).`}
          {capacity.isWithinLeadTime &&
            ` Inside the ${capacity.leadTimeDays}-day lead time.`}
        </p>
      </div>

      {/* Headline numbers */}
      <div className="mt-md grid grid-cols-2 gap-sm">
        <Stat
          label="Orders due"
          value={String(summary.ordersDueToday)}
        />
        <Stat label="Items to make" value={String(summary.itemsToMake)} />
        <Stat
          // Open orders still owing money — excludes delivered-but-unreconciled.
          label="Owed"
          value={`${summary.outstandingPaymentsCount} · ${formatMoney(
            summary.outstandingPaymentsAmount
          )}`}
          tone={summary.outstandingPaymentsCount > 0 ? "error" : "default"}
        />
        <Stat
          label="Awaiting quote"
          value={String(summary.pendingCustomRequests)}
        />
      </div>

      {brief.unpaidOrders.items.length > 0 && (
        <div className="mt-md space-y-xs">
          <p className="font-body text-[11px] uppercase tracking-wide text-primary/60">
            Owed
          </p>
          {brief.unpaidOrders.items.map((order) => (
            <Link
              key={order._id}
              href={`/bakery-manufacturing-orders/orders/${order._id}`}
              className="flex items-center justify-between gap-sm rounded-small px-xs py-[6px] font-body text-small text-primary transition-colors hover:bg-background"
            >
              <span className="min-w-0 truncate">
                <span className="text-accent">#{order.shortId}</span>{" "}
                {order.customer?.name ?? "No name"}
              </span>
              <span className="shrink-0 text-right text-primary/70">
                {formatMoney(order.totalAmount)}
                {typeof order.dueDate === "string" && order.dueDate
                  ? ` · ${formatBakeryDate(order.dueDate)}`
                  : ""}
              </span>
            </Link>
          ))}
          {brief.unpaidOrders.truncated && (
            <p className="font-body text-small text-primary/50">
              +{" "}
              {brief.unpaidOrders.totalCount - brief.unpaidOrders.items.length}{" "}
              more owed
            </p>
          )}
        </div>
      )}

      {/* Production list */}
      {brief.todaysOrders.length > 0 && (
        <div className="mt-md space-y-xs">
          <p className="font-body text-[11px] uppercase tracking-wide text-primary/60">
            What to make
          </p>
          {brief.todaysOrders.map((order) => (
            <Link
              key={order._id}
              href={`/bakery-manufacturing-orders/orders/${order._id}`}
              className="flex items-center justify-between gap-sm rounded-small px-xs py-[6px] font-body text-small text-primary transition-colors hover:bg-background"
            >
              <span className="min-w-0 truncate">
                <span className="text-accent">#{order.shortId}</span>{" "}
                {order.customer?.name ?? "No name"}
                {order.slots?.[0]?.timeSlot ? ` · ${order.slots[0].timeSlot}` : ""}
              </span>
              {!order.isPaid && (
                <CircleDollarSign className="h-3.5 w-3.5 shrink-0 text-error" />
              )}
            </Link>
          ))}
        </div>
      )}

      {/* Requests that have been waiting */}
      {brief.pendingCustomRequests.items.length > 0 && (
        <div className="mt-md space-y-xs">
          <p className="font-body text-[11px] uppercase tracking-wide text-primary/60">
            Needs a quote
          </p>
          {brief.pendingCustomRequests.items.map((request) => (
            <Link
              key={request._id}
              href={`/bakery-manufacturing-orders/custom-orders/${request._id}`}
              className="flex items-center justify-between gap-sm rounded-small px-xs py-[6px] font-body text-small text-primary transition-colors hover:bg-background"
            >
              <span className="min-w-0 truncate">
                <Sparkles className="mr-xs inline h-3 w-3 text-accent" />
                {request.contact?.name ?? "No name"}
                {request.eventDate ? ` · ${request.eventDate}` : ""}
              </span>
              {typeof request.waitingDays === "number" &&
                request.waitingDays >= 2 && (
                  <span className="inline-flex shrink-0 items-center gap-xs text-error">
                    <AlertTriangle className="h-3 w-3" />
                    {request.waitingDays}d
                  </span>
                )}
            </Link>
          ))}
          {brief.pendingCustomRequests.truncated && (
            <p className="font-body text-small text-primary/50">
              + {brief.pendingCustomRequests.totalCount -
                brief.pendingCustomRequests.items.length}{" "}
              more waiting
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default DailyBriefCard;
