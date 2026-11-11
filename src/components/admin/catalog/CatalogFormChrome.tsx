"use client";

import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

export const catalogFormCardClass =
  "space-y-4 rounded-2xl border border-primary/15 bg-background/20 p-4 shadow-sm backdrop-blur-md sm:space-y-5 sm:p-6";

export const catalogFieldClass =
  "h-11 rounded-xl border-primary/15 bg-background/40 sm:h-10";

export const catalogLabelClass =
  "mb-1.5 block text-xs font-medium text-primary/55";

export const catalogFormTitleClass =
  "font-heading text-lg font-semibold tracking-tight text-primary text-balance";

export const catalogChipClass =
  "min-h-11 rounded-xl px-3 transition-[color,background-color,border-color] motion-reduce:transition-none sm:min-h-10";

export const catalogUploadButtonClass = "mt-3 h-11 rounded-xl sm:h-10";

export const catalogImageActionClass =
  "h-11 w-11 rounded-xl p-0 shadow-sm sm:h-10 sm:w-10";

type CatalogFormActionsProps = {
  isSubmitting: boolean;
  submitLabel: string;
  onCancel?: () => void;
  disabled?: boolean;
};

export function CatalogFormActions({
  isSubmitting,
  submitLabel,
  onCancel,
  disabled,
}: CatalogFormActionsProps) {
  return (
    <div className="mt-6 flex items-center gap-2 border-t border-primary/15 pt-4">
      {onCancel ? (
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          disabled={isSubmitting}
          className="h-11 shrink-0 rounded-xl px-4 text-sm sm:h-10"
        >
          Cancel
        </Button>
      ) : null}
      <Button
        type="submit"
        variant="primary"
        disabled={disabled || isSubmitting}
        className={cn("h-11 min-w-0 flex-1 rounded-xl sm:h-10")}
      >
        {submitLabel}
      </Button>
    </div>
  );
}
