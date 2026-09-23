"use client";

import Link from "next/link";
import { format } from "date-fns";
import {
  AlertTriangle,
  Loader2,
  Mail,
  Phone,
  SearchX,
  UserRound,
} from "lucide-react";
import type { CustomerHistoryToolResult } from "@/lib/ai/uiMessage";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

const STATUS_LABELS: Record<string, string> = {
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

function formatOrderDate(value: string | undefined): string {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";
  return format(parsed, "MMM d, yyyy");
}

export function CustomerCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse overflow-hidden rounded-large border border-border bg-card-background p-md",
        className
      )}
    >
      <div className="flex items-center gap-sm">
        <Loader2 className="h-4 w-4 animate-spin text-accent" />
        <span className="font-body text-small text-primary/60">
          Loading customer profile…
        </span>
      </div>
      <div className="mt-md grid grid-cols-3 gap-sm">
        <div className="h-14 rounded-medium bg-subtleBackground" />
        <div className="h-14 rounded-medium bg-subtleBackground" />
        <div className="h-14 rounded-medium bg-subtleBackground" />
      </div>
    </div>
  );
}

interface CustomerCardProps {
  result?: CustomerHistoryToolResult;
  state:
    | "input-streaming"
    | "input-available"
    | "output-available"
    | "output-error";
  errorText?: string;
  className?: string;
}

export function CustomerCard({
  result,
  state,
  errorText,
  className,
}: CustomerCardProps) {
  if (state === "input-streaming" || state === "input-available") {
    return <CustomerCardSkeleton className={className} />;
  }

  if (state === "output-error") {
    return (
      <div
        className={cn(
          "rounded-large border border-error/40 bg-error/10 px-md py-sm font-body text-small text-error",
          className
        )}
      >
        <p className="inline-flex items-center gap-sm">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          Customer profile didn&apos;t load.
        </p>
        {errorText?.trim() && (
          <p className="mt-xs text-error/80">{errorText}</p>
        )}
      </div>
    );
  }

  if (!result || !result.found) {
    const message =
      result?.found === false
        ? result.message
        : "No customer matched that search.";
    return (
      <div
        className={cn(
          "flex items-start gap-sm rounded-large border border-dashed border-border bg-card-background px-md py-sm font-body text-small text-primary/60",
          className
        )}
      >
        <SearchX className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>{message}</span>
      </div>
    );
  }

  const displayName = result.name?.trim() || "Customer";
  const phone = result.phone?.trim();
  const email = result.email?.trim();

  return (
    <div
      className={cn(
        "overflow-hidden rounded-large border border-border bg-card-background shadow-sm",
        className
      )}
    >
      <div className="border-b border-border bg-subtleBackground px-md py-sm">
        <p className="inline-flex items-center gap-sm font-heading text-h5 text-primary">
          <UserRound className="h-4 w-4 text-accent" />
          {displayName}
        </p>
        <div className="mt-xs flex flex-wrap gap-md font-body text-small">
          {phone && (
            <a
              href={`tel:${phone.replace(/\s/g, "")}`}
              className="inline-flex items-center gap-xs text-accent hover:underline"
            >
              <Phone className="h-3.5 w-3.5" />
              {phone}
            </a>
          )}
          {email && (
            <a
              href={`mailto:${email}`}
              className="inline-flex items-center gap-xs text-accent hover:underline"
            >
              <Mail className="h-3.5 w-3.5" />
              {email}
            </a>
          )}
        </div>
      </div>

      <div className="space-y-md p-md">
        <div className="grid grid-cols-3 gap-sm">
          <Stat label="Lifetime value" value={formatMoney(result.lifetimeValue)} />
          <Stat
            label="Total orders"
            value={String(result.totalOrdersCount ?? 0)}
          />
          <Stat
            label="Outstanding"
            value={formatMoney(result.unpaidBalance)}
            tone={(result.unpaidBalance ?? 0) > 0 ? "error" : "default"}
          />
        </div>

        {result.favoriteFlavors && result.favoriteFlavors.length > 0 && (
          <div>
            <p className="font-body text-[11px] uppercase tracking-wide text-primary/60">
              Favorite flavors
            </p>
            <div className="mt-xs flex flex-wrap gap-xs">
              {result.favoriteFlavors.map((entry) => (
                <Badge key={entry.flavor} variant="secondary" className="text-xs">
                  {entry.flavor}
                  <span className="ml-1 text-primary/50">×{entry.count}</span>
                </Badge>
              ))}
            </div>
          </div>
        )}

        {result.allergiesAndNotes && result.allergiesAndNotes.length > 0 && (
          <div className="rounded-medium border border-accent/30 bg-accent/5 px-sm py-sm">
            <p className="font-body text-[11px] font-semibold uppercase tracking-wide text-accent">
              Allergies & notes
            </p>
            <ul className="mt-xs list-inside list-disc space-y-xs font-body text-small text-primary/80">
              {result.allergiesAndNotes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          </div>
        )}

        {result.recentOrders && result.recentOrders.length > 0 && (
          <div>
            <p className="font-body text-[11px] uppercase tracking-wide text-primary/60">
              Recent orders
            </p>
            <ul className="mt-xs divide-y divide-border rounded-medium border border-border">
              {result.recentOrders.map((order) => {
                const statusLabel = order.status
                  ? (STATUS_LABELS[order.status] ?? order.status)
                  : "Unknown";
                return (
                  <li key={order._id} className="flex items-center justify-between gap-sm px-sm py-2">
                    <Link
                      href={`/bakery-manufacturing-orders/orders/${order._id}`}
                      className="font-body text-small text-accent hover:underline"
                    >
                      {order.shortId}
                    </Link>
                    <span className="font-body text-small text-primary/60">
                      {formatOrderDate(order.date)}
                    </span>
                    <div className="flex shrink-0 items-center gap-xs">
                      <Badge variant="outline" className="text-[10px]">
                        {statusLabel}
                      </Badge>
                      {!order.isPaid && (
                        <Badge variant="secondary" className="text-[10px] text-error">
                          Unpaid
                        </Badge>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone = "default",
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
          "font-body text-body font-semibold",
          tone === "error" ? "text-error" : "text-primary"
        )}
      >
        {value}
      </p>
    </div>
  );
}

export default CustomerCard;
