"use client";

import Link from "next/link";
import { format } from "date-fns";
import { AlertTriangle, CalendarDays, Sparkles } from "lucide-react";
import type { CustomRequestHit } from "@/lib/ai/uiMessage";
import { cn } from "@/lib/utils";

const STATUS_LABELS: Record<string, string> = {
  pending_review: "Needs quote",
  converted: "Converted",
  rejected: "Rejected",
};

function formatMoney(amount: number | undefined): string | null {
  if (typeof amount !== "number") return null;
  return `$${amount.toFixed(2)}`;
}

function formatEventDate(value: unknown): string | null {
  if (typeof value !== "string" && !(value instanceof Date)) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return format(parsed, "MMM d, yyyy");
}

/** "no" / "none" are the common non-answers in the allergies field. */
function hasRealAllergies(allergies: string | undefined): boolean {
  const value = allergies?.trim().toLowerCase();
  return Boolean(value) && value !== "no" && value !== "none";
}

export function CustomRequestCard({ request }: { request: CustomRequestHit }) {
  const eventDate = formatEventDate(request.eventDate);
  const price =
    formatMoney(request.agreedPriceTotal) ??
    formatMoney(request.approximatePriceTotal);
  const isQuoted = typeof request.agreedPriceTotal === "number";
  const statusLabel = request.status
    ? (STATUS_LABELS[request.status] ?? request.status)
    : "Unknown";

  return (
    <Link
      href={`/bakery-manufacturing-orders/custom-orders/${request._id}`}
      className="block rounded-medium border border-accent/40 bg-card-background p-md transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      <div className="flex items-start justify-between gap-sm">
        <div className="min-w-0">
          <p className="flex items-center gap-xs font-body text-small text-accent">
            <Sparkles className="h-3.5 w-3.5 shrink-0" />
            <span className="font-semibold tracking-wide">
              #{request.shortId}
            </span>
          </p>
          <p className="truncate font-body text-body text-primary">
            {request.contact?.name ?? "No name"}
          </p>
        </div>

        <div className="shrink-0 text-right">
          {price && (
            <p className="font-body text-body text-primary">{price}</p>
          )}
          <span className="mt-xs inline-block rounded-small bg-background px-xs py-[2px] font-body text-[11px]">
            {isQuoted ? statusLabel : "Quote TBD"}
          </span>
        </div>
      </div>

      <div className="mt-sm flex flex-wrap items-center gap-x-md gap-y-xs font-body text-small text-primary/70">
        {eventDate && (
          <span className="inline-flex items-center gap-xs">
            <CalendarDays className="h-3.5 w-3.5" />
            {eventDate}
            {request.timeSlot ? ` · ${request.timeSlot}` : ""}
          </span>
        )}
        <span className="rounded-small bg-background px-xs py-[2px] text-[11px]">
          {statusLabel}
        </span>
      </div>

      {hasRealAllergies(request.allergies) && (
        <p
          className={cn(
            "mt-sm inline-flex items-start gap-xs rounded-small bg-error/10 px-xs py-[3px]",
            "font-body text-small text-error"
          )}
        >
          <AlertTriangle className="mt-[2px] h-3.5 w-3.5 shrink-0" />
          Allergies: {request.allergies}
        </p>
      )}

      {request.items && request.items.length > 0 && (
        <p className="mt-sm line-clamp-2 font-body text-small text-primary/60">
          {request.items
            .map((item) =>
              [item.category, item.size, item.flavor].filter(Boolean).join(" · ")
            )
            .join(" | ")}
        </p>
      )}
    </Link>
  );
}

export default CustomRequestCard;
