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
  const renderActions = (placement: "inline" | "sticky") => (
    <>
      {onCancel ? (
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          disabled={isSubmitting}
          className={cn(
            "h-11 rounded-xl text-sm sm:h-10",
            placement === "sticky" ? "shrink-0 px-3" : "px-4"
          )}
        >
          Cancel
        </Button>
      ) : null}
      <Button
        type="submit"
        variant="primary"
        disabled={disabled || isSubmitting}
        className={cn(
          "h-11 rounded-xl sm:h-10",
          placement === "sticky" ? "min-w-0 flex-1" : "w-full"
        )}
      >
        {submitLabel}
      </Button>
    </>
  );

  return (
    <>
      <div className="hidden md:block">{renderActions("inline")}</div>
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-primary/15 bg-background/95 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-[0_-4px_20px_-4px_rgba(35,20,22,0.08)] backdrop-blur-md md:hidden">
        <div className="mx-auto flex max-w-lg items-center gap-2.5">
          {renderActions("sticky")}
        </div>
      </div>
    </>
  );
}
