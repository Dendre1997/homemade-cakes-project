"use client";

import { useMemo } from "react";
import { useObject } from "@ai-sdk/react";
import type { DeepPartial } from "ai";
import { Loader2, Sparkles, Square, Tag, TriangleAlert } from "lucide-react";
import {
  productSuggestionSchema,
  type GenerateProductInput,
  type ProductSuggestion,
} from "@/lib/ai/schemas/productSuggestion";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

function formatMoney(value: number | undefined): string {
  if (typeof value !== "number" || Number.isNaN(value)) return "—";
  return `$${value.toFixed(0)}`;
}

function hasDraftInput(draft: GenerateProductInput): boolean {
  return Boolean(
    draft.partialName?.trim() ||
      draft.categoryId?.trim() ||
      draft.flavorIds?.length
  );
}

function isCompleteSuggestion(
  object: DeepPartial<ProductSuggestion> | undefined
): object is ProductSuggestion {
  if (!object) return false;

  return (
    typeof object.suggestedName === "string" &&
    object.suggestedName.trim().length > 0 &&
    typeof object.description === "string" &&
    typeof object.shortDescription === "string" &&
    typeof object.suggestedPrice === "number" &&
    typeof object.seoSlug === "string" &&
    Array.isArray(object.suggestedTags)
  );
}

export interface AiProductGeneratorDraft {
  partialName?: string;
  categoryId?: string;
  flavorIds?: string[];
}

interface AiProductGeneratorProps {
  draft: AiProductGeneratorDraft;
  onApply: (suggestion: ProductSuggestion) => void;
  /** Gallery portfolio entries vs catalog products. */
  isGalleryItem?: boolean;
  /** Extra guard (e.g. modal closed, category not selected yet). */
  disabled?: boolean;
  className?: string;
}

export function AiProductGenerator({
  draft,
  onApply,
  isGalleryItem = false,
  disabled = false,
  className,
}: AiProductGeneratorProps) {
  const { object, submit, isLoading, error, stop, clear } = useObject({
    api: "/api/admin/ai/generate-product",
    schema: productSuggestionSchema,
  });

  const canGenerate = hasDraftInput(draft) && !disabled;
  const canApply = useMemo(
    () => !isLoading && isCompleteSuggestion(object),
    [isLoading, object]
  );

  const hasPreview =
    Boolean(object?.suggestedName) ||
    Boolean(object?.shortDescription) ||
    Boolean(object?.description) ||
    typeof object?.suggestedPrice === "number" ||
    Boolean(object?.seoSlug) ||
    Boolean(object?.suggestedTags?.length);

  const handleGenerate = () => {
    if (!canGenerate) return;
    clear();
    submit({
      partialName: draft.partialName?.trim() || undefined,
      categoryId: draft.categoryId?.trim() || undefined,
      flavorIds: draft.flavorIds?.length ? draft.flavorIds : undefined,
      isGalleryItem,
    });
  };

  const handleApply = () => {
    if (!isCompleteSuggestion(object)) return;
    onApply(object);
  };

  return (
    <div
      className={cn(
        "rounded-large border border-accent/30 bg-card-background p-md shadow-sm",
        className
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-sm">
        <div>
          <p className="inline-flex items-center gap-sm font-heading text-h5 text-primary">
            <Sparkles className="h-4 w-4 text-accent" />
            {isGalleryItem ? "AI Gallery Copy" : "AI Product Copy"}
          </p>
          <p className="mt-xs font-body text-small text-primary/60">
            Uses your current draft name, category, and flavors as context.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-sm">
          {isLoading ? (
            <Button type="button" variant="secondary" size="sm" onClick={() => stop()}>
              <Square className="mr-sm h-3.5 w-3.5" />
              Stop
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              disabled={!canGenerate}
              onClick={handleGenerate}
            >
              <Sparkles className="mr-sm h-3.5 w-3.5" />
              Generate with AI
            </Button>
          )}
        </div>
      </div>

      {!canGenerate && !disabled && (
        <p className="mt-sm font-body text-small text-primary/50">
          Enter a name, pick a category, or select at least one flavor first.
        </p>
      )}

      {isLoading && !hasPreview && (
        <div className="mt-md inline-flex items-center gap-sm font-body text-small text-primary/60">
          <Loader2 className="h-4 w-4 animate-spin text-accent" />
          Writing copy…
        </div>
      )}

      {error && (
        <div className="mt-md rounded-medium border border-error/40 bg-error/10 px-md py-sm font-body text-small text-error">
          <p className="inline-flex items-center gap-sm">
            <TriangleAlert className="h-3.5 w-3.5 shrink-0" />
            {error.message || "Could not generate product copy."}
          </p>
        </div>
      )}

      {hasPreview && (
        <div className="mt-md space-y-sm">
          <div className="flex flex-wrap items-end justify-between gap-sm">
            <div className="min-w-0 flex-1">
              <p className="font-body text-[11px] uppercase tracking-wide text-primary/60">
                Suggested name
              </p>
              <p className="font-body text-body text-primary">
                {object?.suggestedName || (
                  <span className="text-primary/40">…</span>
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
              Apply All
            </Button>
          </div>

          {object?.shortDescription !== undefined && (
            <div className="rounded-medium border border-border bg-background/60 p-sm">
              <p className="font-body text-[11px] uppercase tracking-wide text-primary/60">
                Short description
              </p>
              <p className="mt-xs font-body text-small text-primary/80">
                {object.shortDescription || (
                  <span className="text-primary/40">…</span>
                )}
              </p>
            </div>
          )}

          {object?.description !== undefined && (
            <div className="rounded-medium border border-border bg-background/60 p-sm">
              <p className="font-body text-[11px] uppercase tracking-wide text-primary/60">
                Full description
              </p>
              <p className="mt-xs whitespace-pre-wrap font-body text-small text-primary/80">
                {object.description || (
                  <span className="text-primary/40">…</span>
                )}
              </p>
            </div>
          )}

          <div className="flex flex-wrap gap-md font-body text-small text-primary/80">
            {object?.suggestedPrice !== undefined && (
              <span>
                Price:{" "}
                <span className="font-mono font-semibold">
                  {formatMoney(object.suggestedPrice)}
                </span>
              </span>
            )}
            {object?.seoSlug !== undefined && (
              <span className="min-w-0 truncate">
                Slug:{" "}
                <span className="font-mono text-accent">
                  {object.seoSlug || "…"}
                </span>
              </span>
            )}
          </div>

          {object?.suggestedTags && object.suggestedTags.length > 0 && (
            <div className="flex flex-wrap gap-xs">
              {object.suggestedTags.map((tag, index) =>
                tag ? (
                  <span
                    key={`${index}-${tag}`}
                    className="inline-flex items-center gap-xs rounded-small bg-background px-xs py-[2px] font-body text-[11px] text-primary/70"
                  >
                    <Tag className="h-3 w-3" />
                    {tag}
                  </span>
                ) : null
              )}
            </div>
          )}

          {isLoading && (
            <p className="font-body text-small text-primary/40">Still writing…</p>
          )}
        </div>
      )}
    </div>
  );
}

export default AiProductGenerator;
