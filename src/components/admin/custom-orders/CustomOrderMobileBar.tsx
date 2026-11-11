"use client";

import { Copy, Loader2, Zap } from "lucide-react";
import { Button } from "@/components/ui/Button";

type CustomOrderMobileBarProps = {
  isDirty: boolean;
  isSaving: boolean;
  isConverting: boolean;
  isConverted: boolean;
  onSave: () => void;
  onDiscard: () => void;
  onConvert: () => void;
  onCopyPaymentLink: () => void;
};

/** Phone actions for a custom request. Wide screens keep convert in the header and save in the floating bar. */
export function CustomOrderMobileBar({
  isDirty,
  isSaving,
  isConverting,
  isConverted,
  onSave,
  onDiscard,
  onConvert,
  onCopyPaymentLink,
}: CustomOrderMobileBarProps) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-primary/15 bg-background/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-4px_20px_-4px_rgba(35,20,22,0.08)] backdrop-blur-md lg:hidden">
      <div className="mx-auto flex max-w-lg items-center gap-2.5">
        {isDirty && (
          <Button
            type="button"
            variant="ghost"
            className="h-11 shrink-0 px-2.5 text-sm"
            disabled={isSaving}
            onClick={onDiscard}
          >
            Discard
          </Button>
        )}
        {isDirty && (
          <Button
            type="button"
            variant="primary"
            className="h-11 min-w-0 flex-1 px-2 text-sm"
            aria-label={isSaving ? "Saving" : "Save"}
            disabled={isSaving}
            onClick={onSave}
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : "Save"}
          </Button>
        )}
        {isConverted ? (
          <Button type="button" onClick={onCopyPaymentLink} className="h-11 min-w-0 flex-1 gap-2 px-2 text-sm text-white">
            <Copy className="h-4 w-4 shrink-0" aria-hidden />
            <span className="truncate">Copy link</span>
          </Button>
        ) : (
          <Button
            type="button"
            onClick={onConvert}
            disabled={isConverting || isSaving}
            variant="secondary"
            className="h-11 min-w-0 flex-1 border-primary/15 bg-background/40 px-2 text-sm font-semibold shadow-sm hover:bg-background/70"
          >
            {isConverting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Zap className="mr-2 h-4 w-4 shrink-0 text-accent" aria-hidden />
            )}
            <span className="truncate">Convert</span>
          </Button>
        )}
      </div>
    </div>
  );
}
