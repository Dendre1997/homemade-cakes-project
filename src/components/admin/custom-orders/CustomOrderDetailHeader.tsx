"use client";

import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { Input } from "@/components/ui/Input";
import { ArrowLeft, Loader2, Copy, Zap } from "lucide-react";
import { Badge } from "@/components/ui/Badge";

interface CustomOrderDetailHeaderProps {
  id: string;
  status: string;
  agreedPrice: number | null;
  onPriceChange: (price: number | null) => void;
  /** When true (multi-item requests), the price is a read-only sum of per-item prices. */
  readOnlyPrice?: boolean;
  isSaving: boolean;
  isConverting: boolean;
  onConvert: () => void;
  isConverted: boolean;
  onCopyPaymentLink: () => void;
}

export const CustomOrderDetailHeader = ({
  id,
  status,
  agreedPrice,
  onPriceChange,
  readOnlyPrice = false,
  isSaving,
  isConverting,
  onConvert,
  isConverted,
  onCopyPaymentLink,
}: CustomOrderDetailHeaderProps) => {

  const agreedTotal = (
    <div className="flex h-10 w-full min-w-0 items-center justify-between gap-2 rounded-xl border border-primary/10 bg-background/40 px-3 sm:w-56">
      <span className="text-xs font-semibold text-muted-foreground">Agreed Total</span>
      <span className="text-lg font-bold tabular-nums text-accent">
        ${(agreedPrice ?? 0).toFixed(2)}
      </span>
    </div>
  );

  return (
    <header className="sticky top-0 z-30 -mx-4 mb-2 border-b border-primary/10 bg-background/85 px-4 pb-3 pt-1 backdrop-blur-xl backdrop-saturate-150 md:-mx-8 md:px-8">
      <Link
        href="/bakery-manufacturing-orders/custom-orders"
        className="mb-3 inline-flex items-center gap-2 text-sm text-primary/65 transition-colors hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Back to all requests
      </Link>

      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <h1 className="font-heading text-2xl font-bold tracking-tight text-primary text-balance sm:text-3xl">
          Request #{id.slice(-6).toUpperCase()}
        </h1>
        <Badge
          variant="outline"
          className={`px-3 py-1 text-[10px] font-bold uppercase tracking-widest
            ${status === "new" ? "border-blue-200 bg-blue-50 text-blue-700" :
              status === "pending_review" ? "border-orange-200 bg-orange-50 text-orange-700" :
              status === "negotiating" ? "border-yellow-200 bg-yellow-50 text-yellow-700" :
              isConverted ? "border-green-200 bg-green-50 text-green-700" :
              status === "rejected" ? "border-red-200 bg-red-50 text-red-700" : ""}
          `}
        >
          {status.replace(/_/g, " ")}
        </Badge>
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        {isConverted || readOnlyPrice ? (
          agreedTotal
        ) : (
          <div className="relative w-full min-w-0 shrink-0 sm:w-56">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold uppercase tracking-wide text-primary/45">Agreed</span>
            <Input
              type="number"
              placeholder="0.00"
              value={agreedPrice ?? ""}
              onChange={(e) => onPriceChange(e.target.value === "" ? null : Number(e.target.value))}
              className="h-10 rounded-xl border-primary/15 bg-background/40 pl-16 text-right text-sm font-bold tabular-nums text-accent"
            />
          </div>
        )}

        <div className="hidden lg:flex">
          {isConverted ? (
            <Button
              onClick={onCopyPaymentLink}
              className="h-10 min-w-[180px] gap-2 text-white shadow-sm"
            >
              <Copy className="h-4 w-4" aria-hidden />
              Copy Payment Link
            </Button>
          ) : (
            <Button
              onClick={onConvert}
              disabled={isConverting || isSaving || isConverted}
              variant="secondary"
              className="h-10 border-primary/15 bg-background/40 font-semibold shadow-sm hover:bg-background/70 sm:min-w-[160px]"
            >
              {isConverting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Zap className="mr-2 h-4 w-4 text-accent" aria-hidden />
              )}
              Convert to Order
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};
