"use client";

import { useMemo } from "react";
import { useObject } from "@ai-sdk/react";
import type { DeepPartial } from "ai";
import {
  AlertTriangle,
  Loader2,
  Sparkles,
  Square,
  TriangleAlert,
} from "lucide-react";
import {
  quoteSuggestionSchema,
  type QuoteSuggestion,
} from "@/lib/ai/schemas/quoteSuggestion";
import type { CustomOrderItem } from "@/types";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

const CONFIDENCE_LABELS: Record<string, string> = {
  high: "High confidence",
  medium: "Medium confidence",
  low: "Low confidence",
};

function confidenceTone(confidence: string | undefined): string {
  switch (confidence) {
    case "high":
      return "bg-success/15 text-success";
    case "medium":
      return "bg-accent/15 text-accent";
    case "low":
      return "bg-error/15 text-error";
    default:
      return "bg-background text-primary/50";
  }
}

function formatMoney(value: number | undefined): string {
  if (typeof value !== "number" || Number.isNaN(value)) return "—";
  return `$${value.toFixed(0)}`;
}

function itemLabel(items: CustomOrderItem[], itemId: string | undefined): string {
  if (!itemId) return "Item";
  const index = items.findIndex((item) => item.id === itemId);
  const item = index >= 0 ? items[index] : undefined;
  const category = item?.category?.trim();
  if (category && items.length > 1) {
    return `Item ${index + 1} · ${category}`;
  }
  return category || (items.length > 1 ? `Item ${index + 1}` : "Product");
}

function isCompleteSuggestion(
  object: DeepPartial<QuoteSuggestion> | undefined
): object is QuoteSuggestion {
  if (!object?.items?.length) return false;
  if (typeof object.totalSuggested !== "number") return false;

  return object.items.every((item) => {
    if (!item) return false;
    return (
      typeof item.itemId === "string" &&
      typeof item.suggestedBasePrice === "number" &&
      typeof item.suggestedDesignQuote === "number" &&
      typeof item.reasoning === "string" &&
      (item.confidence === "high" ||
        item.confidence === "medium" ||
        item.confidence === "low")
    );
  });
}

interface QuotePropositionCardProps {
  customOrderId: string;
  items: CustomOrderItem[];
  onApply: (suggestion: QuoteSuggestion) => void;
}

export function QuotePropositionCard({
  customOrderId,
  items,
  onApply,
}: QuotePropositionCardProps) {
  const { object, submit, isLoading, error, stop, clear } = useObject({
    api: "/api/admin/ai/suggest-quote",
    schema: quoteSuggestionSchema,
  });

  const canApply = useMemo(
    () => !isLoading && isCompleteSuggestion(object),
    [isLoading, object]
  );

  const handleGenerate = () => {
    clear();
    submit({ customOrderId });
  };

  const handleApply = () => {
    if (!isCompleteSuggestion(object)) return;
    onApply(object);
  };

  const hasSuggestion =
    Boolean(object?.items?.length) ||
    typeof object?.totalSuggested === "number" ||
    Boolean(object?.risks?.length);

  return (
    <div className="rounded-large border border-accent/30 bg-card-background p-lg shadow-md">
      <div className="flex flex-wrap items-start justify-between gap-sm border-b border-border/40 pb-4">
        <div>
          <h2 className="inline-flex items-center gap-sm font-heading text-h4 text-primary">
            <Sparkles className="h-5 w-5 text-accent" />
            AI Quote Assistant
          </h2>
          <p className="mt-xs font-body text-small text-primary/60">
            Grounded in catalog prices and past quotes. Review before saving.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-sm">
          {isLoading ? (
            <Button type="button" variant="secondary" size="sm" onClick={() => stop()}>
              <Square className="mr-sm h-3.5 w-3.5" />
              Stop
            </Button>
          ) : (
            <Button type="button" size="sm" onClick={handleGenerate}>
              <Sparkles className="mr-sm h-3.5 w-3.5" />
              Generate AI Quote
            </Button>
          )}
        </div>
      </div>

      {isLoading && !hasSuggestion && (
        <div className="mt-md inline-flex items-center gap-sm font-body text-small text-primary/60">
          <Loader2 className="h-4 w-4 animate-spin text-accent" />
          Analyzing the request and price anchors…
        </div>
      )}

      {error && (
        <div className="mt-md rounded-medium border border-error/40 bg-error/10 px-md py-sm font-body text-small text-error">
          <p className="inline-flex items-center gap-sm">
            <TriangleAlert className="h-3.5 w-3.5 shrink-0" />
            {error.message || "Could not generate a quote suggestion."}
          </p>
        </div>
      )}

      {hasSuggestion && (
        <div className="mt-md space-y-md">
          <div className="flex flex-wrap items-end justify-between gap-sm">
            <div>
              <p className="font-body text-[11px] uppercase tracking-wide text-primary/60">
                Suggested total
              </p>
              <p className="font-mono text-h3 font-bold text-accent">
                {formatMoney(object?.totalSuggested)}
                {isLoading && (
                  <span className="ml-sm font-body text-small font-normal text-primary/40">
                    updating…
                  </span>
                )}
              </p>
            </div>

            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={!canApply}
              onClick={handleApply}
            >
              Apply to Form
            </Button>
          </div>

          <div className="space-y-sm">
            {object?.items?.map((suggested, index) => (
              <div
                key={suggested?.itemId ?? `streaming-${index}`}
                className="rounded-medium border border-border bg-background/60 p-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-sm">
                  <p className="font-body text-body text-primary">
                    {itemLabel(items, suggested?.itemId)}
                  </p>
                  {suggested?.confidence && (
                    <span
                      className={cn(
                        "rounded-small px-xs py-[2px] font-body text-[11px]",
                        confidenceTone(suggested.confidence)
                      )}
                    >
                      {CONFIDENCE_LABELS[suggested.confidence] ??
                        suggested.confidence}
                    </span>
                  )}
                </div>

                <div className="mt-xs flex flex-wrap gap-md font-body text-small text-primary/80">
                  <span>
                    Base:{" "}
                    <span className="font-mono font-semibold">
                      {formatMoney(suggested?.suggestedBasePrice)}
                    </span>
                  </span>
                  <span>
                    Design:{" "}
                    <span className="font-mono font-semibold">
                      {formatMoney(suggested?.suggestedDesignQuote)}
                    </span>
                  </span>
                </div>

                {suggested?.reasoning && (
                  <p className="mt-xs font-body text-small text-primary/60">
                    {suggested.reasoning}
                  </p>
                )}
              </div>
            ))}
          </div>

          {object?.risks && object.risks.length > 0 && (
            <div className="rounded-medium border border-error/30 bg-error/5 px-md py-sm">
              <p className="inline-flex items-center gap-xs font-body text-[11px] uppercase tracking-wide text-error">
                <AlertTriangle className="h-3.5 w-3.5" />
                Risks to review
              </p>
              <ul className="mt-xs list-disc space-y-xs pl-md font-body text-small text-primary/70">
                {object.risks.map((risk, index) =>
                  risk ? <li key={`${index}-${risk.slice(0, 24)}`}>{risk}</li> : null
                )}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default QuotePropositionCard;
