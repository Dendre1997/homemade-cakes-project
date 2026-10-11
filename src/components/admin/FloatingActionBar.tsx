"use client";

import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

type FloatingActionBarProps = {
  isDirty: boolean;
  isSaving: boolean;
  onDiscard: () => void;
  onSave?: () => void | Promise<void>;
};

export function FloatingActionBar({
  isDirty,
  isSaving,
  onDiscard,
  onSave,
}: FloatingActionBarProps) {
  if (!isDirty) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
      <div
        className={cn(
          "pointer-events-auto relative isolate overflow-hidden",
          "flex flex-wrap items-center justify-center gap-3 rounded-full px-5 py-3 sm:gap-4 sm:px-6",
          /* Tinted glass — must match admin bg, not white overlays (reads as solid white on #f6dcda) */
          "border border-primary/15 bg-background/20 shadow-[0_8px_32px_rgba(35,20,22,0.18)]",
          "backdrop-blur-xl backdrop-saturate-150",
          "ring-1 ring-inset ring-white/20",
          "before:pointer-events-none before:absolute before:inset-0 before:rounded-full",
          "before:bg-gradient-to-b before:from-white/25 before:via-transparent before:to-transparent",
          "after:pointer-events-none after:absolute after:inset-x-6 after:top-0 after:h-px after:bg-white/35",
        )}
      >
        <p className="relative z-[1] text-sm font-medium text-primary">
          You have unsaved changes.
        </p>
        <div className="relative z-[1] flex items-center gap-2">
          <Button
            disabled={isSaving}
            onClick={onDiscard}
            size="sm"
            type="button"
            variant="ghost"
          >
            Discard
          </Button>
          <Button
            disabled={isSaving}
            onClick={onSave ? () => void onSave() : undefined}
            size="sm"
            type={onSave ? "button" : "submit"}
            variant="primary"
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
