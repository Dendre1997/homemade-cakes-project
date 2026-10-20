"use client";

import { useEffect, useMemo, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { AnimatePresence, motion, useDragControls } from "framer-motion";
import { ChevronDown, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Switch } from "@/components/ui/Switch";
import { TimeSlotManager } from "@/components/ui/TimeSlotManager";
import { cn } from "@/lib/utils";

export type DayEditorOriginRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export type ScheduleDayOverview = {
  isBlocked: boolean;
  isWithinLeadTime: boolean;
  booked: number | null;
  available: number | null;
  utilization: number;
};

type ScheduleDayEditorProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dateLabel: string;
  dateKey: string | null;
  overview: ScheduleDayOverview | null;
  defaultWorkMinutes: number;
  defaultSlotCount: number;
  initialWorkMinutes: string;
  initialAvailableHours: string[];
  defaultAvailableHours: string[];
  originRect: DayEditorOriginRect | null;
  onApply: (payload: {
    workMinutes: string;
    availableHours: string[];
  }) => void;
  onResetToDefault: () => void;
  onBlockToggle: (
    dateKey: string,
    action: "block" | "unblock"
  ) => Promise<boolean>;
  blockingDateKey: string | null;
};

function statusLabel(overview: ScheduleDayOverview): string {
  if (overview.isBlocked) return "Blocked";
  if (overview.isWithinLeadTime) return "Lead time";
  return "Open";
}

function transformOriginFromRect(rect: DayEditorOriginRect | null): string {
  if (!rect || typeof window === "undefined") return "50% 100%";
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  return `${cx}px ${cy}px`;
}

export function ScheduleDayEditor({
  open,
  onOpenChange,
  dateLabel,
  dateKey,
  overview,
  defaultWorkMinutes,
  defaultSlotCount,
  initialWorkMinutes,
  initialAvailableHours,
  defaultAvailableHours,
  originRect,
  onApply,
  onResetToDefault,
  onBlockToggle,
  blockingDateKey,
}: ScheduleDayEditorProps) {
  const [workMinutes, setWorkMinutes] = useState(initialWorkMinutes);
  const [availableHours, setAvailableHours] = useState(initialAvailableHours);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const dragControls = useDragControls();
  const [isSheetLayout, setIsSheetLayout] = useState(true);
  useEffect(() => {
    const media = window.matchMedia("(min-width: 768px)");
    const sync = () => setIsSheetLayout(!media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!open) return;
    setWorkMinutes(initialWorkMinutes);
    setAvailableHours(initialAvailableHours);
    setAdvancedOpen(false);
  }, [open, initialWorkMinutes, initialAvailableHours, dateKey]);

  const isDirty = useMemo(() => {
    if (workMinutes !== initialWorkMinutes) return true;
    return (
      JSON.stringify(availableHours) !== JSON.stringify(initialAvailableHours)
    );
  }, [
    workMinutes,
    availableHours,
    initialWorkMinutes,
    initialAvailableHours,
  ]);

  const blockBusy = Boolean(dateKey && blockingDateKey === dateKey);
  const acceptingOrders = overview ? !overview.isBlocked : true;
  const origin = transformOriginFromRect(originRect);

  const handleBlockSwitch = (checked: boolean) => {
    if (!dateKey || blockBusy) return;
    void onBlockToggle(dateKey, checked ? "unblock" : "block");
  };

  const handleApply = () => {
    onApply({ workMinutes, availableHours });
    onOpenChange(false);
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence mode="wait">
        {open ? (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild forceMount>
              <motion.div
                className="fixed inset-0 z-50 bg-black/50"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              />
            </Dialog.Overlay>
            <Dialog.Content asChild forceMount>
              <motion.div
                role="dialog"
                aria-modal="true"
                className={cn(
                  "fixed z-50 flex flex-col border border-primary/15 bg-background/95 shadow-xl backdrop-blur-xl backdrop-saturate-150",
                  "outline-none focus:outline-none",
                  isSheetLayout
                    ? "inset-x-0 bottom-0 top-auto max-h-[min(92dvh,100%)] w-full rounded-t-2xl"
                    : "left-1/2 top-1/2 max-h-[min(85vh,40rem)] w-[min(100%-2rem,28rem)] rounded-2xl"
                )}
                style={{ transformOrigin: isSheetLayout ? origin : "50% 50%" }}
                initial={
                  isSheetLayout
                    ? { opacity: 0, scale: 0.88, y: 48 }
                    : { opacity: 0, scale: 0.9, x: "-50%", y: "-46%" }
                }
                animate={
                  isSheetLayout
                    ? { opacity: 1, scale: 1, y: 0, x: 0 }
                    : { opacity: 1, scale: 1, x: "-50%", y: "-50%" }
                }
                exit={
                  isSheetLayout
                    ? { opacity: 0, scale: 0.94, y: "100%" }
                    : { opacity: 0, scale: 0.94, x: "-50%", y: "-45%" }
                }
                transition={{
                  type: "spring",
                  damping: 30,
                  stiffness: 360,
                  mass: 0.85,
                }}
                drag={isSheetLayout ? "y" : false}
                dragControls={dragControls}
                dragListener={false}
                dragConstraints={{ top: 0, bottom: 0 }}
                dragElastic={{ top: 0.08, bottom: 0.45 }}
                onDragEnd={(_, info) => {
                  if (!isSheetLayout) return;
                  if (info.offset.y > 96 || info.velocity.y > 520) {
                    onOpenChange(false);
                  }
                }}
              >
                <div
                  className={cn(
                    "flex shrink-0 cursor-grab touch-none flex-col items-center pt-2 active:cursor-grabbing",
                    !isSheetLayout && "hidden"
                  )}
                  onPointerDown={(event) => dragControls.start(event)}
                >
                  <div
                    className="h-1 w-10 rounded-full bg-primary/30"
                    aria-hidden
                  />
                  <span className="sr-only">Drag down to close</span>
                </div>

                <header className="shrink-0 border-b border-primary/10 px-4 pb-3 pt-1 md:pt-4">
                  <div className="flex items-start gap-3 pr-8">
                    <div className="min-w-0 flex-1">
                      <Dialog.Title className="font-heading text-lg font-semibold text-primary md:text-xl">
                        {dateLabel}
                      </Dialog.Title>
                      {overview && (
                        <span
                          className={cn(
                            "mt-2 inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                            overview.isBlocked
                              ? "bg-error/15 text-error"
                              : overview.isWithinLeadTime
                                ? "bg-amber-500/15 text-amber-900"
                                : "bg-green-500/15 text-green-900"
                          )}
                        >
                          {statusLabel(overview)}
                        </span>
                      )}
                    </div>
                  </div>

                  {overview && (
                    <div className="mt-3 space-y-2">
                      <div className="h-2 overflow-hidden rounded-full bg-primary/10">
                        <div
                          className="h-full rounded-full bg-accent transition-[width]"
                          style={{ width: `${overview.utilization}%` }}
                        />
                      </div>
                      <p className="text-sm text-primary/80">
                        Booked {overview.booked ?? "—"} min · Available{" "}
                        {overview.available ?? "—"} min
                      </p>
                    </div>
                  )}

                  <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-primary/10 bg-background/40 px-3 py-2.5">
                    <div>
                      <p className="text-sm font-medium text-primary">
                        Accept orders
                      </p>
                      <p className="text-xs text-primary/60">
                        {acceptingOrders
                          ? "Customers can book this day"
                          : "Day is blocked from checkout"}
                      </p>
                    </div>
                    <Switch
                      checked={acceptingOrders}
                      disabled={!dateKey || blockBusy}
                      onCheckedChange={handleBlockSwitch}
                      aria-label={
                        acceptingOrders ? "Block this date" : "Unblock this date"
                      }
                    />
                  </div>
                </header>

                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3">
                  <button
                    type="button"
                    onClick={() => setAdvancedOpen((value) => !value)}
                    className="flex w-full items-center justify-between rounded-xl border border-primary/10 bg-background/30 px-3 py-2.5 text-left transition-colors hover:bg-background/50"
                    aria-expanded={advancedOpen}
                  >
                    <span>
                      <span className="block text-sm font-semibold text-primary">
                        Capacity & pickup slots
                      </span>
                      <span className="text-xs text-primary/60">
                        Override minutes or time slots for this day only
                      </span>
                    </span>
                    <ChevronDown
                      className={cn(
                        "h-5 w-5 shrink-0 text-primary/60 transition-transform",
                        advancedOpen && "rotate-180"
                      )}
                    />
                  </button>

                  {advancedOpen && (
                    <div className="mt-3 space-y-4 rounded-xl border border-primary/10 bg-background/20 p-3">
                      <div>
                        <label
                          htmlFor="schedule-day-work-minutes"
                          className="mb-1.5 block text-sm font-medium text-primary"
                        >
                          Work minutes
                        </label>
                        <p className="mb-2 text-xs text-primary/60">
                          Default for the bakery: {defaultWorkMinutes} min
                        </p>
                        <Input
                          id="schedule-day-work-minutes"
                          type="number"
                          value={workMinutes}
                          onChange={(event) =>
                            setWorkMinutes(event.target.value)
                          }
                          placeholder={`${defaultWorkMinutes}`}
                        />
                      </div>
                      <div>
                        <p className="mb-1.5 text-sm font-medium text-primary">
                          Pickup time slots
                        </p>
                        <p className="mb-2 text-xs text-primary/60">
                          Default template: {defaultSlotCount} slot
                          {defaultSlotCount === 1 ? "" : "s"}
                        </p>
                        <TimeSlotManager
                          variant="schedule"
                          value={availableHours}
                          onChange={setAvailableHours}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <footer className="shrink-0 border-t border-primary/10 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                  <p className="mb-2 text-center text-xs text-primary/55">
                    Apply adds changes to the page draft. Use Save on the bar
                    below to publish.
                  </p>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button
                      type="button"
                      variant="primary"
                      className="w-full sm:flex-1"
                      disabled={!isDirty || !dateKey}
                      onClick={handleApply}
                    >
                      Apply to draft
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full border-primary/20 sm:flex-1"
                      disabled={!dateKey}
                      onClick={() => {
                        onResetToDefault();
                        setWorkMinutes("");
                        setAvailableHours(defaultAvailableHours);
                      }}
                    >
                      Reset to default
                    </Button>
                  </div>
                </footer>

                <Dialog.Close asChild>
                  <button
                    type="button"
                    className="absolute right-3 top-3 rounded-full p-1.5 text-primary/60 transition-colors hover:bg-background/60 md:top-4"
                  >
                    <span className="sr-only">Close</span>
                    <X className="h-5 w-5" />
                  </button>
                </Dialog.Close>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        ) : null}
      </AnimatePresence>
    </Dialog.Root>
  );
}
