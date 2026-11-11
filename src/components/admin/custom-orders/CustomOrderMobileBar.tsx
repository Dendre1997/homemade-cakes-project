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
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-primary/15 bg-background/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-lg backdrop-blur-xl lg:hidden">
      <div className="mx-auto flex max-w-lg flex-col gap-2">
        {isConverted ? (
          <Button type="button" onClick={onCopyPaymentLink} className="w-full gap-2 text-white">
            <Copy className="h-4 w-4" aria-hidden />
            Copy Payment Link
          </Button>
        ) : (
          <Button
            type="button"
            onClick={onConvert}
            disabled={isConverting || isSaving}
            variant="secondary"
            className="h-12 w-full border-border bg-white font-bold shadow-sm hover:bg-subtleBackground"
          >
            {isConverting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Zap className="mr-2 h-4 w-4 text-accent" aria-hidden />
            )}
            Convert to Order
          </Button>
        )}
        {isDirty && (
          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              className="flex-1"
              disabled={isSaving}
              onClick={onDiscard}
            >
              Discard
            </Button>
            <Button
              type="button"
              variant="primary"
              className="flex-1"
              disabled={isSaving}
              onClick={onSave}
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                  Saving…
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
